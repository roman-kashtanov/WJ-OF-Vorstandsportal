import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';

/**
 * Anleitung "Als App installieren" - gemeinsam genutzt von der Seite
 * /passwort (nach dem Festlegen) und dem Anmeldefenster. Zeigt zuerst das
 * erkannte Geraet, die anderen aufklappbar.
 */

export type DevicePlatform = 'ios' | 'android' | 'desktop';

export function detectPlatform(): DevicePlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Laeuft die Seite bereits als installierte App (vom Home-Bildschirm gestartet)? */
export function isRunningAsApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as any).standalone === true
  );
}

const GUIDES: Record<DevicePlatform, { title: string; steps: React.ReactNode[] }> = {
  ios: {
    title: 'iPhone / iPad',
    steps: [
      <>
        Diese Seite in <strong>Safari</strong> öffnen. Aus der Gmail- oder Outlook-App heraus zuerst
        „In Safari öffnen" wählen.
      </>,
      <>
        Unten auf das <strong>Teilen-Symbol</strong> tippen (Quadrat mit Pfeil nach oben).
      </>,
      <>
        Nach unten wischen und <strong>„Zum Home-Bildschirm"</strong> wählen.
      </>,
      <>
        Oben rechts <strong>„Hinzufügen"</strong> tippen – danach das Portal nur noch über das
        neue Symbol öffnen.
      </>,
    ],
  },
  android: {
    title: 'Android',
    steps: [
      <>
        Diese Seite in <strong>Chrome</strong> öffnen.
      </>,
      <>
        Oben rechts auf das <strong>Menü ⋮</strong> tippen.
      </>,
      <>
        <strong>„App installieren"</strong> bzw. „Zum Startbildschirm hinzufügen" wählen.
      </>,
    ],
  },
  desktop: {
    title: 'Computer',
    steps: [
      <>Nichts zu installieren – das Portal läuft direkt im Browser.</>,
      <>
        Tipp: als <strong>Lesezeichen</strong> speichern. In Chrome oder Edge geht zusätzlich
        „Installieren" rechts in der Adressleiste.
      </>,
    ],
  },
};

const PlatformSteps: React.FC<{ platform: DevicePlatform }> = ({ platform }) => {
  const guide = GUIDES[platform];
  const Icon = platform === 'desktop' ? Monitor : Smartphone;
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-800 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#003594]" strokeWidth={2} />
        {guide.title}
      </div>
      <ol className="space-y-1.5">
        {guide.steps.map((step, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-relaxed text-slate-600">
            <span className="w-5 h-5 shrink-0 rounded-full bg-[#003594] text-white text-[10px] font-bold flex items-center justify-center mt-px">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
};

export const InstallGuide: React.FC<{ platform?: DevicePlatform }> = ({ platform }) => {
  const current = platform || detectPlatform();
  const others = (['ios', 'android', 'desktop'] as DevicePlatform[]).filter((p) => p !== current);

  return (
    <div className="space-y-3 text-left">
      <PlatformSteps platform={current} />
      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-semibold text-slate-500">
          Anleitung für andere Geräte
        </summary>
        <div className="px-3 pb-3 space-y-3">
          {others.map((p) => (
            <PlatformSteps key={p} platform={p} />
          ))}
        </div>
      </details>
    </div>
  );
};
