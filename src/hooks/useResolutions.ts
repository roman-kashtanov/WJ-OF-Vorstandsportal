import { useEffect, useState } from 'react';
import {
  ActiveTab,
  AuditLogEntry,
  BoardMember,
  BookkeepingStatus,
  EmailNotificationLog,
  NotificationSettings,
  NotificationType,
  Resolution,
  ResolutionAttachment,
  VoteType,
} from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';
import { calculateVoteStats } from '../utils/formatters';
import { sendResolutionVoteMails } from '../utils/emailService';
import { eligibleVoterIdsFor, getResolutionLockState } from '../utils/resolutionLock';

/**
 * Kapselt den Beschluesse-Bereich (Abstimmung, Archivieren, Kommentare,
 * Anhaenge, Erstellung), 1:1 aus App.tsx herausgeloest - reine
 * Verschiebung, keine Verhaltensaenderung. Sechster und letzter Schritt
 * der Monolith-Auflösung von App.tsx (siehe CLAUDE.md).
 *
 * Wird von Subsidies (Buendeln, Nachweis-Anhang) und Invoices
 * (linkedInvoiceIds) gebraucht, daher fruehzeitig aufgerufen - vor diesen
 * beiden Domains, aber nach Members/Notifications, deren Ausgaben hier
 * gebraucht werden.
 */

type SystemBanner = { type: 'success' | 'info' | 'error'; title: string; message: string } | null;

const VOTE_LABEL: Record<VoteType, string> = { yes: 'Ja', no: 'Nein', abstain: 'Enthaltung' };

interface UseResolutionsParams {
  members: BoardMember[];
  currentMember: BoardMember;
  notificationSettings: NotificationSettings;
  addInAppAndPushNotification: (notif: {
    title: string;
    message: string;
    type: NotificationType;
    targetTab?: ActiveTab;
    targetId?: string;
    recipientMemberIds?: string[];
  }) => void;
  handleAddEmailLog: (log: Omit<EmailNotificationLog, 'id' | 'sentAt'>) => void;
  addAuditLogEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  setSystemBanner: (banner: SystemBanner) => void;
  setActiveTab: (tab: ActiveTab) => void;
  selectedResolutionId: string | null;
  setSelectedResolutionId: (id: string | null) => void;
}

export function useResolutions({
  members,
  currentMember,
  notificationSettings,
  addInAppAndPushNotification,
  handleAddEmailLog,
  addAuditLogEntry,
  setSystemBanner,
  setActiveTab,
  selectedResolutionId,
  setSelectedResolutionId,
}: UseResolutionsParams) {
  const [resolutions, setResolutions] = useState<Resolution[]>(() => AppStorage.getResolutions());
  const [isNewResolutionOpen, setIsNewResolutionOpen] = useState(false);
  const [isEmailVoteModalOpen, setIsEmailVoteModalOpen] = useState(false);
  const [emailVoteResolution, setEmailVoteResolution] = useState<Resolution | null>(null);

  /**
   * Offene Rueckfrage vor einer Stimmabgabe: entweder das Aendern einer
   * bereits abgegebenen Stimme (`previous` gesetzt) oder eine erste Stimme mit
   * Nein/Enthaltung - Ja ist der Normalfall, alles andere wird bestaetigt.
   */
  const [pendingVoteChange, setPendingVoteChange] = useState<{
    resolutionId: string;
    voteType: VoteType;
    note?: string;
    previous?: VoteType;
  } | null>(null);

  useEffect(() => {
    AppStorage.saveResolutions(resolutions);
  }, [resolutions]);

  /**
   * Selbstheilung: Beschluesse, die wegen eines frueheren Fehlers in der
   * Mehrheits-/Quorum-Berechnung (Nenner `members.length` statt
   * `eligibleCount`, bzw. serverseitige E-Mail-Stimmen, die den Status nie
   * neu berechneten - siehe CLAUDE.md) eigentlich schon laengst entschieden
   * waren, aber auf "in_abstimmung" haengen blieben - normalerweise loest
   * NUR eine neue Stimme die Neuberechnung aus, ein bereits vollstaendig
   * abgestimmter Beschluss bekommt also nie mehr die Chance, sich selbst zu
   * korrigieren. Prueft deshalb bei jedem Laden alle offenen Beschluesse
   * einmal gegen die aktuelle, korrekte Formel nach.
   */
  useEffect(() => {
    setResolutions((prev) => {
      let changed = false;
      const next = prev.map((res) => {
        if (res.status !== 'in_abstimmung') return res;
        const stats = calculateVoteStats(res, members.length);
        let newStatus: Resolution['status'] | null = null;
        if (stats.isQuorumReached && stats.yesCount > stats.eligibleCount / 2) {
          newStatus = 'angenommen';
        } else if (stats.isQuorumReached && stats.noCount >= stats.eligibleCount / 2) {
          newStatus = 'abgelehnt';
        }
        if (!newStatus) return res;

        changed = true;
        const updated: Resolution = {
          ...res,
          status: newStatus,
          passedAt: newStatus === 'angenommen' ? res.passedAt || new Date().toISOString() : res.passedAt,
        };
        FirebaseSync.saveResolution(updated).catch(() => {});
        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: `Status nachträglich auf "${newStatus === 'angenommen' ? 'Angenommen' : 'Abgelehnt'}" korrigiert (war bereits entschieden)`,
          actorName: 'System',
        });
        if (newStatus === 'angenommen' && notificationSettings.notifyOnQuorumReached) {
          addInAppAndPushNotification({
            title: `🎉 Beschluss angenommen: ${res.number}`,
            message: `"${res.title}" hat mit ${stats.yesCount} Ja-Stimmen das Quorum erreicht und ist offiziell gültig.`,
            type: 'vote',
            targetTab: 'resolutions',
            targetId: res.id,
            recipientMemberIds: res.eligibleVoterIds,
          });
        }
        return updated;
      });
      return changed ? next : prev;
    });
  }, [resolutions, members, notificationSettings.notifyOnQuorumReached]);

  const isResolutionLocked = (res: Resolution) =>
    getResolutionLockState(res, eligibleVoterIdsFor(res, members)).isLocked;

  const reportLocked = (res: Resolution) => {
    setSystemBanner({
      type: 'error',
      title: `${res.number} ist festgeschrieben`,
      message:
        'Alle Stimmen wurden vor mehr als 24 Stunden abgegeben. Eine Änderung ist nur nach Aufhebung der Festschreibung mit dem Admin-Code möglich.',
    });
    setTimeout(() => setSystemBanner(null), 6000);
  };

  /** Gibt `false` zurueck, wenn die Stimme nicht verbucht wurde (festgeschrieben). */
  const handleVoteForMember = (
    resolutionId: string,
    member: BoardMember,
    voteType: VoteType,
    note?: string
  ): boolean => {
    const target = resolutions.find((r) => r.id === resolutionId);
    if (target && isResolutionLocked(target)) {
      reportLocked(target);
      return false;
    }

    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;

        const updatedVotes = {
          ...res.votes,
          [member.id]: {
            memberId: member.id,
            memberName: member.name,
            memberRole: member.role,
            vote: voteType,
            timestamp: new Date().toISOString(),
            note,
          },
        };

        // Recalculate status
        const tempRes = { ...res, votes: updatedVotes };
        const stats = calculateVoteStats(tempRes, members.length);
        let newStatus = res.status;
        let passedAt = res.passedAt;

        // Mehrheit bezieht sich auf die STIMMBERECHTIGTEN (eligibleCount),
        // nicht auf alle Mitglieder (members.length) - sonst zaehlen auch
        // nicht stimmberechtigte Festangestellte mit und ein Beschluss kann
        // trotz Ja-Mehrheit aller Stimmberechtigten nie "angenommen" werden.
        if (stats.isQuorumReached && stats.yesCount > stats.eligibleCount / 2) {
          newStatus = 'angenommen';
          if (!passedAt) passedAt = new Date().toISOString();

          // Trigger notification on quorum reached
          if (res.status !== 'angenommen' && notificationSettings.notifyOnQuorumReached) {
            addInAppAndPushNotification({
              title: `🎉 Beschluss angenommen: ${res.number}`,
              message: `"${res.title}" hat mit ${stats.yesCount} Ja-Stimmen das Quorum erreicht und ist offiziell gültig.`,
              type: 'vote',
              targetTab: 'resolutions',
              targetId: res.id,
              recipientMemberIds: res.eligibleVoterIds,
            });
          }
        } else if (stats.isQuorumReached && stats.noCount >= stats.eligibleCount / 2) {
          newStatus = 'abgelehnt';
        }

        const updatedRes: Resolution = {
          ...res,
          votes: updatedVotes,
          status: newStatus,
          passedAt,
        };

        // Sync updated resolution to Firebase Cloud
        FirebaseSync.saveResolution(updatedRes).catch(() => {});

        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: `${member.name} stimmte: ${VOTE_LABEL[voteType]}`,
          actorName: member.name,
          actorId: member.id,
        });
        if (newStatus !== res.status && (newStatus === 'angenommen' || newStatus === 'abgelehnt')) {
          addAuditLogEntry({
            entityType: 'resolution',
            entityId: res.id,
            entityLabel: res.number,
            action: `Status auf "${newStatus === 'angenommen' ? 'Angenommen' : 'Abgelehnt'}" gewechselt`,
            actorName: 'System',
          });
        }

        return updatedRes;
      })
    );
    return true;
  };

  /**
   * Stimmabgabe des angemeldeten Mitglieds.
   *
   * Zuerst nachgefragt wird, wenn bereits eine abweichende Stimme vorliegt
   * oder zum ersten Mal mit Nein/Enthaltung gestimmt wird: Die Knoepfe stehen
   * dicht beieinander, ein versehentlicher Tipp soll nicht unbemerkt zaehlen.
   * Ja ist der Normalfall und geht ohne Rueckfrage durch.
   */
  const handleVote = (resolutionId: string, voteType: VoteType, note?: string) => {
    const target = resolutions.find((r) => r.id === resolutionId);
    if (target && isResolutionLocked(target)) {
      reportLocked(target);
      return;
    }

    const existing = target?.votes[currentMember.id];

    if (existing && existing.vote !== voteType) {
      setPendingVoteChange({ resolutionId, voteType, note, previous: existing.vote });
      return;
    }

    if (!existing && voteType !== 'yes') {
      setPendingVoteChange({ resolutionId, voteType, note });
      return;
    }

    handleVoteForMember(resolutionId, currentMember, voteType, note);
  };

  /**
   * Hebt die Festschreibung auf (Admin-Code wird vorher in der Ansicht
   * geprueft). Danach laufen erneut 24 Stunden, gerechnet ab jetzt bzw. ab der
   * letzten Stimme - siehe utils/resolutionLock.ts.
   */
  const handleLiftResolutionLock = (resolutionId: string) => {
    const target = resolutions.find((r) => r.id === resolutionId);
    if (!target) return;

    const lockLiftedAt = new Date().toISOString();
    const lockLiftedBy = currentMember.name;
    setResolutions((prev) =>
      prev.map((r) => (r.id === resolutionId ? { ...r, lockLiftedAt, lockLiftedBy } : r))
    );
    FirebaseSync.saveResolution({ ...target, lockLiftedAt, lockLiftedBy }).catch(() => {});

    addAuditLogEntry({
      entityType: 'resolution',
      entityId: target.id,
      entityLabel: target.number,
      action: 'Festschreibung mit Admin-Code aufgehoben (Stimmen 24 Stunden wieder änderbar)',
      actorName: currentMember.name,
      actorId: currentMember.id,
    });

    setSystemBanner({
      type: 'success',
      title: 'Festschreibung aufgehoben',
      message: `${target.number}: Stimmen können 24 Stunden lang wieder geändert werden.`,
    });
    setTimeout(() => setSystemBanner(null), 5000);
  };

  const handleArchiveResolution = (resolutionId: string, archive: boolean) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updated: Resolution = {
          ...res,
          isArchived: archive,
          archivedAt: archive ? new Date().toISOString() : undefined,
          archivedBy: archive ? `${currentMember.name} (${currentMember.role})` : undefined,
        };
        FirebaseSync.saveResolution(updated).catch(() => {});
        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: archive ? 'Archiviert' : 'Aus dem Archiv geholt',
          actorName: currentMember.name,
          actorId: currentMember.id,
        });
        return updated;
      })
    );

    if (archive && selectedResolutionId === resolutionId) {
      setSelectedResolutionId(null);
    }

    setSystemBanner({
      type: 'success',
      title: archive ? 'Beschluss archiviert' : 'Beschluss wiederhergestellt',
      message: archive
        ? 'Er ist weiterhin über den Archiv-Filter auffindbar.'
        : 'Er erscheint wieder in der laufenden Liste.',
    });
    setTimeout(() => setSystemBanner(null), 4000);
  };

  // Nur archivierte, nur mit Admin-Code
  const handleDeleteResolution = (resolutionId: string) => {
    const target = resolutions.find((r) => r.id === resolutionId);
    setResolutions((prev) => prev.filter((r) => r.id !== resolutionId));
    FirebaseSync.deleteResolution(resolutionId).catch(() => {});
    if (selectedResolutionId === resolutionId) setSelectedResolutionId(null);

    setSystemBanner({
      type: 'success',
      title: 'Beschluss gelöscht',
      message: target
        ? `${target.number} wurde unwiderruflich entfernt.`
        : 'Der Beschluss wurde unwiderruflich entfernt.',
    });
    setTimeout(() => setSystemBanner(null), 5000);
  };

  const handleAddComment = (resolutionId: string, content: string) => {
    const newComment = {
      id: `comm_${Date.now()}`,
      authorId: currentMember.id,
      authorName: currentMember.name,
      authorRole: currentMember.role,
      content,
      timestamp: new Date().toISOString(),
    };

    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updatedRes = {
          ...res,
          comments: [...res.comments, newComment],
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: 'Kommentar hinzugefügt',
          actorName: currentMember.name,
          actorId: currentMember.id,
        });
        return updatedRes;
      })
    );
  };

  const handleAddAttachment = (resolutionId: string, attachment: ResolutionAttachment) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const currentAttachments = res.attachments || [];
        const updatedRes = {
          ...res,
          attachments: [...currentAttachments, attachment],
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: `Anhang hinzugefügt: ${attachment.name}`,
          actorName: currentMember.name,
          actorId: currentMember.id,
        });
        return updatedRes;
      })
    );
    setSystemBanner({
      type: 'success',
      title: 'Dokument angehängt',
      message: `"${attachment.name}" (${attachment.size}) wurde erfolgreich zum Beschluss hinzugefügt.`,
    });
  };

  const handleCreateResolution = (
    data: Omit<Resolution, 'id' | 'votes' | 'comments' | 'linkedInvoiceIds' | 'createdAt'>
  ) => {
    const newRes: Resolution = {
      ...data,
      id: `res_${Date.now()}`,
      createdAt: new Date().toISOString(),
      votes: {
        [currentMember.id]: {
          memberId: currentMember.id,
          memberName: currentMember.name,
          memberRole: currentMember.role,
          vote: 'yes',
          timestamp: new Date().toISOString(),
          note: 'Als Antragsteller automatisch mit Ja gestimmt.',
        },
      },
      comments: [],
      linkedInvoiceIds: [],
    };

    setResolutions((prev) => [newRes, ...prev]);
    FirebaseSync.saveResolution(newRes).catch(() => {});
    setSelectedResolutionId(newRes.id);
    setActiveTab('resolutions');

    addAuditLogEntry({
      entityType: 'resolution',
      entityId: newRes.id,
      entityLabel: newRes.number,
      action: 'Beschluss erstellt',
      actorName: currentMember.name,
      actorId: currentMember.id,
    });

    // Trigger in-app and push notification
    if (notificationSettings.notifyOnNewResolution) {
      addInAppAndPushNotification({
        title: `⚡ Neuer Umlaufbeschluss: ${newRes.number}`,
        message: `${newRes.title} – deine Stimme wird benötigt.`,
        type: 'resolution',
        targetTab: 'resolutions',
        targetId: newRes.id,
        // Nur die Stimmberechtigten dieses Beschlusses benachrichtigen
        recipientMemberIds: newRes.eligibleVoterIds,
      });
    }

    // E-Mail mit 1-Klick-Abstimmungslinks automatisch an alle Stimmberechtigten
    const voters = members.filter(
      (m) =>
        m.id !== currentMember.id &&
        !!m.email &&
        (!newRes.eligibleVoterIds ||
          newRes.eligibleVoterIds.length === 0 ||
          newRes.eligibleVoterIds.includes(m.id))
    );

    if (voters.length > 0) {
      sendResolutionVoteMails(newRes, voters)
        .then((result) => {
          voters.slice(0, result.sent).forEach((m) =>
            handleAddEmailLog({
              type: 'resolution_vote',
              recipientName: m.name,
              recipientEmail: m.email,
              subject: `[Umlaufbeschluss ${newRes.number}] ${newRes.title}`,
              status: 'zugestellt',
              resolutionId: newRes.id,
              details: 'Automatisch beim Anlegen des Beschlusses versendet',
            })
          );

          if (result.failed > 0) {
            setSystemBanner({
              type: 'error',
              title: `${result.sent} von ${voters.length} E-Mails versendet`,
              message: result.errors.join(' | '),
            });
          } else {
            setSystemBanner({
              type: 'success',
              title: 'Beschluss eingereicht',
              message: `${result.sent} Vorstandsmitglieder wurden per E-Mail zur Abstimmung eingeladen.`,
            });
            setTimeout(() => setSystemBanner(null), 5000);
          }
        })
        .catch(() => {});
    }

    return newRes;
  };

  const handleUpdateResolutionBookkeepingStatus = (resolutionId: string, status: BookkeepingStatus) => {
    setResolutions((prev) =>
      prev.map((res) => {
        if (res.id !== resolutionId) return res;
        const updatedRes: Resolution = {
          ...res,
          bookkeepingStatus: status,
        };
        FirebaseSync.saveResolution(updatedRes).catch(() => {});
        addAuditLogEntry({
          entityType: 'resolution',
          entityId: res.id,
          entityLabel: res.number,
          action: `Buchhaltungsstatus geändert`,
          actorName: currentMember.name,
          actorId: currentMember.id,
        });
        return updatedRes;
      })
    );
  };

  const handleOpenEmailVoteModal = (resolution: Resolution) => {
    setEmailVoteResolution(resolution);
    setIsEmailVoteModalOpen(true);
  };

  return {
    resolutions,
    setResolutions,
    isNewResolutionOpen,
    setIsNewResolutionOpen,
    isEmailVoteModalOpen,
    setIsEmailVoteModalOpen,
    emailVoteResolution,
    setEmailVoteResolution,
    pendingVoteChange,
    setPendingVoteChange,
    handleVoteForMember,
    handleVote,
    handleArchiveResolution,
    handleDeleteResolution,
    handleAddComment,
    handleAddAttachment,
    handleCreateResolution,
    handleUpdateResolutionBookkeepingStatus,
    handleOpenEmailVoteModal,
    handleLiftResolutionLock,
  };
}
