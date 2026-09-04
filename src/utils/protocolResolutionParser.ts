/**
 * Erkennt mehrere Beschlüsse in einem eingefügten Sitzungsprotokoll-Text -
 * rein textbasiert per festem Format, KEIN KI-Aufruf, läuft komplett im
 * Browser. Ersetzt die frühere Anthropic-API-Anbindung (api/protocolScan.ts,
 * inzwischen entfernt): der Vorstand trainiert Teams Copilot darauf, jeden
 * Beschluss im Protokoll in diesem festen Format auszugeben, wir müssen ihn
 * dann nur noch zuverlässig herausparsen.
 *
 * ERWARTETES FORMAT (ein Block pro Beschluss, durch eine "BESCHLUSS"-Zeile
 * eingeleitet, Reihenfolge der Felder egal, "Betrag"/"Kategorie" optional):
 *
 *   BESCHLUSS 1
 *   Titel: Freigabe Budget Sommerfest 2026
 *   Text: Der Vorstand beschließt die Bereitstellung eines Budgets von
 *   2.500 € für die Durchführung des Sommerfests.
 *   Betrag: 2500
 *   Kategorie: Veranstaltungen & Projekte
 *
 *   BESCHLUSS 2
 *   Titel: ...
 *   Text: ...
 *
 * "Kategorie" muss exakt (Groß-/Kleinschreibung egal) einer der sieben in
 * der App verwendeten Kategorien entsprechen (RESOLUTION_CATEGORIES unten),
 * sonst bleibt sie leer und kann im Review-Modal von Hand gesetzt werden.
 */

import { ResolutionCategory } from '../types';

export interface ScannedResolutionCandidate {
  title: string;
  motionText: string;
  requestedBudget?: number;
  category?: ResolutionCategory;
}

export const RESOLUTION_CATEGORIES: ResolutionCategory[] = [
  'Finanzen & Budget',
  'Veranstaltungen & Projekte',
  'Marketing & PR',
  'Satzung & Verband',
  'Kooperationen & Sponsoring',
  'Mitglieder & Ehrungen',
  'Sonstiges',
];

function parseBudget(raw: string): number | undefined {
  const cleaned = raw.replace(/[€\s]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return !isNaN(parsed) && parsed > 0 ? parsed : undefined;
}

function matchCategory(raw: string): ResolutionCategory | undefined {
  const trimmed = raw.trim().toLowerCase();
  return RESOLUTION_CATEGORIES.find((c) => c.toLowerCase() === trimmed);
}

export function parseResolutionsFromProtocolText(rawText: string): ScannedResolutionCandidate[] {
  const text = (rawText || '').replace(/\r\n/g, '\n');

  // Text an jeder "BESCHLUSS"-Kopfzeile aufteilen (z.B. "BESCHLUSS", "Beschluss 1",
  // "BESCHLUSS: Titel" - der Rest der Zeile wird ignoriert, nur die Felder darunter zählen).
  const headerPattern = /^\s*beschluss\b.*$/gim;
  const starts: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerPattern.exec(text)) !== null) {
    starts.push(m.index);
  }

  if (starts.length === 0) return [];

  const blocks = starts.map((start, i) => text.slice(start, starts[i + 1] ?? text.length));

  const candidates: ScannedResolutionCandidate[] = [];
  for (const block of blocks) {
    const titleMatch = block.match(/^\s*titel\s*:\s*([^\n]+)/im);
    const textMatch = block.match(
      /^\s*text\s*:\s*([\s\S]*?)(?=\n\s*(?:betrag|kategorie)\s*:|$)/im
    );
    const budgetMatch = block.match(/^\s*betrag\s*:\s*([\d.,]+)/im);
    const categoryMatch = block.match(/^\s*kategorie\s*:\s*([^\n]+)/im);

    const title = titleMatch?.[1]?.trim() || '';
    const motionText = textMatch?.[1]?.trim().replace(/\s+\n/g, '\n') || '';
    if (!title || !motionText) continue;

    candidates.push({
      title,
      motionText,
      requestedBudget: budgetMatch ? parseBudget(budgetMatch[1]) : undefined,
      category: categoryMatch ? matchCategory(categoryMatch[1]) : undefined,
    });
  }

  return candidates;
}
