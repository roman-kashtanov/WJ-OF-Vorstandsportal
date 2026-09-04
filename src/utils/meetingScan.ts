/**
 * Ruft die KI-Beschlusserkennung fuer ein Sitzungsprotokoll auf
 * (api/protocolScan.ts). Liefert nur Vorschlaege - das Anlegen echter
 * Beschluesse passiert erst nach Bestaetigung im ProtocolScanResultsModal.
 */
export interface ScannedResolutionCandidate {
  title: string;
  motionText: string;
  requestedBudget?: number;
  category?: string;
}

export async function scanMeetingProtocol(input: {
  meetingId: string;
  fileDataUrl: string;
}): Promise<{ ok: true; candidates: ScannedResolutionCandidate[] } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/meeting/scan-protocol', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error || 'Das Protokoll konnte nicht analysiert werden.' };
    }
    return { ok: true, candidates: data?.candidates || [] };
  } catch {
    return { ok: false, error: 'Verbindung fehlgeschlagen. Bitte erneut versuchen.' };
  }
}
