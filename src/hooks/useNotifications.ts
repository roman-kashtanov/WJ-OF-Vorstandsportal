import { useEffect, useState } from 'react';
import {
  ActiveTab,
  BoardMember,
  EmailNotificationLog,
  EmailServerConfig,
  InAppNotification,
  NotificationSettings,
  NotificationType,
} from '../types';
import { AppStorage } from '../utils/storage';
import { PwaNotificationService } from '../utils/pwaNotifications';
import { notifyAllDevices } from '../utils/webPushHelper';

/**
 * Kapselt In-App-/Push-Benachrichtigungen, das E-Mail-Protokoll sowie die
 * zugehoerigen Einstellungen (Benachrichtigungs- und E-Mail-Server-
 * Konfiguration), 1:1 aus App.tsx herausgeloest - reine Verschiebung, keine
 * Verhaltensaenderung. Dritter Schritt der Monolith-Auflösung von App.tsx
 * (siehe CLAUDE.md, nach useSubsidies.ts, useMeetings.ts).
 *
 * Wird von Resolutions/Invoices aufgerufen (addInAppAndPushNotification,
 * handleAddEmailLog) - daher bewusst frueh extrahiert, bevor diese
 * Domains selbst modularisiert werden.
 */

type SystemBanner = { type: 'success' | 'info' | 'error'; title: string; message: string } | null;

interface UseNotificationsParams {
  currentMember: BoardMember;
  setSystemBanner: (banner: SystemBanner) => void;
}

export function useNotifications({ currentMember, setSystemBanner }: UseNotificationsParams) {
  const [notifications, setNotifications] = useState<InAppNotification[]>(() =>
    AppStorage.getNotifications()
  );
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() =>
    AppStorage.getNotificationSettings()
  );
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>(() =>
    AppStorage.getEmailLogs()
  );
  const [emailServerConfig, setEmailServerConfig] = useState<EmailServerConfig>(() =>
    AppStorage.getEmailServerConfig()
  );

  useEffect(() => {
    AppStorage.saveNotifications(notifications);
  }, [notifications]);

  useEffect(() => {
    AppStorage.saveNotificationSettings(notificationSettings);
  }, [notificationSettings]);

  useEffect(() => {
    AppStorage.saveEmailLogs(emailLogs);
  }, [emailLogs]);

  useEffect(() => {
    AppStorage.saveEmailServerConfig(emailServerConfig);
  }, [emailServerConfig]);

  const addInAppAndPushNotification = (notif: {
    title: string;
    message: string;
    type: NotificationType;
    targetTab?: ActiveTab;
    targetId?: string;
    /**
     * Wenn gesetzt, erhalten nur diese Mitglieder eine Push-Nachricht.
     * Bei Beschluessen sind das die Stimmberechtigten - alle anderen sollen
     * nicht fuer etwas benachrichtigt werden, wozu sie nichts beitragen.
     */
    recipientMemberIds?: string[];
  }) => {
    const newEntry: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      isRead: false,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      targetTab: notif.targetTab,
      targetId: notif.targetId,
    };
    setNotifications((prev) => [newEntry, ...prev]);

    // Eigenes Geraet: Systemmeldung nur, wenn lokal gewuenscht
    if (notificationSettings.pushNotificationsEnabled) {
      PwaNotificationService.showPushNotification({
        title: notif.title,
        body: notif.message,
      });
    }

    // Alle anderen Geraete: echte Push-Nachricht ueber den Server.
    // Bewusst unabhaengig von den lokalen Einstellungen des Absenders -
    // sonst wuerde die eigene Einstellung die Benachrichtigung der anderen
    // Vorstandsmitglieder unterdruecken.
    notifyAllDevices(
      {
        title: notif.title,
        body: notif.message,
        url: '/',
      },
      currentMember.id,
      notif.recipientMemberIds
    ).catch(() => {});
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleClearReadNotifications = () => {
    setNotifications((prev) => prev.filter((n) => !n.isRead));
  };

  const handleSendTestNotification = () => {
    addInAppAndPushNotification({
      title: '⚡ Test-Umlaufbeschluss',
      message: `Hallo ${currentMember.name}, dies ist eine Test-Benachrichtigung für das WJ Vorstandsportal.`,
      type: 'resolution',
      targetTab: 'resolutions',
    });
    setSystemBanner({
      type: 'info',
      title: 'Test-Benachrichtigung ausgelöst!',
      message: 'Eine Benachrichtigung wurde in die Mitteilungszentrale und an dein Gerät übertragen.',
    });
  };

  const handleAddEmailLog = (log: Omit<EmailNotificationLog, 'id' | 'sentAt'>) => {
    const newEntry: EmailNotificationLog = {
      ...log,
      id: `elog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    setEmailLogs((prev) => [newEntry, ...prev]);
  };

  return {
    notifications,
    setNotifications,
    notificationSettings,
    setNotificationSettings,
    emailLogs,
    setEmailLogs,
    emailServerConfig,
    setEmailServerConfig,
    addInAppAndPushNotification,
    handleMarkAsRead,
    handleMarkAllAsRead,
    handleClearReadNotifications,
    handleSendTestNotification,
    handleAddEmailLog,
  };
}
