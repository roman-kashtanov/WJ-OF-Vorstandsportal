import React from 'react';
import { AuditLogEntry } from '../types';
import { formatDateTime } from '../utils/formatters';
import { History } from 'lucide-react';

interface Props {
  entries: AuditLogEntry[];
  /** Reduziert das Standard-Padding fürs Einbetten in schon dichte Ansichten (z. B. Zuschuss-Zeile). */
  compact?: boolean;
}

/**
 * Reine Anzeige-Komponente für die Revisionshistorie eines einzelnen
 * Beschlusses/einer Rechnung/eines Zuschusses - der Aufrufer filtert
 * `entries` bereits auf die passende `entityId` (siehe AuditLogEntry,
 * types.ts). Kein eigener State, keine Datenhaltung hier.
 */
export const RevisionHistory: React.FC<Props> = ({ entries, compact }) => {
  if (entries.length === 0) {
    return (
      <p className={`text-slate-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        Noch keine Änderungen protokolliert.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        <div
          key={e.id}
          className={`flex items-start gap-2 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-600`}
        >
          <History
            className={`shrink-0 mt-0.5 text-slate-300 ${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'}`}
            strokeWidth={1.75}
          />
          <div className="min-w-0">
            <span className="font-semibold text-slate-800">{e.actorName}</span>
            <span className="text-slate-500">: {e.action}</span>
            <span className="text-slate-400"> · {formatDateTime(e.timestamp)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};
