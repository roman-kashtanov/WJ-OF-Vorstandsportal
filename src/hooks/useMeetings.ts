import { useEffect, useState } from 'react';
import { ActiveTab, BoardMember, Meeting, MeetingSeries } from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';
import { generateOccurrenceDates } from '../utils/recurrence';

/**
 * Kapselt den Sitzungen-Bereich (Termine, Teilnahme-Status, MS-Teams-Link),
 * 1:1 aus App.tsx herausgeloest - reine Verschiebung, keine
 * Verhaltensaenderung. Zweiter Schritt der Monolith-Auflösung von App.tsx
 * (siehe CLAUDE.md, nach useSubsidies.ts).
 */

type SystemBanner = { type: 'success' | 'info' | 'error'; title: string; message: string } | null;

interface UseMeetingsParams {
  members: BoardMember[];
  setSystemBanner: (banner: SystemBanner) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export function useMeetings({ members, setSystemBanner, setActiveTab }: UseMeetingsParams) {
  const [meetings, setMeetings] = useState<Meeting[]>(() => AppStorage.getMeetings());
  const [meetingSeries, setMeetingSeries] = useState<MeetingSeries[]>(() =>
    AppStorage.getMeetingSeries()
  );
  const [defaultTeamsUrl, setDefaultTeamsUrl] = useState<string>(() =>
    AppStorage.getDefaultTeamsUrl()
  );
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isTeamsSettingsOpen, setIsTeamsSettingsOpen] = useState(false);
  const [isQuickAgendaOpen, setIsQuickAgendaOpen] = useState(false);

  useEffect(() => {
    AppStorage.saveMeetings(meetings);
  }, [meetings]);

  useEffect(() => {
    AppStorage.saveMeetingSeriesList(meetingSeries);
  }, [meetingSeries]);

  const handleCreateMeeting = (data: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...data,
      id: `meet_${Date.now()}`,
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    FirebaseSync.saveMeeting(newMeeting).catch(() => {});
    setActiveTab('meetings');
  };

  /** Ein aus einer Serie generierter Termin, an dem noch niemand etwas
   *  eingetragen hat (keine Agenda, keine Anhänge, keine Teilnahme-Antworten)
   *  - nur solche Termine werden beim Ändern/Löschen einer Serie automatisch
   *  ersetzt/entfernt, bereits bearbeitete bleiben unangetastet. */
  const isUntouchedOccurrence = (m: Meeting): boolean =>
    m.agenda.length === 0 &&
    m.attendees.length === 0 &&
    !m.protocolFile &&
    !m.agendaFile &&
    !m.protocol;

  const buildOccurrenceMeetings = (series: MeetingSeries, dates: string[]): Meeting[] =>
    dates.map((date, i) => ({
      id: `meet_${series.id}_${i}_${Date.now()}`,
      title: series.title,
      type: series.type,
      date,
      startTime: series.startTime,
      endTime: series.endTime,
      location: series.location,
      teamsUrl: series.teamsUrl,
      description: series.description,
      agenda: [],
      attendees: [],
      isUpcoming: true,
      seriesId: series.id,
    }));

  /**
   * Legt eine wiederkehrende Termin-Serie an: generiert per
   * generateOccurrenceDates() konkrete, unabhängig editierbare
   * Meeting-Datensätze (seriesId gesetzt) - kein separates Ausnahme-
   * Tracking wie in Outlook, siehe handleUpdateMeetingSeries für die
   * "nur unbearbeitete Termine ersetzen"-Heuristik beim späteren Ändern.
   */
  const handleCreateMeetingSeries = (data: Omit<MeetingSeries, 'id' | 'createdAt'>) => {
    const newSeries: MeetingSeries = {
      ...data,
      id: `series_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setMeetingSeries((prev) => [newSeries, ...prev]);
    FirebaseSync.saveMeetingSeries(newSeries).catch(() => {});

    const dates = generateOccurrenceDates(newSeries.recurrence, newSeries.seriesStartDate);
    const newMeetings = buildOccurrenceMeetings(newSeries, dates);
    setMeetings((prev) => [...prev, ...newMeetings].sort((a, b) => a.date.localeCompare(b.date)));
    newMeetings.forEach((m) => FirebaseSync.saveMeeting(m).catch(() => {}));

    setActiveTab('meetings');
    setSystemBanner({
      type: 'success',
      title: 'Serie angelegt',
      message: `${newMeetings.length} Termine wurden erstellt.`,
    });
    setTimeout(() => setSystemBanner(null), 4000);

    return newSeries;
  };

  /**
   * Ändert eine Serie und ersetzt nur die noch unbearbeiteten,
   * zukünftigen Termine dieser Serie durch neu generierte - bereits
   * bearbeitete (Agenda/Anhänge/Teilnahme-Antworten vorhanden) und
   * vergangene Termine bleiben unverändert stehen.
   */
  const handleUpdateMeetingSeries = (
    seriesId: string,
    data: Omit<MeetingSeries, 'id' | 'createdAt'>
  ) => {
    const existing = meetingSeries.find((s) => s.id === seriesId);
    if (!existing) return;
    const updatedSeries: MeetingSeries = { ...existing, ...data };
    setMeetingSeries((prev) => prev.map((s) => (s.id === seriesId ? updatedSeries : s)));
    FirebaseSync.saveMeetingSeries(updatedSeries).catch(() => {});

    const today = new Date().toISOString().slice(0, 10);

    setMeetings((prev) => {
      const seriesFuture = prev.filter((m) => m.seriesId === seriesId && m.date >= today);
      const touched = seriesFuture.filter((m) => !isUntouchedOccurrence(m));
      const untouchedIds = new Set(
        seriesFuture.filter((m) => isUntouchedOccurrence(m)).map((m) => m.id)
      );
      const touchedDates = new Set(touched.map((m) => m.date));

      untouchedIds.forEach((id) => FirebaseSync.deleteMeeting(id).catch(() => {}));

      const remaining = prev.filter((m) => !untouchedIds.has(m.id));
      const dates = generateOccurrenceDates(
        updatedSeries.recurrence,
        updatedSeries.seriesStartDate
      ).filter((d) => d >= today && !touchedDates.has(d));
      const newMeetings = buildOccurrenceMeetings(updatedSeries, dates);
      newMeetings.forEach((m) => FirebaseSync.saveMeeting(m).catch(() => {}));

      setSystemBanner({
        type: touched.length > 0 ? 'info' : 'success',
        title: 'Serie aktualisiert',
        message:
          touched.length > 0
            ? `${untouchedIds.size} zukünftige, noch unbearbeitete Termine wurden neu erzeugt. ${touched.length} bereits bearbeitete Termine blieben unverändert.`
            : `${untouchedIds.size} zukünftige Termine wurden neu erzeugt.`,
      });
      setTimeout(() => setSystemBanner(null), 6000);

      return [...remaining, ...newMeetings].sort((a, b) => a.date.localeCompare(b.date));
    });
  };

  /** Löscht die Serie sowie ihre noch unbearbeiteten, zukünftigen Termine. */
  const handleDeleteMeetingSeries = (seriesId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setMeetingSeries((prev) => prev.filter((s) => s.id !== seriesId));
    FirebaseSync.deleteMeetingSeries(seriesId).catch(() => {});

    setMeetings((prev) => {
      const toRemove = prev.filter(
        (m) => m.seriesId === seriesId && m.date >= today && isUntouchedOccurrence(m)
      );
      toRemove.forEach((m) => FirebaseSync.deleteMeeting(m.id).catch(() => {}));
      const removedIds = new Set(toRemove.map((m) => m.id));
      return prev.filter((m) => !removedIds.has(m.id));
    });
  };

  const handleUpdateAttendeeStatus = (
    meetingId: string,
    memberId: string,
    status: 'accepted' | 'declined' | 'tentative'
  ) => {
    setMeetings((prev) => {
      const updatedList = prev.map((m) => {
        if (m.id !== meetingId) return m;
        const exists = m.attendees.some((a) => a.memberId === memberId);
        const updatedAttendees = exists
          ? m.attendees.map((a) =>
              a.memberId === memberId
                ? { ...a, status, updatedAt: new Date().toISOString() }
                : a
            )
          : [
              ...m.attendees,
              {
                memberId,
                memberName: members.find((x) => x.id === memberId)?.name || 'Vorstand',
                status,
                updatedAt: new Date().toISOString(),
              },
            ];
        const updatedMeeting = { ...m, attendees: updatedAttendees };
        FirebaseSync.saveMeeting(updatedMeeting).catch(() => {});
        return updatedMeeting;
      });
      return updatedList;
    });
  };

  const handleUpdateMeetingTeamsLink = (meetingId: string, newUrl: string) => {
    setMeetings((prev) =>
      prev.map((m) => {
        if (m.id === meetingId) {
          const updatedMeeting = { ...m, teamsUrl: newUrl };
          FirebaseSync.saveMeeting(updatedMeeting).catch(() => {});
          return updatedMeeting;
        }
        return m;
      })
    );
  };

  const handleSaveDefaultTeamsUrl = async (url: string, applyToAllMeetings: boolean) => {
    setDefaultTeamsUrl(url);
    AppStorage.saveDefaultTeamsUrl(url);
    await FirebaseSync.saveMeetingSettings({ defaultTeamsUrl: url });

    if (applyToAllMeetings) {
      setMeetings((prev) => {
        const updated = prev.map((m) => (m.isUpcoming ? { ...m, teamsUrl: url } : m));
        AppStorage.saveMeetings(updated);
        for (const m of updated) {
          if (m.isUpcoming) {
            FirebaseSync.saveMeeting(m).catch(() => {});
          }
        }
        return updated;
      });
    }

    setSystemBanner({
      type: 'success',
      title: 'MS Teams Link aktualisiert',
      message: 'Der Besprechungslink wurde erfolgreich gespeichert und synchronisiert.',
    });
    setTimeout(() => setSystemBanner(null), 4000);
  };

  return {
    meetings,
    setMeetings,
    meetingSeries,
    setMeetingSeries,
    defaultTeamsUrl,
    setDefaultTeamsUrl,
    isNewMeetingOpen,
    setIsNewMeetingOpen,
    isTeamsSettingsOpen,
    setIsTeamsSettingsOpen,
    isQuickAgendaOpen,
    setIsQuickAgendaOpen,
    handleCreateMeeting,
    handleUpdateAttendeeStatus,
    handleUpdateMeetingTeamsLink,
    handleSaveDefaultTeamsUrl,
    handleCreateMeetingSeries,
    handleUpdateMeetingSeries,
    handleDeleteMeetingSeries,
  };
}
