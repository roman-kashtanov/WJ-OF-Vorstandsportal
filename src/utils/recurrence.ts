import { RecurrenceRule } from '../types';

/**
 * Reine Datumslogik für wiederkehrende Termin-Serien (Outlook-artige
 * Wiederholungsregeln) - keine React-/Firebase-Abhängigkeit, damit sie
 * unabhängig testbar bleibt. Rechnet bewusst mit lokalen Kalendertagen
 * (keine Uhrzeit/Zeitzone), da `Meeting.date` ein reines YYYY-MM-DD ist.
 */

const WEEKDAY_LABELS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAY_LABELS_LONG = [
  'Sonntag',
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
];
const MONTH_LABELS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];
const ORDINAL_LABELS: Record<number, string> = { 1: '1.', 2: '2.', 3: '3.', 4: '4.', [-1]: 'letzten' };

/** Anzahl der Monate, für die ohne Ende-Bedingung Termine generiert werden. */
export const DEFAULT_RECURRENCE_HORIZON_MONTHS = 24;

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Das Nte Vorkommen eines Wochentags in einem gegebenen Monat (ordinal -1 = letztes). */
function nthWeekdayOfMonth(year: number, month0: number, weekday: number, ordinal: number): Date | null {
  if (ordinal > 0) {
    const first = new Date(year, month0, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    const day = 1 + offset + (ordinal - 1) * 7;
    const result = new Date(year, month0, day);
    return result.getMonth() === month0 ? result : null;
  }
  // Letztes Vorkommen: vom Monatsende rückwärts suchen.
  const last = new Date(year, month0 + 1, 0);
  const offset = (last.getDay() - weekday + 7) % 7;
  return addDays(last, -offset);
}

/**
 * Berechnet die konkreten Termine einer Serie ab `seriesStartDate`, bis
 * `rule.endDate`/`rule.count` erreicht ist oder (ohne Ende-Bedingung) der
 * `horizonMonths`-Zeitraum ausgeschöpft ist. Liefert YYYY-MM-DD-Strings,
 * aufsteigend sortiert.
 */
export function generateOccurrenceDates(
  rule: RecurrenceRule,
  seriesStartDate: string,
  horizonMonths: number = DEFAULT_RECURRENCE_HORIZON_MONTHS
): string[] {
  const start = toDate(seriesStartDate);
  const horizonEnd = addMonths(start, horizonMonths);
  // Bei 'afterCount' darf der Standard-Horizont die Serie nicht vorzeitig
  // abschneiden, bevor die gewuenschte Anzahl erreicht ist (z. B. "letzter
  // Freitag im November, 3x" braucht laenger als 24 Monate) - dort greift
  // stattdessen eine grosszuegige, aber begrenzte Obergrenze (50 Jahre),
  // der eigentliche Abbruch passiert ueber maxCount.
  const hardEnd =
    rule.endMode === 'onDate' && rule.endDate
      ? toDate(rule.endDate)
      : rule.endMode === 'afterCount'
      ? addMonths(start, 600)
      : horizonEnd;
  const maxCount = rule.endMode === 'afterCount' && rule.count ? rule.count : Infinity;

  const results: string[] = [];
  const interval = Math.max(1, rule.interval || 1);

  if (rule.frequency === 'daily') {
    let cur = start;
    while (cur <= hardEnd && results.length < maxCount) {
      results.push(toIso(cur));
      cur = addDays(cur, interval);
    }
    return results;
  }

  if (rule.frequency === 'weekly') {
    const weekdays = rule.weekdays && rule.weekdays.length > 0 ? rule.weekdays : [start.getDay()];
    // Woche für Woche durchgehen (im gewählten Intervall), je Woche alle
    // gewählten Wochentage sammeln und sortiert anhängen.
    let weekStart = addDays(start, -start.getDay()); // Sonntag der Startwoche
    while (weekStart <= hardEnd && results.length < maxCount) {
      for (const wd of [...weekdays].sort((a, b) => a - b)) {
        const day = addDays(weekStart, wd);
        if (day >= start && day <= hardEnd && results.length < maxCount) {
          results.push(toIso(day));
        }
      }
      weekStart = addDays(weekStart, 7 * interval);
    }
    return results;
  }

  if (rule.frequency === 'monthly') {
    let monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
    let guard = 0;
    while (monthCursor <= hardEnd && results.length < maxCount && guard < 1000) {
      guard++;
      let occurrence: Date | null = null;
      if (rule.monthlyMode === 'weekday' && rule.weekday !== undefined && rule.weekdayOrdinal) {
        occurrence = nthWeekdayOfMonth(
          monthCursor.getFullYear(),
          monthCursor.getMonth(),
          rule.weekday,
          rule.weekdayOrdinal
        );
      } else {
        const day = rule.dayOfMonth || start.getDate();
        const candidate = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), day);
        occurrence = candidate.getMonth() === monthCursor.getMonth() ? candidate : null;
      }
      if (occurrence && occurrence >= start && occurrence <= hardEnd) {
        results.push(toIso(occurrence));
      }
      monthCursor = addMonths(monthCursor, interval);
    }
    return results;
  }

  // yearly
  let yearCursor = start.getFullYear();
  let guard = 0;
  while (guard < 200 && results.length < maxCount) {
    guard++;
    const month0 = (rule.month || start.getMonth() + 1) - 1;
    let occurrence: Date | null = null;
    if (rule.monthlyMode === 'weekday' && rule.weekday !== undefined && rule.weekdayOrdinal) {
      occurrence = nthWeekdayOfMonth(yearCursor, month0, rule.weekday, rule.weekdayOrdinal);
    } else {
      const day = rule.dayOfMonth || start.getDate();
      const candidate = new Date(yearCursor, month0, day);
      occurrence = candidate.getMonth() === month0 ? candidate : null;
    }
    if (occurrence && occurrence > hardEnd) break;
    if (occurrence && occurrence >= start) {
      results.push(toIso(occurrence));
    }
    yearCursor += interval;
  }
  return results;
}

/** Menschenlesbare Zusammenfassung einer Wiederholungsregel fürs UI. */
export function describeRecurrence(rule: RecurrenceRule): string {
  const interval = Math.max(1, rule.interval || 1);
  let base = '';

  if (rule.frequency === 'daily') {
    base = interval === 1 ? 'Täglich' : `Alle ${interval} Tage`;
  } else if (rule.frequency === 'weekly') {
    const days = (rule.weekdays || []).map((d) => WEEKDAY_LABELS[d]).join(', ') || '—';
    base = interval === 1 ? `Wöchentlich (${days})` : `Alle ${interval} Wochen (${days})`;
  } else if (rule.frequency === 'monthly') {
    const monthly =
      rule.monthlyMode === 'weekday' && rule.weekday !== undefined && rule.weekdayOrdinal
        ? `${ORDINAL_LABELS[rule.weekdayOrdinal] || rule.weekdayOrdinal + '.'} ${WEEKDAY_LABELS_LONG[rule.weekday]}`
        : `Tag ${rule.dayOfMonth || '?'}`;
    base =
      interval === 1
        ? `Monatlich (jeden ${monthly} im Monat)`
        : `Alle ${interval} Monate (${monthly})`;
  } else {
    const monthLabel = MONTH_LABELS[(rule.month || 1) - 1];
    const yearly =
      rule.monthlyMode === 'weekday' && rule.weekday !== undefined && rule.weekdayOrdinal
        ? `${ORDINAL_LABELS[rule.weekdayOrdinal] || rule.weekdayOrdinal + '.'} ${WEEKDAY_LABELS_LONG[rule.weekday]} im ${monthLabel}`
        : `${rule.dayOfMonth || '?'}. ${monthLabel}`;
    base = interval === 1 ? `Jährlich am ${yearly}` : `Alle ${interval} Jahre am ${yearly}`;
  }

  if (rule.endMode === 'onDate' && rule.endDate) {
    base += ` bis ${rule.endDate.split('-').reverse().join('.')}`;
  } else if (rule.endMode === 'afterCount' && rule.count) {
    base += `, ${rule.count}× `;
  }
  return base;
}
