# Versionsverlauf – WJOF Vorstandsportal

Diese Datei wird erzeugt: Inhalte bitte in `src/data/changelog.ts` pflegen
und danach `npm run changelog` ausführen. Dieselben Einträge zeigt die App
unter Einstellungen → System und beim Klick auf die Versionsnummer.

## v4.2.1 – 25.09.2026

**Alte Adresse leitet auf die neue um**

- Wer die bisherige Netlify-Adresse aufruft, landet jetzt automatisch auf app.vorstandsportal.cloud.
- Bereits verschickte Links (Abstimmung, Nachweis, Beleg) funktionieren weiter und führen zur neuen Adresse.
- Nach dem ersten Aufruf der neuen Adresse einmal neu anmelden; die App auf dem Home-Bildschirm am besten neu installieren.

## v4.2.0 – 24.09.2026

**Google-Anmeldung unter der eigenen Adresse**

- Bei „Mit Google anmelden" steht jetzt „Weiter zu app.vorstandsportal.cloud" statt der technischen Firebase-Adresse.
- Auf dem iPhone kommt man nach der Google-Anmeldung zuverlässiger ins Portal zurück, weil Safari die Anmeldung nicht mehr als fremde Seite behandelt.
- Die Anmeldung mit E-Mail und Passwort ist unverändert.

## v4.1.1 – 24.09.2026

**Eigene Adresse: app.vorstandsportal.cloud**

- Das Portal ist jetzt unter der eigenen Adresse app.vorstandsportal.cloud erreichbar – mit gültigem Sicherheitszertifikat.
- Die bisherige Adresse funktioniert weiter; bereits verschickte Links bleiben gültig.
- Die App auf dem Home-Bildschirm am besten einmal löschen und von der neuen Adresse neu installieren; Face ID und Mitteilungen danach einmal neu einschalten.

## v4.1.0 – 16.09.2026

**Wischen im ganzen Bereich und in den Einstellungen**

- Der Reiterwechsel per Wischen reagiert jetzt im gesamten Inhaltsbereich – auch dort, wo unter der Liste nichts mehr steht.
- Auch in den Einstellungen lassen sich die Reiter durch Wischen wechseln.
- Auf Eingabefeldern und in waagerecht scrollbaren Leisten bleibt das Wischen bewusst aus, damit Tippen und Scrollen nicht gestört werden.

## v4.0.0 – 16.09.2026

**Versionsverlauf in der App**

- Neu: Unter Einstellungen → System steht jetzt der komplette Versionsverlauf – was in welcher Version dazugekommen ist.
- Ein Klick auf die Versionsnummer in der Fußzeile öffnet denselben Verlauf, ohne Code-Eingabe.
- Der Verlauf wird zusätzlich als Datei CHANGELOG.md im Projekt mitgeführt.
- Sprung auf Version 4: Das Portal ist seit Version 3 deutlich gewachsen (Zuschüsse, Auslagen, Belege, Sitzungen, automatische E-Mails).

## v3.32.0 – 16.09.2026

**E-Mails an den Vorstand einzeln einstellbar**

- Einstellungen → Benachrichtigungen: je Vorstandsmitglied und je Ereignis festlegen, wer eine E-Mail bekommt.
- Ereignisse: neuer Zuschuss-Antrag, neue Auslagenerstattung, neuer Beleg, nachgereichter Nachweis.
- Belege und nachgereichte Nachweise lösen überhaupt erstmals eine E-Mail aus.
- Ohne Auswahl bleibt es beim bisherigen Verhalten (Zuschuss und Auslage an die hinterlegte Admin-Adresse).

## v3.31.0 – 16.09.2026

**Bestätigungsmails und automatische Erinnerungen**

- Wer einen Zuschuss oder eine Auslage einreicht, bekommt eine Bestätigung mit allen Daten – erst, wenn der Vorgang wirklich angekommen ist.
- Beim Zuschuss ist immer der persönliche Link dabei: Er zeigt jederzeit, welche Unterlagen vorliegen.
- Automatische Erinnerung am Veranstaltungstag um 20 Uhr und eine Woche danach, solange ein Nachweis fehlt.
- Liegt die Veranstaltung in der Vergangenheit, müssen beide Nachweise direkt mit eingereicht werden.
- Behoben: Das Löschen einer Nachweisdatei setzt den Status wieder auf „Offen" – vorher meldete der Link fälschlich „liegt bereits vor".

## v3.30.0 – 15.09.2026

**Freie Zuschuss-Kategorien, überarbeitete Beleganfrage**

- Kategorien der Zuschüsse lassen sich umbenennen, neu anlegen, sortieren und entfernen – je Kategorie mit eigener Grenze.
- Je Kategorie einstellbar, ob eine Veranstaltung nur einmal je Person bezuschusst wird.
- „Belege anfragen" startet direkt mit dem Standardtext; Vorlagen holt ein eigener Knopf.
- Jede E-Mail lässt sich als Vorlage speichern; Empfänger sind Vorstandsmitglieder und beliebige Adressen, jede bekommt eine eigene Mail.
- Einstellungen → Vorlagen: Vorlagen zentral anlegen, bearbeiten und löschen.

## v3.29.0 – 15.09.2026

**Einstellungen → Zuschüsse**

- Grenzen (Gesamtbudget, je Person, je Kategorie) und der Veranstaltungskatalog stehen jetzt in den Einstellungen.
- Veranstaltungen aus bisherigen Anträgen lassen sich per Tipp in den Katalog übernehmen.
- Das frühere Fenster „Katalog & Obergrenzen" entfällt; der Knopf „Katalog" führt in die Einstellungen.

## v3.28.0 – 15.09.2026

**Öffentlicher Beleg-Link und „Belege anfragen"**

- Neuer Link, über den jemand einen Beleg einreichen kann – ohne Beschluss und ohne Anmeldung.
- Eingereichte Belege landen unter Belege → Offen, mit Mitteilung im Portal.
- „Belege anfragen" verschickt diesen Link mit anpassbarem Text und Vorlagen.

## v3.27.0 – 15.09.2026

**Belege: Offen und Archiv**

- Belege haben nur noch zwei Reiter: Offen und Archiv.
- Ein Beleg wandert ins Archiv, sobald er einem Beschluss zugeordnet oder in der Buchhaltung erledigt ist.
- Das Archiv ist ein aufklappbarer Baum nach Jahr, Kategorie und mit/ohne Beschluss.
- Übersicht: neues Modul „Belege" mit der Zahl offener Belege.

## v3.26.0 – 15.09.2026

**Belege wie die anderen Bereiche aufgebaut**

- Der Belege-Bereich sieht aus und funktioniert wie Beschlüsse und Zuschüsse: Reiter, Filter, aufklappbare Karten.
- Beschluss, Ordner, Jahr und Monat sind jetzt Filter statt eigener Leisten.

## v3.25.0 – 14.09.2026

**Reiter per Wischen, Budget-Leiste**

- In Beschlüssen, Zuschüssen und Auslagen wechselt ein Wisch den Reiter.
- Das Zuschuss-Budget erscheint als schlanke Leiste; ein Tipp klappt Details und die Übersicht je Person auf.
- Der öffentliche Antragslink ist nur noch ein kleiner Kopier-Knopf.

## v3.24.0

**Beschluss-Entwurf vor dem Anlegen**

- Beim Bündeln von Zuschüssen wird der Beschluss erst als Entwurf gezeigt und lässt sich anpassen.
- In der Beschlussauswahl lassen sich archivierte Beschlüsse bei Bedarf einblenden.

## v3.23.0

**Nachweis-Link kopieren**

- Fehlt ein Nachweis, lässt sich der persönliche Link kopieren – auch für Personen ohne E-Mail-Adresse, z. B. für WhatsApp.
- Die großen Knöpfe in der Übersicht sind entfallen; angelegt wird im jeweiligen Bereich.

## v3.22.0

**Archiv als eigener Reiter, weiche Übergänge**

- Beschlüsse: Offen / Buchhaltung offen / Archiv – der Reiter „Alle" entfällt.
- Wechsel, Aufklappen und Fenster blenden durchgehend weich ein und aus.

## v3.21.0

**Buchhaltung als Schalter, Archiv nach Jahr und Monat**

- Ein Schalter „In der Buchhaltung berücksichtigt" verschiebt den Beschluss ins Archiv.
- Behoben: Die Buchhaltungs-Auswahl hat vorher nichts gespeichert.
- Das Archiv ist ein aufklappbarer Baum nach Jahr, Monat und Art.

## v3.20.0

**Personen: Vor- und Nachname, Zuordnung über den Namen**

- Öffentliche Formulare fragen Vor- und Nachname getrennt ab.
- Ein neuer Antrag wird einer bereits vorhandenen Person zugeordnet, statt sie doppelt anzulegen.
- Neue Personenübersicht mit Budget je Person und Zusammenführen von Dubletten.

## v3.19.0

**Übersicht mit Modulen**

- Die Startseite zeigt Module für Beschlüsse, Zuschüsse und Auslagen – nur Zahlen, nichts zum Bearbeiten.
- Ein Tipp springt in den passenden Reiter mit der richtigen Vorauswahl.

## v3.18.0

**Start bleibt nicht mehr hängen**

- Behoben: Die App blieb bei „Verbindung wird geprüft" hängen oder zeigte trotz Verbindung keine Daten.
- Die Daten werden erst nach der Anmeldung abonniert; bei Störungen versucht die App es selbstständig erneut.

## v3.17.0

**Anmeldung mit E-Mail und Passwort**

- Anmelden geht jetzt mit E-Mail und Passwort; Google bleibt als zweiter Weg.
- Einladung per E-Mail mit Link zum Passwort-Festlegen und Installationsanleitung.
- „Passwort vergessen" funktioniert selbstständig.
- Nachgereicht in 3.17.x: Namen änderbar, „festangestellt" nachträglich setzbar, Entwickler-Login für Tests, behobene Fehler bei doppelten Adressen und beim Wiederauftauchen gelöschter Mitglieder.

## v3.16.0

**Festschreibung, App-Sperre, Downloads auf dem iPhone**

- Haben alle abgestimmt, sind Stimmen nach 24 Stunden festgeschrieben; aufheben nur mit Admin-Code.
- Die App sperrt sich nach zwei Minuten im Hintergrund und verlangt Face ID oder den Vorstandscode.
- Dateien werden auf dem iPhone über das Teilen-Menü gespeichert – vorher hingen Downloads.
- Bildvorschau mit Zoom.

## v3.15.0

**Auslagenerstattung als eigener Bereich**

- Neuer Bereich „Auslagen" mit eigenem Formular unter /auslage; der Beleg ist dort Pflicht.
- Gleicher Ablauf wie beim Zuschuss: geprüft, im Beschluss, zur Zahlung freigegeben, bezahlt.
- Belege aus Auslagen sind auch in der Belege-Übersicht auffindbar.

## v3.14.6

**Sammelüberweisung von der Bank akzeptiert**

- Behoben: In der SEPA-Datei fehlte ein Pflichtfeld, die Sparkasse hat sie abgelehnt.
- Die Datei wird jetzt gegen das offizielle Bank-Schema geprüft.

## v3.13.0

**Rollen-Katalog und Einladungen**

- Vorstandsposten sind frei pflegbar statt fest im Programm.
- Zuschüsse: Status nicht mehr frei wählbar; die Sammelüberweisung markiert automatisch als bezahlt.
- Beschlüsse, die längst die Mehrheit hatten, werden beim Laden nachträglich abgeschlossen.

## v3.12.0

**Strengere Anmeldung, gesperrte Einstellungen**

- Nur vom Vorstand angelegte Personen können sich anmelden.
- Die Einstellungen sind komplett per Code gesperrt.
- Behoben: Beschlüsse blieben trotz erreichter Mehrheit offen – auch bei Abstimmung per E-Mail-Link.
- Zuschüsse bekommen Reiter für die einzelnen Phasen.

## v3.11.0

**Fenster auf dem Handy, doppelte Mitglieder**

- Behoben: Auf dem Handy war die Kopfzeile mancher Fenster samt Schließen-Kreuz nicht erreichbar.
- Behoben: Beim ersten Google-Login wurde eine Person doppelt angelegt.
- Neue Mitteilung, sobald Zuschüsse zur Auszahlung bereit sind.

## v3.10.0

**Sitzungen überarbeitet**

- Die Terminansicht zeigt die nächste Sitzung als Karte; alles Weitere öffnet ein eigenes Fenster.
- Sitzungen lassen sich absagen, ohne sie zu löschen.
- Behoben: Als „nächste Sitzung" konnte ein vergangener Termin erscheinen.

## v3.9.0

**Beschlüsse aus dem Protokolltext erkennen**

- Aus dem Protokolltext von Teams Copilot lassen sich Beschlüsse erkennen – ohne KI-Dienst und ohne laufende Kosten.
- Erkannte Beschlüsse werden nie automatisch angelegt, sondern zuerst zur Prüfung gezeigt.

## v3.8.0

**Wiederkehrende Sitzungen, Protokoll und Agenda**

- Sitzungsserien wie in Outlook (täglich, wöchentlich, monatlich, jährlich).
- Protokoll und Agenda lassen sich als Datei an einen Termin hängen.

## v3.7.0

**Mitteilungen, Revisionshistorie, Beleg-Nachreichelink**

- Vorgänge von außen (Formulare, E-Mail-Links) erzeugen jetzt Mitteilungen im Portal.
- Zu jedem Beschluss, Beleg und Zuschuss gibt es eine Änderungshistorie.
- Aus einem Beschluss heraus lässt sich ein Link zum Nachreichen von Belegen verschicken.
- In 3.7.1 bis 3.7.3 nachgezogen: bessere Bildkomprimierung und Schutz vor zu großen Dateien.

## v3.6.0

**Zuschuss-Katalog pflegbar**

- Veranstaltungen, Beträge und Jahresgrenzen sind im Portal änderbar statt fest im Programm.

## v3.5.0

**Zuschuss-Antrag erweitert**

- Pflichtangaben, getrennter Teilnahme- und Kostennachweis, Dateien auch per Ziehen und Ablegen.
- Sicherungsdatei zum Antrag, die der Vorstand notfalls einlesen kann.
- Personen mit vertauschtem Vor- und Nachnamen werden als Dublette erkannt.

## v3.4.0

**Aufräumen im Hintergrund**

- Die größte Programmdatei wurde in sechs Bereiche aufgeteilt – für die Bedienung ändert sich nichts, Fehler fallen künftig früher auf.

## v3.3.0

**Ruhigere Oberfläche**

- Der Hintergrund scrollt nicht mehr mit, wenn ein Fenster offen ist.
- Fenster blenden ein und aus, die untere Navigation gleitet mit.
- Der öffentliche Antragslink ist im Portal sichtbar und kopierbar.

## v3.2.0

**Öffentliches Zuschuss-Formular und Beschluss-Pflicht**

- Zuschüsse lassen sich über ein öffentliches Formular beantragen (mit Zugangscode).
- Ausgezahlt wird erst nach einem angenommenen Vorstandsbeschluss.
- Fehlende Nachweise lassen sich über einen persönlichen Link nachreichen.
- In 3.2.1 behoben: Nachweisfotos und Anhänge ließen sich nicht öffnen.

## v3.1.2

**Erzwungene Aktualisierung repariert**

- Behoben: Nach „Aktualisierung erzwingen" hing auf allen Geräten dauerhaft der Update-Hinweis.
- Die erzwungene Aktualisierung lässt sich jederzeit wieder abschalten.
- In 3.1.3 behoben: Beim E-Mail-Versand zu Beschlüssen waren auch Nicht-Stimmberechtigte vorausgewählt.
