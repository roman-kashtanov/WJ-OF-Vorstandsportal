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

/**
 * Kategorie mit Jahresgrenze - seit v3.30.0 in Einstellungen → Zuschüsse frei
 * anlegbar, umbenennbar und entfernbar. Der Schlüssel bleibt beim Umbenennen
 * gleich, damit bestehende Zuschüsse ihre Kategorie behalten.
 */
export interface SubsidyCategoryDef {
  key: string;
  label: string;
  /** Jahresgrenze je Person in dieser Kategorie; `null` = kein Limit */
  limit: number | null;
  /** § 5 Abs. 5, § 6 Abs. 3: dieselbe Veranstaltung nur einmal je Person bezuschussen */
  oncePerMembership?: boolean;
}

/** Die vier Kategorien der Richtlinie 01.2026 - Standard und Rückfall für Altbestand. */
export const DEFAULT_SUBSIDY_CATEGORIES: SubsidyCategoryDef[] = [
  { key: 'academy', label: 'Academy', limit: 200, oncePerMembership: true },
  { key: 'training', label: 'Training', limit: 75, oncePerMembership: true },
  { key: 'konferenz', label: 'Konferenz', limit: 200 },
  { key: 'sonstiges', label: 'Sonstiges', limit: null },
];

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
  /**
   * Maßgeblich seit v3.30.0: Kategorien samt Grenze. Liegt bewusst hier bei
   * den Grenzen, weil `limits` ohnehin überall hingereicht wird, wo
   * Kategorien gebraucht werden. Fehlt bei älteren Dokumenten - dann gelten
   * die vier Standardkategorien (subsidyCategoriesOf).
   */
  categories?: SubsidyCategoryDef[];
  /** Aus `categories` abgeleitet und mitgespeichert, damit ältere App-Stände weiterrechnen. */
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
  categories: DEFAULT_SUBSIDY_CATEGORIES,
};

export const DEFAULT_SUBSIDY_CATALOGUE_SETTINGS: SubsidyCatalogueSettings = {
  entries: SUBSIDY_CATALOGUE,
  limits: DEFAULT_SUBSIDY_LIMITS,
};

/**
 * Kategorien der Grenzen. Ältere Dokumente ohne `categories`: die vier
 * Richtlinien-Kategorien mit den dort gespeicherten Grenzen.
 */
export function subsidyCategoriesOf(limits?: Partial<SubsidyLimits> | null): SubsidyCategoryDef[] {
  if (limits && Array.isArray(limits.categories) && limits.categories.length > 0) {
    return limits.categories.map((c) => ({ ...c, limit: c.limit ?? null }));
  }
  const stored = (limits?.perCategoryPerYear || {}) as Record<string, number | null | undefined>;
  return DEFAULT_SUBSIDY_CATEGORIES.map((c) => ({
    ...c,
    limit: c.key in stored ? stored[c.key] ?? null : c.limit,
  }));
}

/** Anzeigename einer Kategorie - auch für Schlüssel, die es nicht mehr gibt. */
export function categoryLabel(limits: Partial<SubsidyLimits> | null | undefined, key: string): string {
  const def =
    subsidyCategoriesOf(limits).find((c) => c.key === key) ||
    DEFAULT_SUBSIDY_CATEGORIES.find((c) => c.key === key);
  if (def) return def.label;
  return key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : '–';
}

/** Grenzen vollständig machen: Kategorienliste vorhanden, perCategoryPerYear passend dazu. */
export function normalizeSubsidyLimits(limits?: Partial<SubsidyLimits> | null): SubsidyLimits {
  const categories = subsidyCategoriesOf(limits);
  return {
    totalPerYear:
      typeof limits?.totalPerYear === 'number' ? limits.totalPerYear : DEFAULT_SUBSIDY_LIMITS.totalPerYear,
    perPersonPerYear:
      typeof limits?.perPersonPerYear === 'number'
        ? limits.perPersonPerYear
        : DEFAULT_SUBSIDY_LIMITS.perPersonPerYear,
    categories,
    perCategoryPerYear: Object.fromEntries(categories.map((c) => [c.key, c.limit])),
  };
}

/** Für alles, was aus Speicher, Firestore oder dem Editor kommt. */
export function normalizeCatalogueSettings(
  settings?: Partial<SubsidyCatalogueSettings> | null
): SubsidyCatalogueSettings {
  return {
    entries: Array.isArray(settings?.entries) ? settings!.entries : SUBSIDY_CATALOGUE,
    limits: normalizeSubsidyLimits(settings?.limits),
  };
}
