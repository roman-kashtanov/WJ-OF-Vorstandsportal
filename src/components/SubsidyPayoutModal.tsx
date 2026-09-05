import React, { useMemo, useState } from 'react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { Subsidy, SubsidyKind, SubsidyPerson } from '../types';
import { formatCurrency } from '../utils/formatters';
import { paymentReference, subsidyKind, KIND_TEXTS } from '../utils/subsidies';
import {
  buildSepaCreditTransfer,
  downloadSepaFile,
  isValidIban,
  formatIban,
  SepaPayment,
} from '../utils/sepa';
import { generateGiroCodePaymentsPdf } from '../utils/giroCodePdf';
import { downloadBlob } from '../utils/fileHelpers';
import { X, Banknote, AlertTriangle, Download, Info, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  subsidies: Subsidy[];
  people: SubsidyPerson[];
  year: number;
  /** Zuschuesse und Auslagen werden getrennt ausgezahlt (getrennte Reiter). */
  kind: SubsidyKind;
  clubAccount: { name: string; iban: string; bic?: string };
  onSaveClubAccount: (account: { name: string; iban: string; bic?: string }) => void;
  onMarkPaid: (ids: string[], format: 'sepa-xml' | 'girocode-pdf') => void;
}

export const SubsidyPayoutModal: React.FC<Props> = ({
  isOpen,
  onClose,
  subsidies,
  people,
  year,
  kind,
  clubAccount,
  onSaveClubAccount,
  onMarkPaid,
}) => {
  const texts = KIND_TEXTS[kind];
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [account, setAccount] = useState(clubAccount);
  const [executionDate, setExecutionDate] = useState(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [generated, setGenerated] = useState<
    { count: number; sum: number; format: 'sepa-xml' | 'girocode-pdf' } | null
  >(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const personById = useMemo(
    () => Object.fromEntries(people.map((p) => [p.id, p])),
    [people]
  );

  /** Auszahlungen je Person zusammenfassen - eine Überweisung pro Empfänger. */
  const groups = useMemo(() => {
    const payable = subsidies.filter(
      (s) => s.year === year && s.status === 'zur_zahlung_freigegeben' && subsidyKind(s) === kind
    );
    const byPerson: Record<string, Subsidy[]> = {};
    for (const s of payable) {
      (byPerson[s.personId] ||= []).push(s);
    }
    return Object.entries(byPerson).map(([personId, items]) => ({
      person: personById[personId],
      personId,
      items,
      sum: items.reduce((acc, s) => acc + s.amount, 0),
      hasValidIban: !!personById[personId]?.iban && isValidIban(personById[personId]!.iban!),
    }));
  }, [subsidies, year, personById, kind]);

  // Beim ersten Öffnen alles Auszahlbare vorauswählen
  const effectiveSelected = useMemo(() => {
    if (Object.keys(selected).length > 0) return selected;
    return Object.fromEntries(groups.filter((g) => g.hasValidIban).map((g) => [g.personId, true]));
  }, [selected, groups]);

  useBodyScrollLock(isOpen);
  if (!isOpen) return null;

  const chosen = groups.filter((g) => effectiveSelected[g.personId] && g.hasValidIban);
  const chosenSum = chosen.reduce((acc, g) => acc + g.sum, 0);
  const accountValid = !!account.name.trim() && isValidIban(account.iban || '');

  const buildPayments = (): SepaPayment[] =>
    chosen.map((g) => ({
      name: g.person.accountHolder?.trim() || g.person.name,
      iban: g.person.iban!,
      bic: g.person.bic || undefined,
      amount: g.sum,
      reference: paymentReference(g.items),
      endToEndId: `WJOF-${year}-${g.personId.slice(-8)}`,
    }));

  const generateSepa = () => {
    if (!accountValid || chosen.length === 0) return;

    const result = buildSepaCreditTransfer(
      account,
      buildPayments(),
      executionDate,
      texts.fileLabel
    );
    downloadSepaFile(result);
    onSaveClubAccount(account);
    // Datei erzeugen und als erledigt markieren sind EIN Schritt - kein
    // separater Bestaetigungs-Klick mehr noetig (Nutzerwunsch: der Ablauf
    // soll nahezu vollstaendig automatisch laufen).
    onMarkPaid(chosen.flatMap((g) => g.items.map((i) => i.id)), 'sepa-xml');
    setGenerated({ count: result.count, sum: result.sum, format: 'sepa-xml' });
  };

  const generateGiroCode = async () => {
    if (!accountValid || chosen.length === 0) return;
    setIsGeneratingQr(true);
    try {
      const payments = buildPayments();
      const { blob, fileName } = await generateGiroCodePaymentsPdf(account, payments, texts.fileLabel);
      downloadBlob(blob, fileName);
      onSaveClubAccount(account);
      onMarkPaid(chosen.flatMap((g) => g.items.map((i) => i.id)), 'girocode-pdf');
      setGenerated({
        count: payments.length,
        sum: payments.reduce((acc, p) => acc + p.amount, 0),
        format: 'girocode-pdf',
      });
    } finally {
      setIsGeneratingQr(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh] animate-in fade-in zoom-in-95">
        <div className="px-5 py-4 bg-[#003594] text-white flex items-center justify-between shrink-0">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              {texts.plural} {year}
            </div>
            <h3 className="text-base font-bold">Sammelüberweisung</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {generated ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
                ✓
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">Datei erstellt</div>
                <p className="mt-1 text-slate-500 leading-relaxed">
                  {generated.count} {generated.count === 1 ? 'Überweisung' : 'Überweisungen'} über{' '}
                  {formatCurrency(generated.sum)} wurden heruntergeladen.
                </p>
              </div>

              {generated.format === 'sepa-xml' ? (
                <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-600">
                  <div className="font-bold text-slate-800">So spielst du die Datei ein:</div>
                  <div>
                    <strong>Sparkasse:</strong> Online-Banking → Banking → Datei-Übertragung → SEPA
                    Überweisungsdatei
                  </div>
                  <div>
                    <strong>VR-Bank:</strong> Online-Banking → Banking → Datei-Upload → SEPA-Datei
                  </div>
                  <div className="pt-1 text-slate-500">
                    Nach dem Hochladen zeigt die Bank alle Überweisungen zur Prüfung an. Erst mit
                    der TAN-Freigabe wird tatsächlich gezahlt.
                  </div>
                </div>
              ) : (
                <div className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-600">
                  <div className="font-bold text-slate-800">So nutzt du die PDF:</div>
                  <div>
                    In der Banking-App die Funktion „Überweisung per Foto/QR-Code" öffnen (meist im
                    Überweisungs-Menü) und je Seite den QR-Code abfotografieren - IBAN, Betrag und
                    Verwendungszweck werden automatisch übernommen.
                  </div>
                  <div className="pt-1 text-slate-500">
                    Vor jeder Überweisung die übernommenen Daten kurz prüfen, dann wie gewohnt mit
                    TAN freigeben.
                  </div>
                </div>
              )}

              <p className="text-[11px] text-emerald-700 font-semibold">
                Die ausgewählten Zuschüsse wurden automatisch als erledigt markiert.
              </p>
              <p className="text-[11px] text-slate-400">
                Datei nochmal nötig? Im Reiter „Erledigt" beim jeweiligen Zuschuss erneut
                herunterladen.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Fertig
              </button>
            </div>
          ) : (
            <>
              {/* Auftraggeberkonto */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-sm">Vereinskonto (Auftraggeber)</div>
                <input
                  value={account.name}
                  onChange={(e) => setAccount({ ...account, name: e.target.value })}
                  placeholder="Kontoinhaber, z. B. Wirtschaftsjunioren Offenbach am Main e.V."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={account.iban}
                    onChange={(e) => setAccount({ ...account, iban: e.target.value })}
                    placeholder="IBAN des Vereins"
                    className={`sm:col-span-2 px-3 py-2.5 bg-slate-50 border rounded-xl font-mono text-base sm:text-xs focus:outline-none focus:ring-2 ${
                      account.iban && !isValidIban(account.iban)
                        ? 'border-rose-300 focus:ring-rose-400'
                        : 'border-slate-200 focus:ring-[#003594]'
                    }`}
                  />
                  <input
                    value={account.bic || ''}
                    onChange={(e) => setAccount({ ...account, bic: e.target.value })}
                    placeholder="BIC (nur falls bekannt)"
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                  />
                </div>
                {account.iban && !isValidIban(account.iban) && (
                  <p className="text-[11px] font-semibold text-rose-700">
                    Diese IBAN ist nicht gültig.
                  </p>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-900 block mb-1.5">Ausführung am</label>
                <input
                  type="date"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-[#003594]"
                />
              </div>

              {/* Empfänger */}
              <div className="space-y-1.5">
                <div className="font-bold text-slate-900 text-sm">
                  Empfänger ({chosen.length} ausgewählt)
                </div>

                {groups.length === 0 && (
                  <p className="text-slate-400 py-4 text-center">
                    Keine zur Zahlung freigegebenen Zuschüsse. Erst bündeln, per Beschluss
                    abstimmen lassen - danach erscheinen sie hier.
                  </p>
                )}

                {groups.map((g) => (
                  <label
                    key={g.personId}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border transition-colors ${
                      g.hasValidIban
                        ? 'border-slate-200 cursor-pointer hover:bg-slate-50'
                        : 'border-amber-200 bg-amber-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!g.hasValidIban}
                      checked={!!effectiveSelected[g.personId] && g.hasValidIban}
                      onChange={(e) =>
                        setSelected({ ...effectiveSelected, [g.personId]: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 accent-[#003594] shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-slate-900 truncate">
                          {g.person?.name || 'Unbekannt'}
                        </span>
                        <span className="font-bold text-slate-900 shrink-0">
                          {formatCurrency(g.sum)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {g.items.map((i) => i.eventName).join(' · ')}
                      </div>
                      {g.hasValidIban ? (
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          {formatIban(g.person.iban!)}
                        </div>
                      ) : (
                        <div className="text-[11px] font-semibold text-amber-800 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                          {g.person?.iban
                            ? 'IBAN ungültig — bitte korrigieren'
                            : 'Keine IBAN hinterlegt'}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#00A3E0]" strokeWidth={2} />
                <span>
                  Mehrere Zuschüsse derselben Person werden zu <strong>einer</strong> Überweisung
                  zusammengefasst. Erzeugt wird eine SEPA-Datei im Format pain.001.001.03, die
                  Sparkasse und VR-Bank im Online-Banking einlesen.
                </span>
              </div>
            </>
          )}
        </div>

        {!generated && (
          <div className="p-3.5 sm:px-5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2.5 shrink-0">
            <div className="text-xs flex items-center justify-between">
              <span className="text-slate-500">Summe </span>
              <span className="font-bold text-slate-900">{formatCurrency(chosenSum)}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={generateSepa}
                disabled={!accountValid || chosen.length === 0 || isGeneratingQr}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#003594] hover:bg-[#00266B] disabled:opacity-40 font-bold text-white text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" strokeWidth={2} />
                SEPA-Datei (Online-Banking)
              </button>
              <button
                type="button"
                onClick={generateGiroCode}
                disabled={!accountValid || chosen.length === 0 || isGeneratingQr}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 disabled:opacity-40 font-bold text-slate-700 text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4" strokeWidth={2} />
                {isGeneratingQr ? 'Wird erzeugt…' : 'QR-Code-PDF (Banking-App)'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
