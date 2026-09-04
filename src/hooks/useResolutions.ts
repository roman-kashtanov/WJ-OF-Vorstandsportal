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

  /** Offene Rueckfrage zum Aendern einer bereits abgegebenen Stimme. */
  const [pendingVoteChange, setPendingVoteChange] = useState<{
    resolutionId: string;
    voteType: VoteType;
    note?: string;
    previous: VoteType;
  } | null>(null);

  useEffect(() => {
    AppStorage.saveResolutions(resolutions);
  }, [resolutions]);

  const handleVoteForMember = (resolutionId: string, member: BoardMember, voteType: VoteType, note?: string) => {
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

        if (stats.isQuorumReached && stats.yesCount > members.length / 2) {
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
        } else if (stats.isQuorumReached && stats.noCount >= members.length / 2) {
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
  };

  /**
   * Stimmabgabe des angemeldeten Mitglieds.
   *
   * Liegt bereits eine abweichende Stimme vor, wird zuerst nachgefragt: Die
   * Abstimmungsknoepfe stehen in Listen dicht beieinander, ein versehentlicher
   * Tipp wuerde sonst unbemerkt eine bestehende Stimme ueberschreiben.
   */
  const handleVote = (resolutionId: string, voteType: VoteType, note?: string) => {
    const existing = resolutions.find((r) => r.id === resolutionId)?.votes[currentMember.id];

    if (existing && existing.vote !== voteType) {
      setPendingVoteChange({ resolutionId, voteType, note, previous: existing.vote });
      return;
    }

    handleVoteForMember(resolutionId, currentMember, voteType, note);
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
  };
}
