/**
 * Versionsverlauf des Portals - EINE Quelle für beides:
 * - die Anzeige in der App (Einstellungen → System, und ein Klick auf die
 *   Versionsnummer in der Fußzeile),
 * - die Datei CHANGELOG.md im Projekt (`npm run changelog` erzeugt sie neu).
 *
 * **Bei jeder neuen Version hier oben einen Eintrag ergänzen** (neueste
 * zuerst) und danach `npm run changelog` ausführen.
 *
 * Bewusst in der Sprache des Vorstands, nicht in Entwickler-Sprache: Was
 * ändert sich in der Bedienung? Technische Einzelheiten stehen in CLAUDE.md.
 *
 * `date` ist optional - für die Zeit vor v3.25.0 wurde das Datum nicht
 * mitgeführt und wird bewusst nicht nachträglich erfunden.
 */

export interface ChangelogEntry {
  version: string;
  /** Tag der Fertigstellung, Format TT.MM.JJJJ */
  date?: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '4.1.0',
    date: '16.09.2026',
    title: 'Wischen im ganzen Bereich und in den Einstellungen',
    changes: [
      'Der Reiterwechsel per Wischen reagiert jetzt im gesamten Inhaltsbereich – auch dort, wo unter der Liste nichts mehr steht.',
      'Auch in den Einstellungen lassen sich die Reiter durch Wischen wechseln.',
      'Auf Eingabefeldern und in waagerecht scrollbaren Leisten bleibt das Wischen bewusst aus, damit Tippen und Scrollen nicht gestört werden.',
    ],
  },
  {
    version: '4.0.0',
    date: '16.09.2026',
    title: 'Versionsverlauf in der App',
    changes: [
      'Neu: Unter Einstellungen → System steht jetzt der komplette Versionsverlauf – was in welcher Version dazugekommen ist.',
      'Ein Klick auf die Versionsnummer in der Fußzeile öffnet denselben Verlauf, ohne Code-Eingabe.',
      'Der Verlauf wird zusätzlich als Datei CHANGELOG.md im Projekt mitgeführt.',
      'Sprung auf Version 4: Das Portal ist seit Version 3 deutlich gewachsen (Zuschüsse, Auslagen, Belege, Sitzungen, automatische E-Mails).',
    ],
  },
  {
    version: '3.32.0',
    date: '16.09.2026',
    title: 'E-Mails an den Vorstand einzeln einstellbar',
    changes: [
      'Einstellungen → Benachrichtigungen: je Vorstandsmitglied und je Ereignis festlegen, wer eine E-Mail bekommt.',
      'Ereignisse: neuer Zuschuss-Antrag, neue Auslagenerstattung, neuer Beleg, nachgereichter Nachweis.',
      'Belege und nachgereichte Nachweise lösen überhaupt erstmals eine E-Mail aus.',
      'Ohne Auswahl bleibt es beim bisherigen Verhalten (Zuschuss und Auslage an die hinterlegte Admin-Adresse).',
    ],
  },
  {
    version: '3.31.0',
    date: '16.09.2026',
    title: 'Bestätigungsmails und automatische Erinnerungen',
    changes: [
      'Wer einen Zuschuss oder eine Auslage einreicht, bekommt eine Bestätigung mit allen Daten – erst, wenn der Vorgang wirklich angekommen ist.',
      'Beim Zuschuss ist immer der persönliche Link dabei: Er zeigt jederzeit, welche Unterlagen vorliegen.',
      'Automatische Erinnerung am Veranstaltungstag um 20 Uhr und eine Woche danach, solange ein Nachweis fehlt.',
      'Liegt die Veranstaltung in der Vergangenheit, müssen beide Nachweise direkt mit eingereicht werden.',
      'Behoben: Das Löschen einer Nachweisdatei setzt den Status wieder auf „Offen" – vorher meldete der Link fälschlich „liegt bereits vor".',
    ],
  },
  {
    version: '3.30.0',
    date: '15.09.2026',
    title: 'Freie Zuschuss-Kategorien, überarbeitete Beleganfrage',
    changes: [
      'Kategorien der Zuschüsse lassen sich umbenennen, neu anlegen, sortieren und entfernen – je Kategorie mit eigener Grenze.',
      'Je Kategorie einstellbar, ob eine Veranstaltung nur einmal je Person bezuschusst wird.',
      '„Belege anfragen" startet direkt mit dem Standardtext; Vorlagen holt ein eigener Knopf.',
      'Jede E-Mail lässt sich als Vorlage speichern; Empfänger sind Vorstandsmitglieder und beliebige Adressen, jede bekommt eine eigene Mail.',
      'Einstellungen → Vorlagen: Vorlagen zentral anlegen, bearbeiten und löschen.',
    ],
  },
  {
    version: '3.29.0',
    date: '15.09.2026',
    title: 'Einstellungen → Zuschüsse',
    changes: [
      'Grenzen (Gesamtbudget, je Person, je Kategorie) und der Veranstaltungskatalog stehen jetzt in den Einstellungen.',
      'Veranstaltungen aus bisherigen Anträgen lassen sich per Tipp in den Katalog übernehmen.',
      'Das frühere Fenster „Katalog & Obergrenzen" entfällt; der Knopf „Katalog" führt in die Einstellungen.',
    ],
  },
  {
    version: '3.28.0',
    date: '15.09.2026',
    title: 'Öffentlicher Beleg-Link und „Belege anfragen"',
    changes: [
      'Neuer Link, über den jemand einen Beleg einreichen kann – ohne Beschluss und ohne Anmeldung.',
      'Eingereichte Belege landen unter Belege → Offen, mit Mitteilung im Portal.',
      '„Belege anfragen" verschickt diesen Link mit anpassbarem Text und Vorlagen.',
    ],
  },
  {
    version: '3.27.0',
    date: '15.09.2026',
    title: 'Belege: Offen und Archiv',
    changes: [
      'Belege haben nur noch zwei Reiter: Offen und Archiv.',
      'Ein Beleg wandert ins Archiv, sobald er einem Beschluss zugeordnet oder in der Buchhaltung erledigt ist.',
      'Das Archiv ist ein aufklappbarer Baum nach Jahr, Kategorie und mit/ohne Beschluss.',
      'Übersicht: neues Modul „Belege" mit der Zahl offener Belege.',
    ],
  },
  {
    version: '3.26.0',
    date: '15.09.2026',
    title: 'Belege wie die anderen Bereiche aufgebaut',
    changes: [
      'Der Belege-Bereich sieht aus und funktioniert wie Beschlüsse und Zuschüsse: Reiter, Filter, aufklappbare Karten.',
      'Beschluss, Ordner, Jahr und Monat sind jetzt Filter statt eigener Leisten.',
    ],
  },
  {
    version: '3.25.0',
    date: '14.09.2026',
    title: 'Reiter per Wischen, Budget-Leiste',
    changes: [
      'In Beschlüssen, Zuschüssen und Auslagen wechselt ein Wisch den Reiter.',
      'Das Zuschuss-Budget erscheint als schlanke Leiste; ein Tipp klappt Details und die Übersicht je Person auf.',
      'Der öffentliche Antragslink ist nur noch ein kleiner Kopier-Knopf.',
    ],
  },
  {
    version: '3.24.0',
    title: 'Beschluss-Entwurf vor dem Anlegen',
    changes: [
      'Beim Bündeln von Zuschüssen wird der Beschluss erst als Entwurf gezeigt und lässt sich anpassen.',
      'In der Beschlussauswahl lassen sich archivierte Beschlüsse bei Bedarf einblenden.',
    ],
  },
  {
    version: '3.23.0',
    title: 'Nachweis-Link kopieren',
    changes: [
      'Fehlt ein Nachweis, lässt sich der persönliche Link kopieren – auch für Personen ohne E-Mail-Adresse, z. B. für WhatsApp.',
      'Die großen Knöpfe in der Übersicht sind entfallen; angelegt wird im jeweiligen Bereich.',
    ],
  },
  {
    version: '3.22.0',
    title: 'Archiv als eigener Reiter, weiche Übergänge',
    changes: [
      'Beschlüsse: Offen / Buchhaltung offen / Archiv – der Reiter „Alle" entfällt.',
      'Wechsel, Aufklappen und Fenster blenden durchgehend weich ein und aus.',
    ],
  },
  {
    version: '3.21.0',
    title: 'Buchhaltung als Schalter, Archiv nach Jahr und Monat',
    changes: [
      'Ein Schalter „In der Buchhaltung berücksichtigt" verschiebt den Beschluss ins Archiv.',
      'Behoben: Die Buchhaltungs-Auswahl hat vorher nichts gespeichert.',
      'Das Archiv ist ein aufklappbarer Baum nach Jahr, Monat und Art.',
    ],
  },
  {
    version: '3.20.0',
    title: 'Personen: Vor- und Nachname, Zuordnung über den Namen',
    changes: [
      'Öffentliche Formulare fragen Vor- und Nachname getrennt ab.',
      'Ein neuer Antrag wird einer bereits vorhandenen Person zugeordnet, statt sie doppelt anzulegen.',
      'Neue Personenübersicht mit Budget je Person und Zusammenführen von Dubletten.',
    ],
  },
  {
    version: '3.19.0',
    title: 'Übersicht mit Modulen',
    changes: [
      'Die Startseite zeigt Module für Beschlüsse, Zuschüsse und Auslagen – nur Zahlen, nichts zum Bearbeiten.',
      'Ein Tipp springt in den passenden Reiter mit der richtigen Vorauswahl.',
    ],
  },
  {
    version: '3.18.0',
    title: 'Start bleibt nicht mehr hängen',
    changes: [
      'Behoben: Die App blieb bei „Verbindung wird geprüft" hängen oder zeigte trotz Verbindung keine Daten.',
      'Die Daten werden erst nach der Anmeldung abonniert; bei Störungen versucht die App es selbstständig erneut.',
    ],
  },
  {
    version: '3.17.0',
    title: 'Anmeldung mit E-Mail und Passwort',
    changes: [
      'Anmelden geht jetzt mit E-Mail und Passwort; Google bleibt als zweiter Weg.',
      'Einladung per E-Mail mit Link zum Passwort-Festlegen und Installationsanleitung.',
      '„Passwort vergessen" funktioniert selbstständig.',
      'Nachgereicht in 3.17.x: Namen änderbar, „festangestellt" nachträglich setzbar, Entwickler-Login für Tests, behobene Fehler bei doppelten Adressen und beim Wiederauftauchen gelöschter Mitglieder.',
    ],
  },
  {
    version: '3.16.0',
    title: 'Festschreibung, App-Sperre, Downloads auf dem iPhone',
    changes: [
      'Haben alle abgestimmt, sind Stimmen nach 24 Stunden festgeschrieben; aufheben nur mit Admin-Code.',
      'Die App sperrt sich nach zwei Minuten im Hintergrund und verlangt Face ID oder den Vorstandscode.',
      'Dateien werden auf dem iPhone über das Teilen-Menü gespeichert – vorher hingen Downloads.',
      'Bildvorschau mit Zoom.',
    ],
  },
  {
    version: '3.15.0',
    title: 'Auslagenerstattung als eigener Bereich',
    changes: [
      'Neuer Bereich „Auslagen" mit eigenem Formular unter /auslage; der Beleg ist dort Pflicht.',
      'Gleicher Ablauf wie beim Zuschuss: geprüft, im Beschluss, zur Zahlung freigegeben, bezahlt.',
      'Belege aus Auslagen sind auch in der Belege-Übersicht auffindbar.',
    ],
  },
  {
    version: '3.14.6',
    title: 'Sammelüberweisung von der Bank akzeptiert',
    changes: [
      'Behoben: In der SEPA-Datei fehlte ein Pflichtfeld, die Sparkasse hat sie abgelehnt.',
      'Die Datei wird jetzt gegen das offizielle Bank-Schema geprüft.',
    ],
  },
  {
    version: '3.13.0',
    title: 'Rollen-Katalog und Einladungen',
    changes: [
      'Vorstandsposten sind frei pflegbar statt fest im Programm.',
      'Zuschüsse: Status nicht mehr frei wählbar; die Sammelüberweisung markiert automatisch als bezahlt.',
      'Beschlüsse, die längst die Mehrheit hatten, werden beim Laden nachträglich abgeschlossen.',
    ],
  },
  {
    version: '3.12.0',
    title: 'Strengere Anmeldung, gesperrte Einstellungen',
    changes: [
      'Nur vom Vorstand angelegte Personen können sich anmelden.',
      'Die Einstellungen sind komplett per Code gesperrt.',
      'Behoben: Beschlüsse blieben trotz erreichter Mehrheit offen – auch bei Abstimmung per E-Mail-Link.',
      'Zuschüsse bekommen Reiter für die einzelnen Phasen.',
    ],
  },
  {
    version: '3.11.0',
    title: 'Fenster auf dem Handy, doppelte Mitglieder',
    changes: [
      'Behoben: Auf dem Handy war die Kopfzeile mancher Fenster samt Schließen-Kreuz nicht erreichbar.',
      'Behoben: Beim ersten Google-Login wurde eine Person doppelt angelegt.',
      'Neue Mitteilung, sobald Zuschüsse zur Auszahlung bereit sind.',
    ],
  },
  {
    version: '3.10.0',
    title: 'Sitzungen überarbeitet',
    changes: [
      'Die Terminansicht zeigt die nächste Sitzung als Karte; alles Weitere öffnet ein eigenes Fenster.',
      'Sitzungen lassen sich absagen, ohne sie zu löschen.',
      'Behoben: Als „nächste Sitzung" konnte ein vergangener Termin erscheinen.',
    ],
  },
  {
    version: '3.9.0',
    title: 'Beschlüsse aus dem Protokolltext erkennen',
    changes: [
      'Aus dem Protokolltext von Teams Copilot lassen sich Beschlüsse erkennen – ohne KI-Dienst und ohne laufende Kosten.',
      'Erkannte Beschlüsse werden nie automatisch angelegt, sondern zuerst zur Prüfung gezeigt.',
    ],
  },
  {
    version: '3.8.0',
    title: 'Wiederkehrende Sitzungen, Protokoll und Agenda',
    changes: [
      'Sitzungsserien wie in Outlook (täglich, wöchentlich, monatlich, jährlich).',
      'Protokoll und Agenda lassen sich als Datei an einen Termin hängen.',
    ],
  },
  {
    version: '3.7.0',
    title: 'Mitteilungen, Revisionshistorie, Beleg-Nachreichelink',
    changes: [
      'Vorgänge von außen (Formulare, E-Mail-Links) erzeugen jetzt Mitteilungen im Portal.',
      'Zu jedem Beschluss, Beleg und Zuschuss gibt es eine Änderungshistorie.',
      'Aus einem Beschluss heraus lässt sich ein Link zum Nachreichen von Belegen verschicken.',
      'In 3.7.1 bis 3.7.3 nachgezogen: bessere Bildkomprimierung und Schutz vor zu großen Dateien.',
    ],
  },
  {
    version: '3.6.0',
    title: 'Zuschuss-Katalog pflegbar',
    changes: [
      'Veranstaltungen, Beträge und Jahresgrenzen sind im Portal änderbar statt fest im Programm.',
    ],
  },
  {
    version: '3.5.0',
    title: 'Zuschuss-Antrag erweitert',
    changes: [
      'Pflichtangaben, getrennter Teilnahme- und Kostennachweis, Dateien auch per Ziehen und Ablegen.',
      'Sicherungsdatei zum Antrag, die der Vorstand notfalls einlesen kann.',
      'Personen mit vertauschtem Vor- und Nachnamen werden als Dublette erkannt.',
    ],
  },
  {
    version: '3.4.0',
    title: 'Aufräumen im Hintergrund',
    changes: [
      'Die größte Programmdatei wurde in sechs Bereiche aufgeteilt – für die Bedienung ändert sich nichts, Fehler fallen künftig früher auf.',
    ],
  },
  {
    version: '3.3.0',
    title: 'Ruhigere Oberfläche',
    changes: [
      'Der Hintergrund scrollt nicht mehr mit, wenn ein Fenster offen ist.',
      'Fenster blenden ein und aus, die untere Navigation gleitet mit.',
      'Der öffentliche Antragslink ist im Portal sichtbar und kopierbar.',
    ],
  },
  {
    version: '3.2.0',
    title: 'Öffentliches Zuschuss-Formular und Beschluss-Pflicht',
    changes: [
      'Zuschüsse lassen sich über ein öffentliches Formular beantragen (mit Zugangscode).',
      'Ausgezahlt wird erst nach einem angenommenen Vorstandsbeschluss.',
      'Fehlende Nachweise lassen sich über einen persönlichen Link nachreichen.',
      'In 3.2.1 behoben: Nachweisfotos und Anhänge ließen sich nicht öffnen.',
    ],
  },
  {
    version: '3.1.2',
    title: 'Erzwungene Aktualisierung repariert',
    changes: [
      'Behoben: Nach „Aktualisierung erzwingen" hing auf allen Geräten dauerhaft der Update-Hinweis.',
      'Die erzwungene Aktualisierung lässt sich jederzeit wieder abschalten.',
      'In 3.1.3 behoben: Beim E-Mail-Versand zu Beschlüssen waren auch Nicht-Stimmberechtigte vorausgewählt.',
    ],
  },
];
