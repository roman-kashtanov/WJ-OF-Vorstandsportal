import { FirestoreAdmin } from './firestoreAdmin';
import { getServerConfig } from './config';

/**
 * Erkennt Beschlüsse in einem hochgeladenen Sitzungsprotokoll (PDF/Bild)
 * per KI (Anthropic Messages API, natives Dokumentverständnis - keine
 * separate Text-/OCR-Extraktion nötig). Liefert nur VORSCHLÄGE zurück,
 * legt nie selbst Beschlüsse an - der Vorstand bestätigt/bearbeitet/
 * verwirft jeden einzeln (ProtocolScanResultsModal.tsx), bevor über die
 * ganz normale handleCreateResolution() ein echter Beschluss entsteht.
 *
 * Nur aus der authentifizierten App heraus genutzt (kein öffentliches
 * Formular) - trotzdem über denselben Router wie die übrigen /api/*-
 * Endpunkte erreichbar. Die meetingId-Existenzprüfung ist die einzige
 * Missbrauchsbremse, analog zu handleRequestInvoiceAttachmentLink.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface ProtocolResolutionCandidate {
  title: string;
  motionText: string;
  requestedBudget?: number;
  category?: string;
}

export interface ScanProtocolInput {
  meetingId: string;
  fileDataUrl: string;
}

function dataUrlToBase64(dataUrl: string): { base64: string; mimeType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) throw new Error('invalid data url');
  return { mimeType: match[1], base64: match[2] };
}

/** Wirft, wenn die Antwort kein lesbares JSON-Array ist - unterscheidet
 * "leere, aber gueltige Liste" (keine Beschluesse gefunden) von "die
 * Antwort war unbrauchbar" (echter Fehler). */
function parseCandidates(rawText: string): ProtocolResolutionCandidate[] {
  const cleaned = rawText
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('not an array');
  return parsed
    .filter((c: any) => c && typeof c.title === 'string' && typeof c.motionText === 'string')
    .map((c: any) => ({
      title: String(c.title).trim(),
      motionText: String(c.motionText).trim(),
      requestedBudget: typeof c.requestedBudget === 'number' ? c.requestedBudget : undefined,
      category: typeof c.category === 'string' ? c.category : undefined,
    }));
}

const SCAN_PROMPT = `Du bekommst das Protokoll einer Vorstandssitzung. Finde alle darin enthaltenen Beschlüsse (offizielle Entscheidungen des Vorstands, oft erkennbar an Formulierungen wie "Der Vorstand beschließt...", "Beschluss:", einem klaren Abstimmungsergebnis o.ä.). Reine Diskussionspunkte oder Berichte ohne Beschlussfassung zählen nicht.

Antworte AUSSCHLIESSLICH mit einem JSON-Array, keine Erklärung davor oder danach, kein Codeblock. Jedes Element:
{
  "title": "Kurzer, prägnanter Titel des Beschlusses",
  "motionText": "Der vollständige Beschlusswortlaut, beginnend mit \\"Der Vorstand beschließt...\\"",
  "requestedBudget": 0,
  "category": "Eine von: Finanzen & Budget, Veranstaltungen & Projekte, Marketing & PR, Satzung & Verband, Kooperationen & Sponsoring, Mitglieder & Ehrungen, Sonstiges"
}
"requestedBudget" nur angeben, wenn im Beschluss ein konkreter Euro-Betrag genannt wird, sonst das Feld ganz weglassen. Falls keine Beschlüsse gefunden werden, antworte mit [].`;

export async function handleScanProtocol(
  input: ScanProtocolInput
): Promise<{ status: number; body: any }> {
  const config = getServerConfig();
  if (!config.anthropicApiKey) {
    return {
      status: 500,
      body: { error: 'Die KI-Erkennung ist auf dem Server nicht eingerichtet (ANTHROPIC_API_KEY fehlt).' },
    };
  }
  if (!FirestoreAdmin.isConfigured()) {
    return { status: 500, body: { error: 'Der Server ist nicht eingerichtet.' } };
  }

  const meetingId = (input?.meetingId || '').trim();
  if (!meetingId) {
    return { status: 400, body: { error: 'meetingId wird benötigt.' } };
  }

  let base64: string, mimeType: string;
  try {
    ({ base64, mimeType } = dataUrlToBase64(input.fileDataUrl));
  } catch {
    return { status: 400, body: { error: 'Die Datei konnte nicht gelesen werden.' } };
  }

  try {
    const meeting = await FirestoreAdmin.getDocument(`meetings/${meetingId}`);
    if (!meeting) {
      return { status: 404, body: { error: 'Dieser Termin existiert nicht mehr.' } };
    }

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.anthropicModel,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64 } },
              { type: 'text', text: SCAN_PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        status: 502,
        body: {
          error: `Die KI-Erkennung ist fehlgeschlagen (${response.status}): ${errText.slice(0, 300) || 'Unbekannter Fehler'}`,
        },
      };
    }

    const data = await response.json();
    const rawText: string = data?.content?.find((c: any) => c.type === 'text')?.text || '';

    let candidates: ProtocolResolutionCandidate[];
    try {
      candidates = parseCandidates(rawText);
    } catch {
      return {
        status: 502,
        body: { error: 'Die Antwort der KI konnte nicht gelesen werden. Bitte erneut versuchen.' },
      };
    }

    return { status: 200, body: { ok: true, candidates } };
  } catch (err: any) {
    return {
      status: 500,
      body: { error: err?.message || 'Das Protokoll konnte nicht analysiert werden.' },
    };
  }
}
