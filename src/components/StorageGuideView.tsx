import React from 'react';
import { 
  Cloud, 
  ShieldCheck, 
  CheckCircle2, 
  HardDrive, 
  Lock, 
  Zap, 
  Server, 
  ExternalLink, 
  ArrowRight,
  Database,
  FileCheck,
  Building2,
  FolderOpen
} from 'lucide-react';

export const StorageGuideView: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003594] via-[#00266B] to-[#0A1E42] rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#00A3E0]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[#00A3E0] text-xs font-bold uppercase tracking-wider mb-2">
            <Cloud className="w-4 h-4" />
            <span>Empfehlung & Speicher-Architektur</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kostenlose Speicherlösungen für Rechnungsbelege
          </h2>
          <p className="text-sm sm:text-base text-slate-300 mt-2 max-w-3xl leading-relaxed">
            Hier ist die Übersicht und Empfehlung, womit du die Web-Anwendung für die <strong>Wirtschaftsjunioren Offenbach</strong> verbinden kannst, um Belege, Rechnungsfotos (JPG/PNG) und PDFs dauerhaft & kostenlos zu speichern.
          </p>
        </div>
      </div>

      {/* Top Quick Summary Box */}
      <div className="bg-emerald-50 border-2 border-emerald-300/80 rounded-2xl p-6 shadow-xs">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-emerald-950">
              Direkte Empfehlung: Firebase Cloud Storage (Google Cloud) mit Standort Frankfurt
            </h3>
            <p className="text-xs sm:text-sm text-emerald-900 mt-1 leading-relaxed">
              Für die Wirtschaftsjunioren ist <strong>Firebase Storage</strong> im kostenlosen Spark-Plan (Free Tier) die beste Wahl:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs font-medium text-emerald-900">
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold block text-sm text-emerald-950">5 GB dauerhaft gratis</span>
                Ausreichend für ca. <strong>10.000 bis 15.000 komprimierte Belegfotos & PDFs</strong>.
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold block text-sm text-emerald-950">100% DSGVO-konform</span>
                Serverstandort Frankfurt (<code>europe-west3</code>) wählbar für Vereinsdaten.
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-emerald-200">
                <span className="font-bold block text-sm text-emerald-950">Rechtematrix für Vorstand</span>
                Nur verifizierte Vorstandsmitglieder können Rechnungsdateien einsehen und herunterladen.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Grid of Free Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-[#003594]" />
          <span>Vergleich der 4 besten kostenlosen Cloud-Speicher</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Firebase Storage */}
          <div className="bg-white rounded-2xl border-2 border-[#003594] p-5 shadow-xs relative">
            <div
              className="absolute z-10"
              style={{
                top: 'max(1rem, env(safe-area-inset-top))',
                right: 'max(1rem, env(safe-area-inset-right))',
              }}
            >
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#003594]">
                Empfehlung #1
              </span>
            </div>
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#003594] flex items-center justify-center font-bold">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Firebase Storage</h4>
                <p className="text-xs text-slate-500">Google Cloud Plattform</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 mt-3">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>5 GB Speicherplatz</strong> im kostenlosen Kontingent</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1 GB Download-Traffic pro Tag (mehr als genug für Belegprüfung)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Sicherheitsregeln für Vorstandsrollen direkt integrierbar</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Keine Kreditkarte für das Basiskontingent nötig</span>
              </li>
            </ul>
          </div>

          {/* 2. Supabase Storage */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Supabase Storage</h4>
                <p className="text-xs text-slate-500">Open-Source Firebase Alternative</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 mt-3">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>1 GB Speicherplatz</strong> dauerhaft kostenlos</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>2 GB Datentransfer / Monat</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>S3-kompatible API und PostgreSQL-Datenbank</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Rechenzentrum in Frankfurt (AWS eu-central-1)</span>
              </li>
            </ul>
          </div>

          {/* 3. Cloudinary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">Cloudinary</h4>
                <p className="text-xs text-slate-500">Spezialisiert auf Medien & Beleg-Bilder</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 mt-3">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>25 GB kostenloses Kontingent</strong> monatlich</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Automatische Bildkomprimierung (z.B. 8MB Smartphone-Foto wird auf 200KB optimiert)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Schnelle Thumbnail-Generierung</span>
              </li>
            </ul>
          </div>

          {/* 4. Lokaler / App-interner Speicher (Sofort aktiv) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">In-App Offline & IndexedDB</h4>
                <p className="text-xs text-slate-500">In dieser Web-App bereits integriert</p>
              </div>
            </div>

            <ul className="space-y-2 text-xs text-slate-700 mt-3">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>Keine Registrierung oder API-Schlüssel nötig</strong></span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Belegfotos werden als Base64 / Blobs sofort gespeichert</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>1-Click CSV-Export & Beleg-Download für Kassenprüfer</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step-by-Step Guide for Connecting Firebase Storage */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4">
        <h3 className="text-lg sm:text-xl font-bold flex items-center space-x-2">
          <Zap className="w-5 h-5 text-[#00A3E0]" />
          <span>Wie du Firebase Storage in 3 Schritten anbindest</span>
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300 pt-2">
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="w-6 h-6 rounded-full bg-[#00A3E0] text-slate-950 font-bold flex items-center justify-center text-xs mb-2">
              1
            </span>
            <h5 className="font-bold text-white text-sm">Firebase Projekt anlegen</h5>
            <p className="mt-1">
              Auf <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-[#00A3E0] underline">console.firebase.google.com</a> kostenlos ein Projekt "WJ-Offenbach-Vorstand" erstellen und Region <strong>europe-west3 (Frankfurt)</strong> wählen.
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="w-6 h-6 rounded-full bg-[#00A3E0] text-slate-950 font-bold flex items-center justify-center text-xs mb-2">
              2
            </span>
            <h5 className="font-bold text-white text-sm">Storage aktivieren</h5>
            <p className="mt-1">
              Im Firebase-Menü auf <strong>Storage → Get Started</strong> klicken. Es wird ein Cloud-Bucket bereitgestellt (5 GB im Spark-Plan kostenfrei).
            </p>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <span className="w-6 h-6 rounded-full bg-[#00A3E0] text-slate-950 font-bold flex items-center justify-center text-xs mb-2">
              3
            </span>
            <h5 className="font-bold text-white text-sm">Sicherheitsregeln setzen</h5>
            <p className="mt-1">
              Zugriffsberechtigung so konfigurieren, dass nur angemeldete Vorstände Rechnungsdateien lesen und hochladen dürfen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
