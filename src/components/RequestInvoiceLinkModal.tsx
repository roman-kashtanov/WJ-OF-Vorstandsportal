import React, { useEffect, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { BoardMember } from '../types';
import { requestInvoiceAttachmentLink } from '../utils/emailService';
import { X, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  resolutionId: string | null;
  resolutionLabel: string;
  members: BoardMember[];
}

/**
 * Verschickt den Beleg-Nachreichelink aus einem Beschluss heraus (Button
 * "Beleg-Link senden" in ResolutionsView.tsx). Empfaenger entweder aus den
 * Mitgliedern gewaehlt oder frei eingetragen - Nutzerwunsch aus dem
 * Verlauf ("oder man kann die email aus den vorhanden Nutzern auswählen").
 */
export const RequestInvoiceLinkModal: React.FC<Props> = ({
  isOpen,
  onClose,
  resolutionId,
  resolutionLabel,
  members,
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [useCustomEmail, setUseCustomEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMemberId('');
      setCustomEmail('');
      setCustomName('');
      setUseCustomEmail(false);
      setSending(false);
      setError(null);
      setDone(false);
    }
  }, [isOpen]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const recipientEmail = useCustomEmail ? customEmail.trim() : selectedMember?.email || '';
  const recipientName = useCustomEmail ? customName.trim() : selectedMember?.name || '';
  const canSend = !!resolutionId && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);

  const handleSend = async () => {
    if (!canSend || !resolutionId) return;
    setSending(true);
    setError(null);
    const result = await requestInvoiceAttachmentLink({
      resolutionId,
      recipientEmail,
      recipientName: recipientName || undefined,
    });
    setSending(false);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Beschluss
            </div>
            <h3 className="text-base font-bold">Beleg-Link senden</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          {done ? (
            <div className="text-center py-4 space-y-2">
              <p className="font-bold text-emerald-700">Link verschickt</p>
              <p className="text-slate-500">
                {recipientName || recipientEmail} kann darüber ohne Login eine Rechnung zu „
                {resolutionLabel}" nachreichen.
              </p>
            </div>
          ) : (
            <>
              <p className="text-slate-500">
                Zu Beschluss <strong className="text-slate-700">{resolutionLabel}</strong> - wer soll
                den Nachreichelink bekommen?
              </p>

              {!useCustomEmail ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mitglied auswählen</label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  >
                    <option value="">— Person wählen —</option>
                    {[...members]
                      .filter((m) => !!m.email)
                      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.email})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setUseCustomEmail(true)}
                    className="mt-1.5 text-[11px] font-bold text-[#003594] hover:underline cursor-pointer"
                  >
                    Andere E-Mail-Adresse eingeben
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">E-Mail-Adresse *</label>
                    <input
                      type="email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Name <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseCustomEmail(false)}
                    className="text-[11px] font-bold text-[#003594] hover:underline cursor-pointer"
                  >
                    Stattdessen aus Mitgliedern wählen
                  </button>
                </div>
              )}

              {error && (
                <div className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-semibold text-xs cursor-pointer"
          >
            {done ? 'Schließen' : 'Abbrechen'}
          </button>
          {!done && (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend || sending}
              className="px-4 py-2 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
              {sending ? 'Wird gesendet…' : 'Link senden'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
