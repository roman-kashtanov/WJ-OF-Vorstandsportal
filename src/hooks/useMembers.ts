import { useEffect, useState } from 'react';
import { AuthSession, BoardMember, SecuritySettings } from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';
import { Biometric } from '../utils/biometric';

/**
 * Kapselt Vorstandsmitglieder, Anmeldung/Google-Login-Freigabeliste,
 * Geraete-Sperre (Face-ID/Biometrie) und Sicherheitseinstellungen, 1:1 aus
 * App.tsx herausgeloest - reine Verschiebung, keine Verhaltensaenderung.
 * Vierter Schritt der Monolith-Auflösung von App.tsx (siehe CLAUDE.md).
 *
 * Braucht keine externen Abhaengigkeiten (keine anderen Domains werden
 * gelesen) - wird deshalb als eine der ersten Hooks in App.tsx aufgerufen,
 * weil praktisch jede andere Domain "currentMember" braucht.
 */

export function useMembers() {
  const [members, setMembers] = useState<BoardMember[]>(() => AppStorage.getMembers());
  const [currentMemberId, setCurrentMemberId] = useState<string>(() =>
    AppStorage.getCurrentMemberId()
  );
  const [authSession, setAuthSession] = useState<AuthSession | null>(() =>
    AppStorage.getAuthSession()
  );
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const existing = AppStorage.getAuthSession();
    return !existing || !existing.isAuthenticated || !existing.isCodeVerified;
  });

  // Face-ID-Sperre: Die Anmeldung bleibt bestehen, aber solange dieses Geraet
  // biometrisch geschuetzt ist, muss beim Oeffnen entsperrt werden.
  // sessionStorage = pro geoeffneter App-Sitzung genau einmal.
  const [isDeviceLocked, setIsDeviceLocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const session = AppStorage.getAuthSession();
    if (!session?.isAuthenticated) return false;
    if (!Biometric.isEnabled()) return false;
    return sessionStorage.getItem('wjof_unlocked') !== '1';
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() =>
    AppStorage.getSecuritySettings()
  );

  useEffect(() => {
    AppStorage.saveMembers(members);
  }, [members]);

  useEffect(() => {
    AppStorage.saveCurrentMemberId(currentMemberId);
  }, [currentMemberId]);

  useEffect(() => {
    AppStorage.saveAuthSession(authSession);
  }, [authSession]);

  useEffect(() => {
    AppStorage.saveSecuritySettings(securitySettings);
  }, [securitySettings]);

  // Platzhalter, damit die App auch vor der ersten Anmeldung rendern kann
  // (die Vorstandsliste ist bei einer frischen Installation leer).
  const currentMember: BoardMember =
    authSession?.user ||
    members.find((m) => m.id === currentMemberId) ||
    members[0] || {
      id: 'mem_unbekannt',
      name: 'Nicht angemeldet',
      role: 'Kreissprecher / Vorsitzender',
      email: '',
      initials: '–',
      avatarColor: 'bg-slate-400',
    };

  const handleAuthSuccess = (session: AuthSession) => {
    setAuthSession(session);
    setIsAuthModalOpen(false);
    if (!session.user) return;

    const user = session.user;
    const isNew = !members.some(
      (m) => m.id === user.id || (m.email || '').toLowerCase() === (user.email || '').toLowerCase()
    );

    if (isNew) {
      setMembers((prev) => [...prev, user]);
      // Das eigene Profil muss auch in der Cloud landen, sonst sieht kein
      // anderes Geraet das Mitglied - und die eigene Freigabe fehlt.
      FirebaseSync.saveMember(user).catch(() => {});
      FirebaseSync.addToAllowlist(user.email).catch(() => {});
    }

    setCurrentMemberId(user.id);
  };

  const handleLogout = () => {
    setAuthSession(null);
    AppStorage.saveAuthSession(null);
    sessionStorage.removeItem('wjof_unlocked');
    setIsDeviceLocked(false);
    setIsAuthModalOpen(true);
  };

  const handleSelectMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (member) {
      const isExempt = AppStorage.isExemptFromCode(member, securitySettings);
      setCurrentMemberId(memberId);
      setAuthSession({
        isAuthenticated: true,
        isCodeVerified: isExempt || (authSession?.isCodeVerified ?? true),
        user: member,
      });
    }
  };

  const handleUpdateMembers = (newMembers: BoardMember[]) => {
    setMembers(newMembers);
    FirebaseSync.syncAllMembers(newMembers).catch(() => {});
  };

  const handleUpdateSecuritySettings = (newSettings: SecuritySettings) => {
    setSecuritySettings(newSettings);
    FirebaseSync.saveSecuritySettings(newSettings).catch(() => {});
  };

  return {
    members,
    setMembers,
    currentMemberId,
    setCurrentMemberId,
    authSession,
    setAuthSession,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isDeviceLocked,
    setIsDeviceLocked,
    securitySettings,
    setSecuritySettings,
    currentMember,
    handleAuthSuccess,
    handleLogout,
    handleSelectMember,
    handleUpdateMembers,
    handleUpdateSecuritySettings,
  };
}
