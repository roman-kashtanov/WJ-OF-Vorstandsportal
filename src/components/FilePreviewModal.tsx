import React from 'react';
import { X, Download } from 'lucide-react';

export interface PreviewableFile {
  name: string;
  dataUrl?: string;
  mimeType?: string;
}

interface Props {
  file: PreviewableFile | null;
  onClose: () => void;
}

/**
 * Bild-Vorschau als Overlay. Wird ausschliesslich fuer Bilder genutzt - PDFs
 * oeffnet der Aufrufer stattdessen direkt in einem neuen Tab (Browser haben
 * dafuer bereits eine eigene, bessere Ansicht), alles andere bleibt beim
 * klassischen Download. Ohne dieses Overlay gab es fuer Bilder gar keine
 * Moeglichkeit, sie anzusehen - nur ein erzwungener Download, der auf dem
 * Handy oft gar nicht sichtbar landet.
 */
export const FilePreviewModal: React.FC<Props> = ({ file, onClose }) => {
  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/') || file.dataUrl?.startsWith('data:image/');

  return (
    <div
      className="fixed inset-0 z-100 bg-slate-950/90 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {file.dataUrl && (
          <a
            href={file.dataUrl}
            download={file.name}
            onClick={(e) => e.stopPropagation()}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
            title="Herunterladen"
          >
            <Download className="w-5 h-5" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors cursor-pointer"
          title="Schließen"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {isImage && file.dataUrl ? (
        <img
          src={file.dataUrl}
          alt={file.name}
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-[85dvh] rounded-2xl shadow-2xl object-contain"
        />
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl p-6 max-w-sm text-center space-y-3"
        >
          <p className="text-sm font-semibold text-slate-800">{file.name}</p>
          {file.dataUrl ? (
            <>
              <p className="text-xs text-slate-500">Für diese Datei gibt es keine Vorschau.</p>
              <a
                href={file.dataUrl}
                download={file.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Herunterladen
              </a>
            </>
          ) : (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
              Diese Datei ist auf diesem Gerät gerade nicht verfügbar - vermutlich bestand keine
              Verbindung zur Vereinsdatenbank, als die Seite zuletzt geladen wurde. Bitte die
              Internetverbindung prüfen und die Seite neu laden.
            </p>
          )}
        </div>
      )}

      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-medium truncate max-w-[80%]">
        {file.name}
      </p>
    </div>
  );
};
