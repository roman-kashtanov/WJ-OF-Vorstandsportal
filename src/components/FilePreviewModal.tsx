import React, { useEffect, useRef, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { OverlayActionBar, OverlayIconButton } from './OverlayActionBar';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { saveDataUrl } from '../utils/fileHelpers';

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
 * oeffnet der Aufrufer stattdessen ueber openDataUrl (Browser haben dafuer
 * bereits eine eigene, bessere Ansicht), alles andere bleibt beim
 * Herunterladen.
 *
 * Zoomen ist selbst gebaut: Die App verbietet das Zoomen der ganzen Seite
 * (viewport `user-scalable=no`, damit sie sich wie eine App anfuehlt) - damit
 * waere auch in Belegfotos kein Hineinzoomen moeglich.
 */
export const FilePreviewModal: React.FC<Props> = ({ file, onClose }) => {
  // Ohne Sperre liess sich die Seite HINTER dem Bild weiterscrollen.
  useBodyScrollLock(!!file);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, onClose]);

  if (!file) return null;

  const isImage = file.mimeType?.startsWith('image/') || file.dataUrl?.startsWith('data:image/');

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (file.dataUrl) void saveDataUrl(file.dataUrl, file.name);
  };

  const actions = (
    <>
      {file.dataUrl && (
        <OverlayIconButton onClick={handleDownload} title="Herunterladen">
          <Download className="w-5 h-5" />
        </OverlayIconButton>
      )}
      <OverlayIconButton onClick={onClose} title="Schließen">
        <X className="w-5 h-5" />
      </OverlayIconButton>
    </>
  );

  return (
    <div className="fixed inset-0 z-100 bg-slate-950/90 animate-in fade-in duration-150 overscroll-contain">
      {isImage && file.dataUrl ? (
        <ZoomableImage key={file.dataUrl} src={file.dataUrl} alt={file.name} onClose={onClose} actions={actions} />
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-sm text-center space-y-3"
            >
              <p className="text-sm font-semibold text-slate-800">{file.name}</p>
              {file.dataUrl ? (
                <>
                  <p className="text-xs text-slate-500">Für diese Datei gibt es keine Vorschau.</p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003594] hover:bg-[#00266B] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Herunterladen
                  </button>
                </>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 leading-relaxed">
                  Diese Datei ist auf diesem Gerät gerade nicht verfügbar - vermutlich bestand keine
                  Verbindung zur Vereinsdatenbank, als die Seite zuletzt geladen wurde. Bitte die
                  Internetverbindung prüfen und die Seite neu laden.
                </p>
              )}
            </div>
          </div>
          <OverlayActionBar>{actions}</OverlayActionBar>
        </>
      )}
    </div>
  );
};

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** Bis zu dieser Fingerbewegung (px) gilt eine Beruehrung noch als Tipp. */
const TAP_SLOP = 8;

interface View {
  scale: number;
  x: number;
  y: number;
}

interface Gesture {
  view: View;
  /** Fingerabstand beim Start (nur beim Zwei-Finger-Zoom). */
  dist: number;
  /** Beim Zoom: Mittelpunkt relativ zur Bildmitte. Beim Verschieben: Startpunkt des Fingers. */
  px: number;
  py: number;
  moved: boolean;
  startedOnImage: boolean;
}

const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * Bild mit Zwei-Finger-Zoom, Doppeltippen, Mausrad und Verschieben.
 * Bewusst ohne Bibliothek - es sind nur Pointer-Events und eine CSS-Transformation.
 */
const ZoomableImage: React.FC<{
  src: string;
  alt: string;
  onClose: () => void;
  actions: React.ReactNode;
}> = ({ src, alt, onClose, actions }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [view, setViewState] = useState<View>(RESET);
  const viewRef = useRef<View>(RESET);
  const [isGesturing, setIsGesturing] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef(0);

  const setView = (next: View) => {
    viewRef.current = next;
    setViewState(next);
  };

  const center = () => {
    const r = containerRef.current!.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  /** Nicht weiter verschieben, als das vergroesserte Bild reicht. */
  const clampView = (scale: number, x: number, y: number): View => {
    if (scale <= 1.01) return RESET;
    const img = imgRef.current;
    const box = containerRef.current;
    if (!img || !box) return { scale, x, y };
    const maxX = Math.max(0, (img.offsetWidth * scale - box.clientWidth) / 2);
    const maxY = Math.max(0, (img.offsetHeight * scale - box.clientHeight) / 2);
    return {
      scale,
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  /** Zoomt so, dass der Punkt unter Finger/Maus an seiner Stelle bleibt. */
  const zoomAround = (nextScale: number, clientX: number, clientY: number) => {
    const { cx, cy } = center();
    const fx = clientX - cx;
    const fy = clientY - cy;
    const cur = viewRef.current;
    const s = Math.min(MAX_SCALE, Math.max(1, nextScale));
    setView(clampView(s, fx - (fx - cur.x) * (s / cur.scale), fy - (fy - cur.y) * (s / cur.scale)));
  };

  const startGesture = (startedOnImage: boolean, moved: boolean) => {
    const pts = [...pointers.current.values()];
    if (pts.length === 0) {
      gesture.current = null;
      return;
    }
    if (pts.length >= 2) {
      const [a, b] = pts;
      const { cx, cy } = center();
      gesture.current = {
        view: viewRef.current,
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        px: (a.x + b.x) / 2 - cx,
        py: (a.y + b.y) / 2 - cy,
        moved: true,
        startedOnImage,
      };
      return;
    }
    gesture.current = {
      view: viewRef.current,
      dist: 0,
      px: pts[0].x,
      py: pts[0].y,
      moved,
      startedOnImage,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    containerRef.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setIsGesturing(true);
    startGesture(
      pointers.current.size > 1 ? !!gesture.current?.startedOnImage : e.target === imgRef.current,
      pointers.current.size > 1
    );
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;

    const pts = [...pointers.current.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      const { cx, cy } = center();
      const s = Math.min(MAX_SCALE, Math.max(1, g.view.scale * (Math.hypot(a.x - b.x, a.y - b.y) / g.dist)));
      const midX = (a.x + b.x) / 2 - cx;
      const midY = (a.y + b.y) / 2 - cy;
      setView(
        clampView(s, midX - (g.px - g.view.x) * (s / g.view.scale), midY - (g.py - g.view.y) * (s / g.view.scale))
      );
      return;
    }

    const dx = e.clientX - g.px;
    const dy = e.clientY - g.py;
    if (Math.hypot(dx, dy) > TAP_SLOP) g.moved = true;
    if (viewRef.current.scale > 1) {
      setView(clampView(viewRef.current.scale, g.view.x + dx, g.view.y + dy));
    }
  };

  const handlePointerEnd = (e: React.PointerEvent, cancelled: boolean) => {
    const g = gesture.current;
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(e.pointerId);

    if (pointers.current.size > 0) {
      // Von zwei auf einen Finger: weiter verschieben, aber kein Tipp mehr.
      startGesture(!!g?.startedOnImage, true);
      return;
    }
    gesture.current = null;
    setIsGesturing(false);
    if (cancelled || !g || g.moved || !wasSingle) return;

    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      if (viewRef.current.scale > 1) setView(RESET);
      else zoomAround(DOUBLE_TAP_SCALE, e.clientX, e.clientY);
      return;
    }
    lastTap.current = now;

    // Ein Tipp NEBEN das (nicht vergroesserte) Bild schliesst die Vorschau.
    if (!g.startedOnImage && viewRef.current.scale === 1) onClose();
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Trackpad-Zoom am Mac kommt als Mausrad mit Strg - dort feiner dosiert.
    const factor = e.ctrlKey ? 0.01 : 0.0015;
    zoomAround(viewRef.current.scale * Math.exp(-e.deltaY * factor), e.clientX, e.clientY);
  };

  const isZoomed = view.scale > 1;

  return (
    <div className="absolute inset-0">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => handlePointerEnd(e, false)}
        onPointerCancel={(e) => handlePointerEnd(e, true)}
        onWheel={handleWheel}
        className={`absolute inset-0 flex items-center justify-center p-4 overflow-hidden touch-none select-none ${
          isZoomed ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            transition: isGesturing ? 'none' : 'transform 160ms ease-out',
          }}
          className="max-w-full max-h-[85dvh] rounded-2xl shadow-2xl object-contain will-change-transform"
        />
      </div>

      <OverlayActionBar>
        <OverlayIconButton
          onClick={() => {
            if (isZoomed) {
              setView(RESET);
            } else {
              const { cx, cy } = center();
              zoomAround(DOUBLE_TAP_SCALE, cx, cy);
            }
          }}
          title={isZoomed ? 'Verkleinern' : 'Vergrößern'}
        >
          {isZoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
        </OverlayIconButton>
        {actions}
      </OverlayActionBar>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[85%] text-center pointer-events-none">
        <p className="text-white/70 text-xs font-medium truncate">{alt}</p>
        {!isZoomed && (
          <p className="text-white/40 text-[11px] mt-0.5">Doppelt tippen oder mit zwei Fingern zoomen</p>
        )}
      </div>
    </div>
  );
};
