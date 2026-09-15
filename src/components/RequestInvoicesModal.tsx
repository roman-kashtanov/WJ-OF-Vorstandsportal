import React, { useEffect, useMemo, useState } from 'react';
import { BoardMember, SubsidyPerson } from '../types';
import { InvoiceRequestTemplate } from '../data/invoiceRequestTemplates';
import { fillInvoiceRequestText } from '../utils/invoiceRequestText';
import { sendInvoiceRequest } from '../utils/accountService';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Collapse } from './Collapse';
import {
  X,
  Mail,
  FileText,
  Trash2,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Save,
  PenLine
} from 'lucide-react';

/**
 * "Belege anfragen" (v3.28.0): E-Mail an eine Person mit frei anpassbarem
 * Text und dem allgemeinen Beleg-Link als Knopf (api/invoice.ts
 * handleSendInvoiceRequest). Ein Fenster mit drei Schritten statt
 * uebereinanderliegender Fenster:
 * 1. Vorlage waehlen (oder ohne Vorlage beginnen), Vorlagen loeschen
 * 2. Empfaenger, Betreff und Text anpassen, als Vorlage speichern
 * 3. Bestaetigung
 *
 * Vorlagen sind geteilt (settings/invoiceRequestTemplates). Das Fenster ist
 * in App.tsx dauerhaft eingebunden - der Entwurf wird deshalb bei jedem
 * Oeffnen per Effekt zurueckgesetzt, nicht per useState-Startwert.
 */

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentMember: BoardMember;
  members: BoardMember[];
  people: SubsidyPerson[];
  templates: InvoiceRequestTemplate[];
  onSaveTemplates: (templates: InvoiceRequestTemplate[]) => void;
}

type Step = 'choose' | 'compose' | 'sent';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BLANK = {
  subject: 'Bitte Beleg einreichen',
  message: 'Hallo {Name},\n\n\n\nViele Grüße\n{Absender}',
};

const inputClass =
  'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]';

const firstLine = (text: string) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !/^hallo\b/i.test(l))[0] || '';

export const RequestInvoicesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentMember,
  members,
  people,
  templates,
  onSaveTemplates,
}) => {
  const [step, setStep] = useState<Step>('choose');
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState<string | null>(null);
  const [templateNotice, setTemplateNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('choose');
    setTemplateId(null);
    setRecipientName('');
    setRecipientEmail('');
    setSubject('');
    setMessage('');
    setShowPreview(false);
    setNewTemplateName(null);
    setTemplateNotice('');
    setSending(false);
    setError('');
  }, [isOpen]);

  /** Auswahlliste: Vorstand und Personen aus den Zuschuessen, je Adresse einmal. */
  const contacts = useMemo(() => {
    const seen = new Set<string>();
    const pick = <T extends { name: string; email?: string }>(list: T[]) =>
      list
        .filter((p) => {
          const key = (p.email || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((p) => ({ name: p.name, email: (p.email || '').trim() }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de'));
    const board = pick(members);
    const others = pick(people);
    return { board, others };
  }, [members, people]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const currentTemplate = templateId ? templates.find((t) => t.id === templateId) : undefined;
  const values = { name: recipientName, sender: currentMember.name };
  const canSend =
    EMAIL_PATTERN.test(recipientEmail.trim()) && !!subject.trim() && !!message.trim() && !sending;

  const startWith = (template?: InvoiceRequestTemplate) => {
    setTemplateId(template?.id || null);
    setSubject(template?.subject || BLANK.subject);
    setMessage(template?.message || BLANK.message);
    setNewTemplateName(null);
    setTemplateNotice('');
    setError('');
    setStep('compose');
  };

  const deleteTemplate = (template: InvoiceRequestTemplate) => {
    if (!confirm(`Vorlage „${template.name}" löschen? Sie ist dann für den ganzen Vorstand weg.`)) return;
    onSaveTemplates(templates.filter((t) => t.id !== template.id));
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
    if (!name) return;
    const template: InvoiceRequestTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      subject: subject.trim(),
      message,
    };
    onSaveTemplates([...templates, template]);
    setTemplateId(template.id);
    setNewTemplateName(null);
    flashNotice(`Als Vorlage „${name}" gespeichert`);
  };

  const pickContact = (email: string) => {
    const contact = [...contacts.board, ...contacts.others].find((c) => c.email === email);
    if (!contact) return;
    setRecipientName(contact.name);
    setRecipientEmail(contact.email);
  };

  const send = async () => {
    if (!canSend) return;
    setSending(true);
    setError('');
    const result = await sendInvoiceRequest({
      recipientEmail: recipientEmail.trim(),
      recipientName: recipientName.trim(),
      senderName: currentMember.name,
      subject: subject.trim(),
      message,
    });
    setSending(false);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    setStep('sent');
  };

  const contactValue = [...contacts.board, ...contacts.others].some((c) => c.email === recipientEmail.trim())
    ? recipientEmail.trim()
    : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center wj-overlay animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col wj-overlay-panel animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Belege</div>
            <h3 className="text-base font-bold">
              {step === 'choose' ? 'Belege anfragen – Vorlage wählen' : 'Belege anfragen'}
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
          {step === 'choose' && (
            <div className="space-y-2">
              <p className="text-slate-500 leading-relaxed">
                Die E-Mail enthält einen Knopf, über den die Person Belege direkt hochladen kann – ohne
                Anmeldung. Eingereichte Belege stehen danach unter Belege → Offen.
              </p>

              {templates.length === 0 && (
                <p className="text-slate-400 py-2">Noch keine Vorlagen gespeichert.</p>
              )}

              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex items-stretch rounded-xl border border-slate-200 hover:border-[#003594]/40 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => startWith(t)}
                    className="flex-1 min-w-0 p-3 flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-[#003594] shrink-0" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-slate-900 text-sm truncate">{t.name}</span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {t.subject}
                        {firstLine(t.message) ? ` · ${firstLine(t.message)}` : ''}
                      </span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTemplate(t)}
                    className="px-3 border-l border-slate-100 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-r-xl transition-colors cursor-pointer"
                    title="Vorlage löschen"
                  >
                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => startWith()}
                className="w-full p-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
              >
                <PenLine className="w-4 h-4" strokeWidth={1.75} />
                Ohne Vorlage schreiben
              </button>
            </div>
          )}

          {step === 'compose' && (
            <div className="space-y-3">
              {currentTemplate && (
                <div className="text-[11px] text-slate-500">
                  Vorlage: <span className="font-bold text-slate-700">{currentTemplate.name}</span>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-900">Empfänger</div>
                {contacts.board.length + contacts.others.length > 0 && (
                  <select
                    value={contactValue}
                    onChange={(e) => pickContact(e.target.value)}
                    className={`${inputClass} bg-white cursor-pointer`}
                  >
                    <option value="">Aus der Liste wählen …</option>
                    {contacts.board.length > 0 && (
                      <optgroup label="Vorstand">
                        {contacts.board.map((c) => (
                          <option key={c.email} value={c.email}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {contacts.others.length > 0 && (
                      <optgroup label="Personen">
                        {contacts.others.map((c) => (
                          <option key={c.email} value={c.email}>
                            {c.name} ({c.email})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Name"
                    className={`${inputClass} bg-white`}
                  />
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="E-Mail-Adresse *"
                    className={`${inputClass} bg-white`}
                  />
                </div>
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
                    <div className="font-bold text-slate-900">{fillInvoiceRequestText(subject, values) || '–'}</div>
                    <div className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                      {fillInvoiceRequestText(message, values)}
                    </div>
                    <div>
                      <span className="inline-block px-4 py-2 rounded-lg bg-[#003594] text-white font-bold">
                        Beleg hochladen
                      </span>
                    </div>
                  </div>
                </Collapse>
              </div>

              {/* Vorlagen */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {newTemplateName === null ? (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {currentTemplate && (
                      <button
                        type="button"
                        onClick={updateTemplate}
                        className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
                        Vorlage „{currentTemplate.name}" aktualisieren
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewTemplateName('')}
                      className="text-[11px] font-bold text-[#003594] flex items-center gap-1 cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Als neue Vorlage speichern
                    </button>
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
                {templateNotice && (
                  <div className="text-[11px] font-semibold text-emerald-700">{templateNotice}</div>
                )}
              </div>

              {error && (
                <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'sent' && (
            <div className="py-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
              </div>
              <div className="font-bold text-slate-900 text-sm">E-Mail gesendet</div>
              <p className="text-slate-500">
                {recipientName.trim() || recipientEmail.trim()} bekommt einen Link zum Hochladen. Eingereichte
                Belege erscheinen unter Belege → Offen.
              </p>
            </div>
          )}
        </div>

        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-between gap-2 shrink-0">
          {step === 'compose' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('choose')}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={send}
                disabled={!canSend}
                className="px-4 py-2 bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" strokeWidth={2} />
                {sending ? 'Wird gesendet …' : 'E-Mail senden'}
              </button>
            </>
          ) : step === 'sent' ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setRecipientName('');
                  setRecipientEmail('');
                  setStep('choose');
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
          ) : (
            <>
              <span />
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-xs cursor-pointer"
              >
                Abbrechen
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
