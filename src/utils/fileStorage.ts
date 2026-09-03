/**
 * Dateien für die Ablage in Firestore vorbereiten.
 *
 * Hintergrund: Belege liegen als Base64 direkt im Datenbank-Dokument.
 * Firestore erlaubt je Dokument höchstens 1 MiB, und Base64 vergrößert eine
 * Datei um ein Drittel. Ein normales Handyfoto (3–8 MB) sprengt das um ein
 * Vielfaches — der Schreibvorgang scheiterte bisher stillschweigend, während
 * die App den Beleg als gespeichert anzeigte.
 *
 * Bilder werden deshalb vor dem Speichern verkleinert. Ein Kassenbon oder eine
 * Rechnung bleibt dabei gut lesbar, landet aber bei rund 100–300 KB.
 */

/** Obergrenze der gespeicherten Rohdaten. Mit Base64 bleibt genug Luft unter 1 MiB. */
export const MAX_STORED_BYTES = 700 * 1024;

/**
 * Längste Bildkante nach dem Verkleinern.
 *
 * 2400 px liegen deutlich über dem, was ein Dokumentenscanner mit 300 dpi
 * für eine A4-Seite liefert. Kleingedrucktes bleibt dadurch auch bei
 * dichteren Vorlagen (Verträge, mehrspaltige Rechnungen) scharf.
 */
const MAX_EDGE = 2400;

export interface PreparedFile {
  dataUrl: string;
  /** Größe der gespeicherten Daten in Bytes */
  bytes: number;
  originalBytes: number;
  wasCompressed: boolean;
  mimeType: string;
}

export type PrepareResult =
  | { ok: true; file: PreparedFile }
  | { ok: false; error: string };

const readAsDataUrl = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.readAsDataURL(file);
  });

/** Ungefähre Bytegröße der Rohdaten hinter einer Data-URL. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((base64.length * 3) / 4);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild konnte nicht gelesen werden.'));
    img.src = dataUrl;
  });
}

async function compressImage(file: File): Promise<PreparedFile> {
  const original = await readAsDataUrl(file);
  const img = await loadImage(original);

  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung im Browser nicht verfügbar.');
  // Weißer Grund, damit transparente PNGs nicht schwarz werden
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Hoch ansetzen und nur so weit senken, wie es die Größengrenze verlangt.
  // In kleinen Schritten, damit nicht unnötig Qualität verschenkt wird.
  let quality = 0.92;
  let out = canvas.toDataURL('image/jpeg', quality);
  while (dataUrlBytes(out) > MAX_STORED_BYTES && quality > 0.45) {
    quality -= 0.06;
    out = canvas.toDataURL('image/jpeg', quality);
  }

  // Reicht das nicht, lieber die Auflösung senken als die Qualität weiter:
  // Artefakte zerstören feine Schrift stärker als eine etwas kleinere Kante.
  if (dataUrlBytes(out) > MAX_STORED_BYTES) {
    const smaller = document.createElement('canvas');
    smaller.width = Math.round(canvas.width * 0.7);
    smaller.height = Math.round(canvas.height * 0.7);
    const sctx = smaller.getContext('2d');
    if (sctx) {
      sctx.fillStyle = '#ffffff';
      sctx.fillRect(0, 0, smaller.width, smaller.height);
      sctx.drawImage(canvas, 0, 0, smaller.width, smaller.height);
      out = smaller.toDataURL('image/jpeg', 0.85);
    }
  }

  return {
    dataUrl: out,
    bytes: dataUrlBytes(out),
    originalBytes: file.size,
    wasCompressed: true,
    mimeType: 'image/jpeg',
  };
}

/**
 * Bereitet eine Datei vor. Bilder werden verkleinert, alles andere
 * unverändert übernommen - aber nur, wenn es in ein Dokument passt.
 */
export async function prepareFileForStorage(file: File): Promise<PrepareResult> {
  try {
    if (file.type.startsWith('image/')) {
      const prepared = await compressImage(file);
      if (prepared.bytes > MAX_STORED_BYTES) {
        return {
          ok: false,
          error:
            'Dieses Bild lässt sich nicht ausreichend verkleinern. Bitte einen Ausschnitt oder ein einfacheres Foto verwenden.',
        };
      }
      return { ok: true, file: prepared };
    }

    if (file.size > MAX_STORED_BYTES) {
      return {
        ok: false,
        error: `Diese Datei ist mit ${formatBytes(file.size)} zu groß (höchstens ${formatBytes(
          MAX_STORED_BYTES
        )}). PDFs lassen sich mit „Verkleinern" bzw. „Reduce File Size" verkleinern; ein Foto der Rechnung wird automatisch komprimiert.`,
      };
    }

    const dataUrl = await readAsDataUrl(file);
    return {
      ok: true,
      file: {
        dataUrl,
        bytes: file.size,
        originalBytes: file.size,
        wasCompressed: false,
        mimeType: file.type,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Die Datei konnte nicht verarbeitet werden.' };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
