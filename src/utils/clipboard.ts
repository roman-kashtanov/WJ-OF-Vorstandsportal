/**
 * Kopiert Text in die Zwischenablage, der erst noch geladen werden muss -
 * z. B. ein Link, den der Server erzeugt.
 *
 * Safari auf dem iPhone erlaubt das Kopieren nur unmittelbar nach einem Tipp.
 * Wartet man zuerst auf den Server und kopiert danach, lehnt Safari ab. Darum
 * startet der Kopiervorgang sofort und bekommt den Inhalt als Promise
 * (ClipboardItem) - der Browser wartet dann selbst auf den Text. Wo das nicht
 * geht, wird erst geladen und danach klassisch kopiert.
 *
 * Gibt `false` zurueck, wenn nicht kopiert werden konnte - der Aufrufer zeigt
 * den Text dann zum Markieren an.
 */
export async function copyPendingText(text: Promise<string>): Promise<boolean> {
  try {
    if (
      typeof ClipboardItem !== 'undefined' &&
      typeof navigator.clipboard?.write === 'function' &&
      window.isSecureContext
    ) {
      const blob = text.then((t) => new Blob([t], { type: 'text/plain' }));
      // Lehnt der Server ab, bricht der Kopiervorgang ab - der Aufrufer meldet
      // den Fehler selbst. Ohne diesen Fang meldete der Browser zusaetzlich
      // einen unbehandelten Fehler.
      blob.catch(() => {});
      const item = new ClipboardItem({ 'text/plain': blob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // unten klassisch versuchen
  }

  let value: string;
  try {
    value = await text;
  } catch {
    return false;
  }
  return copyText(value);
}

/** Kopiert vorhandenen Text - mit Rueckfall fuer Browser ohne Clipboard-API. */
export async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Rueckfall unten
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
