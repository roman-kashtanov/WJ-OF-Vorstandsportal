import { Subsidy, SubsidyCategory, SubsidyPerson, SubsidyStatus } from '../types';
import { SubsidyLimits } from '../data/subsidyCatalogue';

/** `null` heißt "kein Limit" (siehe SubsidyLimits) - fürs Rechnen als Infinity behandeln. */
function resolveCategoryLimit(limits: SubsidyLimits, category: SubsidyCategory): number {
  const raw = limits.perCategoryPerYear[category];
  return raw === null || raw === undefined ? Infinity : raw;
}

/**
 * Auswertungen zur Zuschuss-Richtlinie.
 *
 * Gezählt wird alles, was nicht abgelehnt ist - auch Beantragtes und noch
 * nicht Stattgefundenes. Sonst würde das Budget als frei erscheinen, obwohl
 * es bereits verplant ist.
 */

export const STATUS_LABEL: Record<SubsidyStatus, string> = {
  beantragt: 'Beantragt',
  bestaetigt: 'Geprüft',
  im_beschluss: 'Im Beschluss',
  zur_zahlung_freigegeben: 'Zur Zahlung freigegeben',
  nicht_stattgefunden: 'Noch nicht stattgefunden',
  bezahlt: 'Bezahlt',
  abgelehnt: 'Abgelehnt',
};

/**
 * Diese zwei Status setzt ausschliesslich die Beschluss-Pipeline selbst
 * (Buendeln bzw. Abstimmungsergebnis in App.tsx) - nicht manuell waehlbar,
 * sonst koennte man die Beschluss-Pflicht vor der Auszahlung umgehen.
 */
export const PIPELINE_MANAGED_STATUSES: SubsidyStatus[] = ['im_beschluss', 'zur_zahlung_freigegeben'];

export interface SubsidyStage {
  key: string;
  label: string;
  statuses: SubsidyStatus[];
}

/**
 * Fasst die sieben granularen Status zu den Lebenszyklus-Phasen zusammen,
 * die der Vorstand als Reiter in SubsidiesView.tsx unterscheiden will:
 * Offen -> Geprueft -> Im Beschluss -> Zur Zahlung freigegeben -> Erledigt.
 * "nicht_stattgefunden" zaehlt zu "Offen" (noch nicht pruefbar), "abgelehnt"
 * zu "Erledigt" (kein weiterer Schritt noetig).
 */
export const SUBSIDY_STAGES: SubsidyStage[] = [
  { key: 'offen', label: 'Offen', statuses: ['beantragt', 'nicht_stattgefunden'] },
  { key: 'geprueft', label: 'Geprüft', statuses: ['bestaetigt'] },
  { key: 'im_beschluss', label: 'Im Beschluss', statuses: ['im_beschluss'] },
  { key: 'zur_zahlung', label: 'Zur Zahlung freigegeben', statuses: ['zur_zahlung_freigegeben'] },
  { key: 'erledigt', label: 'Erledigt', statuses: ['bezahlt', 'abgelehnt'] },
];

export const PERSON_TYPE_LABEL: Record<SubsidyPerson['type'], string> = {
  mitglied: 'Mitglied',
  foerdermitglied: 'Fördermitglied',
  interessent: 'Interessent',
};

/** Zählt dieser Zuschuss gegen das Budget? */
export function countsTowardsBudget(s: Subsidy): boolean {
  return s.status !== 'abgelehnt';
}

/**
 * Darf jetzt tatsaechlich ausgezahlt werden?
 *
 * Bewusst NICHT "bestaetigt" (das heisst nur "geprueft, inhaltlich korrekt").
 * Auszahlbar ist ein Zuschuss erst, wenn der ihn buendelnde Vorstandsbeschluss
 * angenommen wurde - siehe die Kaskade in App.tsx, die diesen Status setzt.
 */
export function isPayable(s: Subsidy): boolean {
  return s.status === 'zur_zahlung_freigegeben';
}

export interface BudgetOverview {
  year: number;
  total: number;
  used: number;
  remaining: number;
  paid: number;
  /** Zugesagt, aber noch nicht ausgezahlt */
  committed: number;
  isExhausted: boolean;
}

export function budgetOverview(
  subsidies: Subsidy[],
  year: number,
  limits: SubsidyLimits
): BudgetOverview {
  const ofYear = subsidies.filter((s) => s.year === year && countsTowardsBudget(s));
  const used = ofYear.reduce((sum, s) => sum + (s.amount || 0), 0);
  const paid = ofYear
    .filter((s) => s.status === 'bezahlt')
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  return {
    year,
    total: limits.totalPerYear,
    used,
    remaining: Math.max(0, limits.totalPerYear - used),
    paid,
    committed: used - paid,
    isExhausted: used >= limits.totalPerYear,
  };
}

export interface PersonBudget {
  personId: string;
  used: number;
  remaining: number;
  perCategory: Record<SubsidyCategory, { used: number; limit: number; remaining: number }>;
}

export function personBudget(
  subsidies: Subsidy[],
  personId: string,
  year: number,
  limits: SubsidyLimits
): PersonBudget {
  const own = subsidies.filter(
    (s) => s.personId === personId && s.year === year && countsTowardsBudget(s)
  );

  const perCategory = {} as PersonBudget['perCategory'];
  for (const cat of ['academy', 'training', 'konferenz', 'sonstiges'] as SubsidyCategory[]) {
    const used = own
      .filter((s) => s.category === cat)
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    const limit = resolveCategoryLimit(limits, cat);
    perCategory[cat] = {
      used,
      limit,
      remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
    };
  }

  const used = own.reduce((sum, s) => sum + (s.amount || 0), 0);
  return {
    personId,
    used,
    remaining: Math.max(0, limits.perPersonPerYear - used),
    perCategory,
  };
}

export interface SubsidyWarning {
  level: 'hinweis' | 'warnung';
  text: string;
}

/**
 * Prüft einen geplanten Zuschuss gegen die Richtlinie.
 *
 * Bewusst nur Hinweise, keine Sperre: Der Vorstand kann im Einzelfall
 * abweichen (§ 5 Abs. 3, § 3) - er soll es aber bewusst tun.
 */
export function checkSubsidy(
  draft: { personId: string; category: SubsidyCategory; amount: number; eventKey?: string; year: number; actualCost?: number },
  existing: Subsidy[],
  limits: SubsidyLimits,
  editingId?: string
): SubsidyWarning[] {
  const warnings: SubsidyWarning[] = [];
  const others = existing.filter((s) => s.id !== editingId);

  // § 9: Der Zuschuss ist nie höher als die tatsächlich gezahlten Kosten
  if (draft.actualCost !== undefined && draft.actualCost > 0 && draft.amount > draft.actualCost) {
    warnings.push({
      level: 'warnung',
      text: `Der Zuschuss (${draft.amount} €) übersteigt die angegebenen Kosten (${draft.actualCost} €). Nach § 9 der Richtlinie ist das nicht zulässig.`,
    });
  }

  const pb = personBudget(others, draft.personId, draft.year, limits);

  // Kategoriegrenze (§ 5 Abs. 4, § 6 Abs. 2, § 7 Abs. 2)
  const cat = pb.perCategory[draft.category];
  if (cat && cat.limit !== Infinity && cat.used + draft.amount > cat.limit) {
    warnings.push({
      level: 'warnung',
      text: `Jahresgrenze für diese Kategorie überschritten: bereits ${cat.used} € von ${cat.limit} € verbraucht.`,
    });
  }

  // Persönliche Jahresgrenze
  if (pb.used + draft.amount > limits.perPersonPerYear) {
    warnings.push({
      level: 'warnung',
      text: `Persönliche Jahresgrenze überschritten: bereits ${pb.used} € von ${limits.perPersonPerYear} € verbraucht.`,
    });
  }

  // Gesamtbudget (§ 8)
  const overview = budgetOverview(others, draft.year, limits);
  if (overview.used + draft.amount > limits.totalPerYear) {
    warnings.push({
      level: 'warnung',
      text: `Das Gesamtbudget von ${limits.totalPerYear} € für ${draft.year} wird überschritten (bereits ${overview.used} € verplant).`,
    });
  }

  // § 5 Abs. 5 und § 6 Abs. 3: jede Veranstaltung nur einmal je Mitgliedschaft
  if (draft.eventKey && draft.eventKey !== 'sonstiges') {
    const already = others.find(
      (s) =>
        s.personId === draft.personId &&
        s.eventKey === draft.eventKey &&
        countsTowardsBudget(s)
    );
    if (already && (draft.category === 'academy' || draft.category === 'training')) {
      warnings.push({
        level: 'hinweis',
        text: `Diese Veranstaltung wurde für diese Person bereits ${already.year} bezuschusst. Laut Richtlinie ist das nur einmal je Mitgliedschaft vorgesehen.`,
      });
    }
  }

  return warnings;
}

/**
 * Vergleichsschlüssel für Namen, unabhängig von der Reihenfolge der
 * Wortteile ("Max Mustermann" und "Mustermann Max" ergeben denselben
 * Schlüssel) - erkennt so einen häufigen Tippfehler beim öffentlichen
 * Formular als wahrscheinliches Personen-Duplikat.
 */
export function normalizeNameKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(' ');
}

/** Verwendungszweck für die Überweisung. */
export function paymentReference(subsidies: Subsidy[]): string {
  if (subsidies.length === 1) {
    return `Zuschuss ${subsidies[0].eventName}`;
  }
  return `Zuschuesse ${subsidies.length} Veranstaltungen ${subsidies[0].year}`;
}
