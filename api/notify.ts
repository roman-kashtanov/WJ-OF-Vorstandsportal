import crypto from 'crypto';
import { FirestoreAdmin } from './firestoreAdmin';

/**
 * Gemeinsame Schreibstelle fuer die zwei "Spur"-Collections bei
 * oeffentlichen/externen Vorgaengen (Zuschuss-Antrag, Nachweis-Upload,
 * Beleg-Nachreichung per Link, E-Mail-Stimmabgabe) - siehe
 * useAuditLog.ts/useNotifications.ts fuer die clientseitige Gegenseite.
 * Bewusst zwei getrennte, aber inhaltlich verwandte Schreibvorgaenge:
 * die Benachrichtigung ist ein fluechtiger Hinweis (kann als gelesen
 * markiert/geloescht werden), die Revisionshistorie bleibt dauerhaft.
 */

function newId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

export async function writeNotification(input: {
  title: string;
  message: string;
  type: 'resolution' | 'vote' | 'invoice' | 'meeting' | 'system' | 'subsidy';
  targetTab?: string;
  targetId?: string;
}): Promise<void> {
  const id = newId('ntf');
  await FirestoreAdmin.patchDocument(`notifications/${id}`, {
    id,
    title: input.title,
    message: input.message,
    type: input.type,
    timestamp: new Date().toISOString(),
    isRead: false,
    targetTab: input.targetTab,
    targetId: input.targetId,
  }).catch(() => {});
}

export async function writeAuditLogEntry(input: {
  entityType: 'resolution' | 'invoice' | 'subsidy';
  entityId: string;
  entityLabel: string;
  action: string;
  actorName: string;
}): Promise<void> {
  const id = newId('audit');
  await FirestoreAdmin.patchDocument(`auditLog/${id}`, {
    id,
    entityType: input.entityType,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    action: input.action,
    actorName: input.actorName,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}
