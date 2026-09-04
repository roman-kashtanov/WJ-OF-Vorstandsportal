import { SubsidyCategory } from '../types';

/**
 * Veranstaltungen und Beträge aus der Zuschuss-Richtlinie 01.2026.
 *
 * Die Beträge sind Vorschläge, keine festen Werte: In der Praxis werden auch
 * kleinere Zuschüsse gewährt (z. B. 5 € für ein Kurztraining), und § 9 der
 * Richtlinie begrenzt den Zuschuss ohnehin auf die tatsächlich gezahlten Kosten.
 */
export interface SubsidyCatalogueEntry {
  key: string;
  label: string;
  category: SubsidyCategory;
  /** Vorschlag laut Richtlinie */
  amount: number;
  /** Kosten werden vollständig übernommen (LEO) */
  fullCost?: boolean;
  /** Nur mit zustimmendem Vorstandsbeschluss */
  needsResolution?: boolean;
  hint?: string;
}

export const SUBSIDY_CATALOGUE: SubsidyCatalogueEntry[] = [
  // § 5 JCI Academies
  {
    key: 'leo',
    label: 'LEO Academy',
    category: 'academy',
    amount: 0,
    fullCost: true,
    needsResolution: true,
    hint: 'Kosten werden vollständig übernommen. Voraussetzung: Nominierung durch den Vorstand.',
  },
  { key: 'swa', label: 'SüdWestAcademy (SWA)', category: 'academy', amount: 75 },
  { key: 'tfa', label: 'TeamFührungsAcademy (TFA)', category: 'academy', amount: 100 },
  { key: 'ea', label: 'European Academy (EA)', category: 'academy', amount: 125 },
  { key: 'ga', label: 'German Academy (GA)', category: 'academy', amount: 125 },
  { key: 'trainer', label: 'WJD Trainer Kurs', category: 'academy', amount: 100 },
  { key: 'landes', label: 'Weitere Landes Academy', category: 'academy', amount: 75 },

  // § 6 JCI Trainings
  {
    key: 'jci_training',
    label: 'JCI Training',
    category: 'training',
    amount: 75,
    hint: 'Alle offiziellen JCI Trainings.',
  },

  // § 7 Konferenzen
  { key: 'lako', label: 'Landeskonferenz (LAKO)', category: 'konferenz', amount: 70 },
  {
    key: 'regional',
    label: 'Regionale Konferenz (MIRKO, HAKO)',
    category: 'konferenz',
    amount: 70,
  },
  { key: 'buko', label: 'Bundeskonferenz (BUKO)', category: 'konferenz', amount: 100 },
  { key: 'euko', label: 'Europakonferenz (EUKO)', category: 'konferenz', amount: 125 },
  { key: 'weko', label: 'Weltkongress (WEKO)', category: 'konferenz', amount: 150 },

  {
    key: 'sonstiges',
    label: 'Sonstiges',
    category: 'sonstiges',
    amount: 0,
    needsResolution: true,
    hint: 'Nicht in der Richtlinie aufgeführt – erfordert einen Vorstandsbeschluss.',
  },
];

export const CATEGORY_LABEL: Record<SubsidyCategory, string> = {
  academy: 'Academy',
  training: 'Training',
  konferenz: 'Konferenz',
  sonstiges: 'Sonstiges',
};

/**
 * Obergrenzen der Richtlinie (§ 5 Abs. 4, § 6 Abs. 2, § 7 Abs. 2, § 8).
 * Alles pro Kalenderjahr; nicht verbrauchtes Budget verfällt zum 01.01.
 */
export const SUBSIDY_LIMITS = {
  perCategoryPerYear: {
    academy: 200,
    training: 75,
    konferenz: 200,
    sonstiges: Infinity,
  } as Record<SubsidyCategory, number>,
  /** Rechnerische Summe der Kategoriegrenzen - so auch in der Tabelle gefuehrt. */
  perPersonPerYear: 475,
  totalPerYear: 2500,
};

export function catalogueEntry(key?: string): SubsidyCatalogueEntry | undefined {
  return SUBSIDY_CATALOGUE.find((e) => e.key === key);
}

/**
 * Ab hier: admin-editierbare Fassung (Settings-Dokument
 * `settings/subsidyCatalogue`, siehe FirebaseSync.subscribeSubsidyCatalogueSettings).
 * Die Konstanten oben bleiben unveraendert bestehen als Default/Fallback -
 * fuer neue Installationen und fuer lokales Testen ohne Firestore-Dienstkonto.
 *
 * `null` statt `Infinity` fuer "kein Limit": Firestore/JSON kennen kein
 * Infinity (ein Roundtrip durch JSON.stringify macht sonst unkontrolliert
 * `null` daraus) - hier wird das absichtlich und explizit so gehandhabt.
 */
export interface SubsidyLimits {
  perCategoryPerYear: Record<SubsidyCategory, number | null>;
  perPersonPerYear: number;
  totalPerYear: number;
}

export interface SubsidyCatalogueSettings {
  entries: SubsidyCatalogueEntry[];
  limits: SubsidyLimits;
}

export const DEFAULT_SUBSIDY_LIMITS: SubsidyLimits = {
  perCategoryPerYear: {
    academy: SUBSIDY_LIMITS.perCategoryPerYear.academy,
    training: SUBSIDY_LIMITS.perCategoryPerYear.training,
    konferenz: SUBSIDY_LIMITS.perCategoryPerYear.konferenz,
    sonstiges: null,
  },
  perPersonPerYear: SUBSIDY_LIMITS.perPersonPerYear,
  totalPerYear: SUBSIDY_LIMITS.totalPerYear,
};

export const DEFAULT_SUBSIDY_CATALOGUE_SETTINGS: SubsidyCatalogueSettings = {
  entries: SUBSIDY_CATALOGUE,
  limits: DEFAULT_SUBSIDY_LIMITS,
};
