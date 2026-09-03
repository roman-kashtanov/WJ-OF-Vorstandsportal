import { useEffect, useState } from 'react';
import { ActiveTab, BoardMember, Meeting } from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';

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
  const [defaultTeamsUrl, setDefaultTeamsUrl] = useState<string>(() =>
    AppStorage.getDefaultTeamsUrl()
  );
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isTeamsSettingsOpen, setIsTeamsSettingsOpen] = useState(false);
  const [isQuickAgendaOpen, setIsQuickAgendaOpen] = useState(false);

  useEffect(() => {
    AppStorage.saveMeetings(meetings);
  }, [meetings]);

  const handleCreateMeeting = (data: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...data,
      id: `meet_${Date.now()}`,
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    FirebaseSync.saveMeeting(newMeeting).catch(() => {});
    setActiveTab('meetings');
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
  };
}
