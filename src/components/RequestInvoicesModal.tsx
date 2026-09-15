import React, { useEffect, useMemo, useState } from 'react';
import { BoardMember } from '../types';
import { InvoiceRequestTemplate, DEFAULT_INVOICE_REQUEST_EMAIL } from '../data/invoiceRequestTemplates';
import { fillInvoiceRequestText } from '../utils/invoiceRequestText';
import { sendInvoiceRequest } from '../utils/accountService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Collapse } from './Collapse';
import { InvoiceRequestTemplateManager } from './InvoiceRequestTemplateManager';
import { X, Mail, FileText, ChevronDown, CheckCircle2, Save, Check, Plus, ArrowLeft } from 'lucide-react';

/**
 * "Belege anfragen" (v3.30.0): E-Mail mit frei anpassbarem Text und dem
 * allgemeinen Beleg-Link als Knopf (api/invoice.ts handleSendInvoiceRequest).
 *
 * Startet direkt mit dem Standardtext. Vorlagen holt "Vorlage waehlen"
 * (dort auch neue anlegen, bearbeiten, loeschen); unten laesst sich jede
 * E-Mail - auch eine selbst geschriebene - als Vorlage speichern.
 * Empfaenger: Vorstandsmitglieder antippen und/oder beliebige Adressen
 * eintragen; jede Person bekommt eine eigene Mail mit ihrem Namen.
 *
 * Ein Fenster mit Schritten statt uebereinanderliegender Fenster. Das
 * Fenster ist in App.tsx dauerhaft eingebunden - der Entwurf wird deshalb
 * bei jedem Oeffnen per Effekt zurueckgesetzt.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMember: BoardMember;
  members: BoardMember[];
  templates: InvoiceRequestTemplate[];
  onSaveTemplates: (templates: InvoiceRequestTemplate[]) => void;
}

type Step = 'compose' | 'templates' | 'sent';
type Recipient = { name: string; email: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 25;

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]';

export const RequestInvoicesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMember,
  members,
  templates,
  onSaveTemplates,
}) => {
  const [step, setStep] = useState<Step>('compose');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [extras, setExtras] = useState<Recipient[]>([]);
  const [extraName, setExtraName] = useState('');
  const [extraEmail, setExtraEmail] = useState('');
  const [extraError, setExtraError] = useState('');
  const [subject, setSubject] = useState(DEFAULT_INVOICE_REQUEST_EMAIL.subject);
  const [message, setMessage] = useState(DEFAULT_INVOICE_REQUEST_EMAIL.message);
  const [showPreview, setShowPreview] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ sent: number; failed: string[] } | null>(null);

  const resetDraft = () => {
    setTemplateId(null);
    setSelectedMemberIds([]);
    setExtras([]);
    setExtraName('');
    setExtraEmail('');
    setExtraError('');
    setSubject(DEFAULT_INVOICE_REQUEST_EMAIL.subject);
    setMessage(DEFAULT_INVOICE_REQUEST_EMAIL.message);
    setShowPreview(false);
    setNewTemplateName(null);
    setTemplateNotice('');
    setError('');
    setResult(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    setStep('compose');
    setSending(false);
    resetDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  /** Vorstandsmitglieder mit E-Mail-Adresse */
  const board = useMemo(
    () =>
      members
        .filter((m) => EMAIL_PATTERN.test((m.email || '').trim()))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [members]
  );

  const recipients = useMemo(() => {
    const seen = new Set<string>();
    const list: Recipient[] = [];
    const add = (r: Recipient) => {
      const key = r.email.trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      list.push({ name: r.name.trim(), email: r.email.trim() });
    };
    board.filter((m) => selectedMemberIds.includes(m.id)).forEach((m) => add({ name: m.name, email: m.email }));
    extras.forEach(add);
    return list;
  }, [board, selectedMemberIds, extras]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const currentTemplate = templateId ? templates.find((t) => t.id === templateId) : undefined;
  const base = currentTemplate || DEFAULT_INVOICE_REQUEST_EMAIL;
  const isEdited = subject.trim() !== base.subject.trim() || message.trim() !== base.message.trim();
  const canSend =
    recipients.length > 0 &&
    recipients.length <= MAX_RECIPIENTS &&
    !!subject.trim() &&
    !!message.trim() &&
    !sending;
  const previewValues = { name: recipients[0]?.name || '', sender: currentMember.name };

  const toggleMember = (id: string) =>
    setSelectedMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const addExtra = () => {
    const email = extraEmail.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setExtraError('Bitte eine gültige E-Mail-Adresse eintragen.');
      return;
    }
    if (recipients.some((r) => r.email.toLowerCase() === email.toLowerCase())) {
      setExtraError('Diese Adresse ist schon dabei.');
      return;
    }
    setExtras((prev) => [...prev, { name: extraName.trim(), email }]);
    setExtraName('');
    setExtraEmail('');
    setExtraError('');
  };

  const applyTemplate = (t: InvoiceRequestTemplate) => {
    if (isEdited && !confirm('Betreff und Text werden durch die Vorlage ersetzt. Fortfahren?')) return;
    setTemplateId(t.id);
    setSubject(t.subject);
    setMessage(t.message);
    setNewTemplateName(null);
    setTemplateNotice('');
    setStep('compose');
  };

  const flashNotice = (text: string) => {
    setTemplateNotice(text);
    window.setTimeout(() => setTemplateNotice((prev) => (prev === text ? '' : prev)), 2500);
  };

  const updateTemplate = () => {
    if (!currentTemplate) return;
    onSaveTemplates(
      templates.map((t) => (t.id === currentTemplate.id ? { ...t, subject: subject.trim(), message } : t))
    );
    flashNotice(`Vorlage „${currentTemplate.name}" aktualisiert`);
  };

  const saveAsNewTemplate = () => {
    const name = (newTemplateName || '').trim();
    if (!name || !subject.trim() || !message.trim()) return;
    const template: InvoiceRequestTemplate = { id: `tpl_${Date.now()}`, name, subject: subject.trim(), message };
    onSaveTemplates([...templates, template]);
    setTemplateId(template.id);
    setNewTemplateName(null);
    flashNotice(`Als Vorlage „${name}" gespeichert`);
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const outcome = await sendInvoiceRequest({
      recipients,
      senderName: currentMember.name,
      subject: subject.trim(),
      message,
    });
    setSending(false);
    if (outcome.ok === false) {
      setError(outcome.error);
      return;
    }
    setResult({ sent: outcome.sent, failed: outcome.failed });
    setStep('sent');
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
      active
        ? 'bg-[#003594] border-[#003594] text-white'
        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col wj-overlay-panel animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Belege anfragen</div>
            <h3 className="text-base font-bold">
              {step === 'templates' ? 'Vorlage wählen' : step === 'sent' ? 'Gesendet' : 'E-Mail verfassen'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div key={step} className="overflow-y-auto overscroll-contain p-4 sm:p-5 text-xs wj-expand">
          {step === 'compose' && (
            <div className="space-y-3">
              {/* Empfaenger */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <div className="font-bold text-slate-900">Empfänger *</div>
                  {recipients.length > 0 && (
                    <div className="text-[11px] text-slate-500">
                      {recipients.length} {recipients.length === 1 ? 'Empfänger' : 'Empfänger'} · jede Person
                      bekommt eine eigene E-Mail
                    </div>
                  )}
                </div>

                {board.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-semibold text-slate-500">Vorstand</div>
                    <div className="flex flex-wrap gap-1.5">
                      {board.map((m) => {
                        const active = selectedMemberIds.includes(m.id);
                        return (
                          <button key={m.id} type="button" onClick={() => toggleMember(m.id)} className={chip(active)}>
                            {active && <Check className="w-3 h-3" strokeWidth={2.5} />}
                            {m.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-slate-500">Weitere E-Mail-Adresse</div>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.3fr_auto] gap-1.5">
                    <input
                      value={extraName}
                      onChange={(e) => setExtraName(e.target.value)}
                      placeholder="Name (optional)"
                      className={`${inputClass} bg-white`}
                    />
                    <input
                      type="email"
                      value={extraEmail}
                      onChange={(e) => {
                        setExtraEmail(e.target.value);
                        setExtraError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addExtra();
                        }
                      }}
                      placeholder="E-Mail-Adresse"
                      className={`${inputClass} bg-white`}
                    />
                    <button
                      type="button"
                      onClick={addExtra}
                      disabled={!extraEmail.trim()}
                      className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[#003594] font-bold flex items-center justify-center gap-1 disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                      Hinzufügen
                    </button>
                  </div>
                  {extraError && <div className="text-[11px] font-semibold text-rose-700">{extraError}</div>}
                  {extras.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {extras.map((r) => (
                        <span
                          key={r.email}
                          className="pl-2.5 pr-1 py-1 rounded-lg bg-blue-50 border border-blue-100 text-[11px] font-semibold text-[#003594] inline-flex items-center gap-1"
                        >
                          {r.name ? `${r.name} · ${r.email}` : r.email}
                          <button
                            type="button"
                            onClick={() => setExtras((prev) => prev.filter((x) => x.email !== r.email))}
                            className="p-0.5 rounded hover:bg-blue-100 cursor-pointer"
                            title="Entfernen"
                          >
                            <X className="w-3 h-3" strokeWidth={2} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* E-Mail */}
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 text-[11px] text-slate-500 truncate">
                  {currentTemplate ? (
                    <>
                      Vorlage: <span className="font-bold text-slate-700">{currentTemplate.name}</span>
                    </>
                  ) : (
                    'Standardtext'
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep('templates')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Vorlage wählen
                </button>
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Betreff *</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
              </div>

              <div>
                <label className="block font-bold text-slate-900 mb-1">Text *</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={11}
                  className={`${inputClass} leading-relaxed resize-y`}
                />
                <p className="mt-1 text-[11px] text-slate-400 leading-relaxed">
                  {'{Name}'} wird durch den Namen des Empfängers ersetzt, {'{Absender}'} durch deinen Namen.
                  Der Link zum Hochladen kommt automatisch als Knopf unter den Text.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowPreview((v) => !v)}
                  className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${showPreview ? 'rotate-180' : ''}`}
                  />
                  Vorschau {showPreview ? 'ausblenden' : 'anzeigen'}
                </button>
                <Collapse open={showPreview}>
                  <div className="mt-2 p-3 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="font-bold text-slate-900">
                      {fillInvoiceRequestText(subject, previewValues) || '–'}
                    </div>
                    <div className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                      {fillInvoiceRequestText(message, previewValues)}
                    </div>
                    <div>
                      <span className="inline-block px-4 py-2 rounded-lg bg-[#003594] text-white font-bold">
                        Beleg hochladen
                      </span>
                    </div>
                  </div>
                </Collapse>
              </div>

              {/* Als Vorlage speichern - auch selbst geschriebene E-Mails */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {newTemplateName === null ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <button
                      type="button"
                      onClick={() => setNewTemplateName(currentTemplate && isEdited ? `${currentTemplate.name} (neu)` : '')}
                      className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
                      E-Mail als Vorlage speichern
                    </button>
                    {currentTemplate && isEdited && (
                      <button
                        type="button"
                        onClick={updateTemplate}
                        className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Vorlage „{currentTemplate.name}" aktualisieren
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveAsNewTemplate()}
                      placeholder="Name der Vorlage"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={saveAsNewTemplate}
                      disabled={!newTemplateName.trim()}
                      className="px-3 py-2 rounded-xl bg-[#003594] text-white font-bold disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      Speichern
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTemplateName(null)}
                      className="px-2 py-2 rounded-xl text-slate-500 hover:bg-slate-50 cursor-pointer shrink-0"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
                {templateNotice && <div className="text-[11px] font-semibold text-emerald-700">{templateNotice}</div>}
              </div>

              {recipients.length > MAX_RECIPIENTS && (
                <div className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                  Höchstens {MAX_RECIPIENTS} Empfänger je Versand.
                </div>
              )}
              {error && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'templates' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setStep('compose')}
                className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
                Zurück zur E-Mail
              </button>
              <p className="text-slate-500">Tippe auf eine Vorlage, um sie in die E-Mail zu übernehmen.</p>
              <InvoiceRequestTemplateManager templates={templates} onSave={onSaveTemplates} onApply={applyTemplate} />
            </div>
          )}

          {step === 'sent' && result && (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="font-bold text-slate-900 text-sm">
                {result.sent === 1 ? 'E-Mail gesendet' : `${result.sent} E-Mails gesendet`}
              </div>
              <p className="text-slate-500">
                Eingereichte Belege erscheinen unter Belege → Offen.
              </p>
              {result.failed.length > 0 && (
                <div className="text-left text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  Nicht zugestellt an: {result.failed.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between gap-2 shrink-0">
          {step === 'compose' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className="px-4 py-2 bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" strokeWidth={2} />
                {sending
                  ? 'Wird gesendet …'
                  : recipients.length > 1
                  ? `An ${recipients.length} Empfänger senden`
                  : 'E-Mail senden'}
              </button>
            </>
          )}
          {step === 'templates' && (
            <>
              <span />
              <button
                type="button"
                onClick={() => setStep('compose')}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Zurück zur E-Mail
              </button>
            </>
          )}
          {step === 'sent' && (
            <>
              <button
                type="button"
                onClick={() => {
                  resetDraft();
                  setStep('compose');
                }}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Weitere Anfrage
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Fertig
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
