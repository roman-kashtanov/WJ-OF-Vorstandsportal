import React, { useState } from 'react';
import {
  InvoiceRequestTemplate,
  DEFAULT_INVOICE_REQUEST_TEMPLATES,
} from '../data/invoiceRequestTemplates';
import { FileText, Pencil, Trash2, Plus, ChevronRight, RotateCcw } from 'lucide-react';

/**
 * Vorlagen fuer "Belege anfragen" verwalten: anlegen, bearbeiten, loeschen.
 * Gemeinsam genutzt von Einstellungen → Vorlagen und vom Anfragefenster
 * ("Vorlage waehlen", dort mit `onApply`: ein Tipp uebernimmt die Vorlage).
 */

interface Props {
  templates: InvoiceRequestTemplate[];
  onSave: (templates: InvoiceRequestTemplate[]) => void;
  /** Im Anfragefenster: Tipp auf eine Vorlage uebernimmt sie in die E-Mail. */
  onApply?: (template: InvoiceRequestTemplate) => void;
}

const inputClass =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]';

const preview = (t: InvoiceRequestTemplate) => {
  const line =
    t.message
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^hallo\b/i.test(l))[0] || '';
  return `${t.subject}${line ? ` · ${line}` : ''}`;
};

export const InvoiceRequestTemplateManager: React.FC<Props> = ({ templates, onSave, onApply }) => {
  /** Vorlage in Bearbeitung; id '' = neue Vorlage */
  const [draft, setDraft] = useState<InvoiceRequestTemplate | null>(null);
  const [error, setError] = useState('');

  const missingDefaults = DEFAULT_INVOICE_REQUEST_TEMPLATES.templates.filter(
    (d) => !templates.some((t) => t.id === d.id)
  );

  const startNew = () => {
    setError('');
    setDraft({ id: '', name: '', subject: '', message: 'Hallo {Name},\n\n\n\nViele Grüße\n{Absender}' });
  };

  const save = () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name || !draft.subject.trim() || !draft.message.trim()) {
      setError('Bitte Name, Betreff und Text ausfüllen.');
      return;
    }
    const cleaned = { ...draft, name, subject: draft.subject.trim() };
    if (draft.id) {
      onSave(templates.map((t) => (t.id === draft.id ? cleaned : t)));
    } else {
      onSave([...templates, { ...cleaned, id: `tpl_${Date.now()}` }]);
    }
    setDraft(null);
    setError('');
  };

  const remove = (t: InvoiceRequestTemplate) => {
    if (!confirm(`Vorlage „${t.name}" löschen? Sie ist dann für den ganzen Vorstand weg.`)) return;
    onSave(templates.filter((x) => x.id !== t.id));
    if (draft?.id === t.id) setDraft(null);
  };

  const renderEditor = () =>
    draft && (
      <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/60 space-y-2 text-xs animate-in fade-in">
        <div className="font-bold text-slate-900">{draft.id ? 'Vorlage bearbeiten' : 'Neue Vorlage'}</div>
        <input
          autoFocus
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="Name der Vorlage *"
          className={inputClass}
        />
        <input
          value={draft.subject}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          placeholder="Betreff *"
          className={inputClass}
        />
        <textarea
          value={draft.message}
          onChange={(e) => setDraft({ ...draft, message: e.target.value })}
          rows={9}
          className={`${inputClass} leading-relaxed resize-y`}
        />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {'{Name}'} = Name des Empfängers, {'{Absender}'} = Name des Absenders. Der Link zum Hochladen kommt
          automatisch als Knopf unter den Text.
        </p>
        {error && <div className="text-[11px] font-semibold text-rose-700">{error}</div>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(null);
              setError('');
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={save}
            className="px-4 py-1.5 bg-[#003594] hover:bg-[#00266B] text-white font-bold rounded-lg cursor-pointer"
          >
            Speichern
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-2 text-xs">
      {templates.length === 0 && !draft && <p className="text-slate-400 py-1">Noch keine Vorlagen gespeichert.</p>}

      {templates.map((t) =>
        draft?.id === t.id ? (
          <React.Fragment key={t.id}>{renderEditor()}</React.Fragment>
        ) : (
          <div
            key={t.id}
            className="flex items-stretch rounded-xl border border-slate-200 bg-white hover:border-[#003594]/40 transition-colors"
          >
            <button
              type="button"
              onClick={() => (onApply ? onApply(t) : setDraft({ ...t }))}
              className="flex-1 min-w-0 p-3 flex items-center gap-2.5 text-left cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#003594] shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-slate-900 text-sm truncate">{t.name}</span>
                <span className="block text-[11px] text-slate-500 truncate">{preview(t)}</span>
              </span>
              {onApply && <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" strokeWidth={1.75} />}
            </button>
            {onApply && (
              <button
                type="button"
                onClick={() => setDraft({ ...t })}
                className="px-2.5 border-l border-slate-100 text-slate-300 hover:text-[#003594] hover:bg-slate-50 transition-colors cursor-pointer"
                title="Vorlage bearbeiten"
              >
                <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(t)}
              className="px-2.5 border-l border-slate-100 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-r-xl transition-colors cursor-pointer"
              title="Vorlage löschen"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        )
      )}

      {draft && !draft.id ? (
        renderEditor()
      ) : (
        <button
          type="button"
          onClick={startNew}
          className="w-full p-3 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 font-semibold flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          Neue Vorlage anlegen
        </button>
      )}

      {missingDefaults.length > 0 && (
        <button
          type="button"
          onClick={() => onSave([...templates, ...missingDefaults])}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#003594] cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
          Standardvorlagen wiederherstellen ({missingDefaults.length})
        </button>
      )}
    </div>
  );
};
