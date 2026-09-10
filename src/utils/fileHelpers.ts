import { ResolutionAttachment } from '../types';

export function getAttachmentType(fileName: string, mimeType?: string): ResolutionAttachment['type'] {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';

  if (ext === 'pdf' || mimeType?.includes('pdf')) {
    return 'pdf';
  }
  if (['xlsx', 'xls', 'csv', 'ods'].includes(ext) || mimeType?.includes('sheet') || mimeType?.includes('excel') || mimeType?.includes('csv')) {
    return 'excel';
  }
  if (['docx', 'doc', 'odt', 'rtf'].includes(ext) || mimeType?.includes('word') || mimeType?.includes('document')) {
    return 'word';
  }
  if (['pptx', 'ppt', 'odp'].includes(ext) || mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) {
    return 'powerpoint';
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'webp', 'gif'].includes(ext) || mimeType?.startsWith('image/')) {
    return 'image';
  }
  return 'other';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Data-URL -> Blob, bewusst SYNCHRON (kein `fetch(dataUrl)`): Das Teilen-Menue
 * auf dem iPhone darf nur direkt aus einem Tipp heraus geoeffnet werden. Jede
 * asynchrone Zwischenstufe kann diese "Tipp-Berechtigung" kosten.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const head = dataUrl.slice(5, comma); // ohne "data:"
  const body = dataUrl.slice(comma + 1);
  const mime = head.split(';')[0] || 'application/octet-stream';

  if (!/;base64/i.test(head)) {
    return new Blob([decodeURIComponent(body)], { type: mime });
  }
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** iPhone/iPad (iPadOS meldet sich als "Mac", hat aber Touch). */
export function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export type SaveFileResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Zentrale Stelle zum Speichern einer Datei - ALLE Downloads der App laufen hier durch.
 *
 * Warum nicht einfach `<a download>`: In der auf dem iPhone installierten App
 * (Home-Bildschirm) funktioniert ein Download-Link nicht zuverlaessig. Bei
 * Data-URLs "blinkte" die App nur kurz, und danach blieben auch alle weiteren
 * Downloads (z. B. die SEPA-Datei) haengen, bis die App neu gestartet wurde.
 * Zusaetzlich wurde die Blob-Adresse bisher sofort nach dem Klick wieder
 * freigegeben - Safari startet den Download aber erst danach und fand dann
 * nichts mehr vor.
 *
 * Deshalb: auf iPhone/iPad das Teilen-Menue des Systems ("In Dateien
 * sichern", "Bild sichern", AirDrop ...). Ueberall sonst ein normaler
 * Download, dessen Adresse erst nach einer Minute freigegeben wird.
 */
export async function saveFile(blob: Blob, fileName: string): Promise<SaveFileResult> {
  if (isAppleMobile() && typeof navigator.canShare === 'function') {
    const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return 'shared';
      } catch (err: any) {
        if (err?.name === 'AbortError') return 'cancelled';
        // NotAllowedError (kein frischer Tipp mehr, z. B. nach laengerer
        // PDF-Erzeugung) oder InvalidStateError (voriges Teilen haengt):
        // nicht erneut teilen, sondern auf den normalen Download ausweichen.
        if (err?.name === 'NotAllowedError') return 'failed';
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

export function downloadBlob(blob: Blob, fileName: string): void {
  void saveFile(blob, fileName);
}

/** Speichert eine hinterlegte Datei (Data-URL) oder oeffnet eine externe Adresse. */
export function saveDataUrl(dataUrl: string, fileName: string): Promise<SaveFileResult> {
  if (!dataUrl.startsWith('data:')) {
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
    return Promise.resolve('downloaded');
  }
  return saveFile(dataUrlToBlob(dataUrl), fileName);
}

/**
 * Oeffnet eine hinterlegte Datei (v. a. PDFs) zum Ansehen.
 *
 * Frueher `window.open(dataUrl)`: Browser blockieren das Oeffnen von
 * Data-URLs in einem neuen Fenster inzwischen, und in der iPhone-App fuehrte
 * es zum selben Haengen wie beim Download. Am Computer wird die Datei jetzt
 * als Blob in einem neuen Tab geoeffnet; auf iPhone/iPad oeffnet sich das
 * Teilen-Menue mit Vorschau.
 */
export function openDataUrl(dataUrl: string, fileName: string): void {
  if (!dataUrl.startsWith('data:')) {
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
    return;
  }
  const blob = dataUrlToBlob(dataUrl);
  if (isAppleMobile()) {
    void saveFile(blob, fileName);
    return;
  }
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // Popup blockiert - dann eben als Download.
    URL.revokeObjectURL(url);
    void saveFile(blob, fileName);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 5 * 60_000);
}

export function downloadAttachment(attachment: ResolutionAttachment) {
  if (!attachment.dataUrl) {
    // Generate dummy downloadable file if no base64 content
    const blob = new Blob([`Inhalt des Dokuments: ${attachment.name}`], { type: 'text/plain' });
    void saveFile(blob, attachment.name);
    return;
  }
  void saveDataUrl(attachment.dataUrl, attachment.name);
}
