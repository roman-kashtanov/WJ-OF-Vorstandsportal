import { useEffect, useState } from 'react';
import { AuditLogEntry } from '../types';
import { AppStorage } from '../utils/storage';
import { FirebaseSync } from '../utils/firebaseSync';

/**
 * Revisionshistorie: kurze, lesbare Ereignisse ("Status auf 'Geprüft'
 * gesetzt", "Anna stimmte: Ja") je Beschluss/Rechnung/Zuschuss - siehe
 * AuditLogEntry (types.ts) und RevisionHistory.tsx fuer die Anzeige.
 *
 * Bewusst als eigener, kleiner Hook (wie useNotifications.ts) VOR
 * useResolutions/useInvoices/useSubsidies in App.tsx aufgerufen, damit
 * addAuditLogEntry als Parameter in alle drei hereingereicht werden kann -
 * exakt das bestehende Muster fuer addInAppAndPushNotification.
 */
export function useAuditLog() {
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => AppStorage.getAuditLog());

  useEffect(() => {
    AppStorage.saveAuditLog(auditLog);
  }, [auditLog]);

  const addAuditLogEntry = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setAuditLog((prev) => [newEntry, ...prev]);
    FirebaseSync.saveAuditLogEntry(newEntry).catch(() => {});
  };

  return {
    auditLog,
    setAuditLog,
    addAuditLogEntry,
  };
}
