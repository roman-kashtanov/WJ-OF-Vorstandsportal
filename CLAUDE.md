# WJOF Vorstandsportal — Projektgedächtnis

Diese Datei wird automatisch gelesen, **wenn die Sitzung im Ordner
`Vorstandsportal` gestartet ist** (bis 13.09.2026 lief das Portal als
Zusatzordner einer anderen Sitzung – dann wird sie NICHT geladen). Sie hält
fest, was sich aus dem Code allein **nicht** erschließt: getroffene
Entscheidungen, bekannte Fallstricke und der Stand der Einrichtung.

**Bitte bei jeder wesentlichen Änderung mit aktualisieren – und den Abschnitt
„Aktueller Stand" am Ende jeder Anfrage.**

---

## Arbeitsregeln (zuerst lesen)

- Antworten auf **Deutsch**, ohne Fachjargon. Der Nutzer ist Schatzmeister, kein Entwickler.
- **Nur committen, nie selbst pushen.** Der Nutzer testet lokal und pusht selbst.
  Am Ende jeder Antwort den Push-Befehl als eigenen `bash`-Block nennen.
  Ausnahme: Er verlangt den Push ausdrücklich.
- **Versionsnummer bei jeder Code-Änderung erhöhen** (`npm version patch|minor
  --no-git-tag-version`) und am Ende „Aktuelle Version: vX.Y.Z" nennen.
- **Versionsverlauf mitführen:** zu jeder neuen Version oben in
  `src/data/changelog.ts` einen Eintrag ergänzen (in der Sprache des
  Vorstands, keine Entwickler-Begriffe) und danach `npm run changelog`
  ausführen – das schreibt `CHANGELOG.md` neu. Dieselben Einträge zeigt die
  App unter Einstellungen → System und beim Klick auf die Versionsnummer.
- **Lokal testen** mit `preview_start` Name `vorstandsportal` (Port 3007) und dem
  Knopf „Entwickler-Login (nur lokal)" (Zugangsdaten in `.env.local`, meldet
  als „WJ OF (Entwickler)" an). Lokal = **echte Daten**: nur ansehen, nichts
  speichern oder löschen, ohne vorher zu fragen.
- **Codes:** Admin- und Vorstandscode kennt Claude nicht (nur Hashes). Lokal sind
  Einstellungen ohne Code offen, Code-Abfragen vor dem Löschen bleiben.
- **Firebase-Konsole** nur über Claude in Chrome, Google-Konto `/u/1/` (WJ-Konto).
  Keine netlify/firebase-CLI, lokal kein Dienstkonto. Daten in Firestore nie
  selbst löschen.
- **Nie ganze Sammlungen aus dem lokalen Stand zurückschreiben** und
  Firestore-Abos immer an die Firebase-Anmeldung koppeln (siehe v3.17.6, v3.18.0).

## Aktueller Stand (16.09.2026)

- Version **v4.2.2**, lokal committet, noch nicht gepusht (v4.2.1 Umleitung der
  alten Adresse, v4.2.2 Endlosschleife nach dem Abmelden behoben). v4.2.0 ist veröffentlicht (Push am 24.09.2026, v4.1.0 bis v4.2.0
  samt Resend-Anleitung). `app.vorstandsportal.cloud` ist in Netlify als
  *Primary domain* gesetzt (25.09.2026). Live geprüft: v4.2.0 wird ausgeliefert,
  `/__/auth/handler` liefert die Firebase-Anmeldeseite (Durchreichung aktiv).
- **Resend (24.09.2026):** Konto angelegt, Domain `vorstandsportal.cloud`
  (Region Irland) eingetragen, die drei DNS-Einträge bei IONOS von Hand gesetzt
  und öffentlich sichtbar (`resend._domainkey`, MX + SPF auf `send`). Die
  „Auto configure"-Seite von IONOS zeigte die Hostnamen ohne Präfix an und wurde
  deshalb abgelehnt. **Läuft seit 24.09.2026:** Netlify-Variablen gesetzt, Mails kommen von
  `portal@vorstandsportal.cloud` (Antwort an `offenbachwj@gmail.com`) und
  landen im Gmail-Posteingang; Google-Anmeldung zeigt die eigene Adresse.
  Offen: Kopfzeilen (SPF/DKIM/DMARC = PASS) noch nicht gesehen; optional eine
  Antwortadresse auf der eigenen Domain (Weiterleitung an Gmail).
- **Eigene Adresse `app.vorstandsportal.cloud`** (24.09.2026): Domain
  `vorstandsportal.cloud` bei IONOS (auf den Nutzer privat registriert),
  Namensserver bleiben bei IONOS. Eintrag `app` = CNAME auf
  `wj-of-vorstandsportal.netlify.app`; IONOS hat dafür die automatisch
  angelegten Mail-Einträge nur für `app` abgeschaltet – die Mail-Einträge der
  Hauptdomain (MX `mx00/mx01.ionos.de`, SPF) sind unverändert. Zertifikat von
  Netlify (Let's Encrypt, erneuert sich selbst); ein zusätzlich bei IONOS
  angelegtes SSL-Zertifikat wird **nicht** benutzt. In Firebase als
  *Autorisierte Domain* eingetragen, Google-Anmeldung läuft dort seit v4.2.0
  unter der eigenen Adresse (siehe Abschnitt v4.2.0). **Offen:** in Netlify
  `app.vorstandsportal.cloud` als *primary domain* setzen (erst wenn der
  Router zu Hause die neue Adresse kennt), danach E-Mail-Versand über Resend mit Absender
  `portal@vorstandsportal.cloud` – Anleitung ist neu geschrieben
  (`ANLEITUNG-Domain-und-Mailversand.md`), Umsetzung durch den Nutzer offen.
- Einzelheiten im Versionsverlauf: `CHANGELOG.md` bzw. in der App über die
  Versionsnummer.
- **Nach diesem Deploy zu prüfen (offen):**
  - Netlify → *Functions*: `reminders` muss als *Scheduled function*
    auftauchen (läuft 18 und 19 Uhr UTC = 20 Uhr deutscher Zeit). Sofort
    testbar über Einstellungen → Zuschüsse → „Jetzt prüfen".
  - Einstellungen → Benachrichtigungen: festlegen, wer welche E-Mails bekommt.
    Ohne Auswahl bleibt es beim alten Verhalten (Zuschuss und Auslage an die
    hinterlegte Admin-Adresse), Belege lösen dann gar keine E-Mail aus.
  - „Beleg-Link kopieren", Beleg darüber einreichen → erscheint unter Belege →
    Offen; „Belege anfragen" an sich selbst und eine zweite Adresse schicken
    (zwei getrennte Mails mit eigenem Namen).
  - Öffentlichen Zuschuss-Antrag einreichen: Bestätigungsmail mit Link muss
    ankommen; bei einer Veranstaltung in der Vergangenheit verlangt das
    Formular beide Nachweise sofort.
- Weiche Übergänge nur im Chrome-Vorschaufenster geprüft – auf dem iPhone
  (Safari ab iOS 18) noch vom Nutzer zu testen.
- Offen beim Nutzer: doppelte Personen (Roman Kashtanov 7×, Diana Sajzew 2×)
  in der Personenübersicht zusammenführen.
- Nach dem Deploy prüfen: öffentlichen Antrag mit bereits vorhandenem Namen
  einreichen → wird derselben Person zugeordnet, bei abweichender IBAN steht
  ein Hinweis in der Notiz.
- Mitglieder: Roman Kashtanov (Schatzmeister), Roman Test, WJ OF (Entwickler)
  = `offenbachwj@gmail.com`, Rolle „Tester/Entwickler", festangestellt, ohne
  Stimmrecht – offen: ob „festangestellt" entfernt werden soll.
- Angeboten, noch nicht beauftragt: diese Datei aufteilen (Versionsgeschichte
  in eine eigene Datei, oben nur Regeln und Stand).

---

## Was das ist

Vorstandsportal der Wirtschaftsjunioren Offenbach am Main e. V.
Umlaufbeschlüsse mit Abstimmung, Belegverwaltung, Sitzungen.
Wird **überwiegend am Smartphone** bedient — Mobile-Ansicht hat Vorrang.

Der Nutzer ist Vorstandsmitglied, kein Entwickler. Erklärungen auf Deutsch,
ohne Fachjargon; Konsequenzen benennen, nicht nur Optionen aufzählen.

## Wo was liegt

| | |
|---|---|
| Quellcode | `~/Claude/Vorstandsportal` (Git, Branch `main`) |
| GitHub | `roman-kashtanov/WJ-OF-Vorstandsportal` — **öffentlich** |
| Live | https://app.vorstandsportal.cloud (eigene Domain seit 24.09.2026, bei IONOS; die alte Adresse https://wj-of-vorstandsportal.netlify.app leitet seit v4.2.1 per 302 dorthin um) |
| Netlify-Konto | `offenbachwj` (Team-Slug), Site-ID `23662692-a17e-4fab-967f-2042e79221e7` |
| Firebase | Projekt `vorstandsportal-wj-offenbach` (WJ-Google-Konto) |
| Dev-Server | Port 3007 (`npm run dev`), in root `.claude/launch.json` als `vorstandsportal` |

Weil das Repository öffentlich ist: **keine Geheimnisse in den Code.** Alles
Vertrauliche gehört in Netlify-Umgebungsvariablen.

## Architektur in drei Sätzen

React + Vite, ausgeliefert als statische Seite über Netlify.
Alles Serverseitige (E-Mail, Push, Abstimmungslinks) läuft in **einer**
Netlify Function unter `/api/*` (`netlify/functions/api.mts`), die ihre Logik
aus `api/` bezieht — dieselben Module nutzt der lokale Express-Server
(`server.ts`). Daten liegen in Firestore und synchronisieren live.

**Regel:** Neue Serverfunktionen immer in `api/` schreiben und über
`api/router.ts` einhängen, damit lokal und live dieselbe Logik läuft.

## Zugangskonzept

1. Anmeldung mit **E-Mail + Passwort** (Standard, Konto über die Einladung)
   oder mit **Google** — seit v3.17.0, vorher nur Google
2. E-Mail-Adresse muss **bestätigt** sein (`email_verified`, Pflicht in
   `firestore.rules`) und in der Firestore-Sammlung `allowlist` stehen
   (Dokument-ID = die Adresse, klein geschrieben) — das ist die
   **maßgebliche** Prüfung, nicht die lokale Mitgliederliste
3. 5-stelliger Vorstandscode, Standard `11111`
4. Danach optional Face ID / Touch ID pro Gerät

Die Freigabeliste pflegt die App selbst: Mitglied anlegen erteilt die Freigabe,
Mitglied entfernen entzieht sie. Der Abgleich fügt nur hinzu und löscht nie —
sonst hätte er den von Hand angelegten Erst-Eintrag des Administrators
entfernt und damit die Selbst-Aussperrung ausgelöst.

Löschen von Beschlüssen: eigener Admin-Code (nur als Hash gespeichert),
erst aus dem Archiv heraus möglich.

## Bekannte Fallstricke (teuer erkauft)

**Netlify-Geheimnis-Scanner.** Bricht den Build ab, wenn er den Firebase-Web-
Schlüssel (`AIza…`) im Code findet. Dieser Schlüssel ist bewusst öffentlich.
Ausgenommen über `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` in `netlify.toml` —
gezielt nur dieser eine Wert, damit der Scanner sonst scharf bleibt.

**Kein zweiter Redirect auf `/api/*`.** Die Function registriert ihre Route
selbst über `config.path`. Ein zusätzlicher `force`-Redirect in `netlify.toml`
hat sie unerreichbar gemacht — die App bekam stattdessen die HTML-Seite.

**Leere Cloud darf lokale Daten nicht löschen.** Die erste Firestore-Antwort
kommt oft leer aus dem Cache. `applyRemote()` in `App.tsx` lädt in dem Fall die
lokalen Daten hoch, statt sie zu überschreiben.

**Node ≥ 22 nötig** (`@netlify/functions`, `@vitejs/plugin-react`).

**Stiller Ausfall vermeiden.** Firestore-Fehler wurden früher nur in die
Konsole geschrieben; die App lief lokal weiter und wirkte funktionsfähig.
Es gibt jetzt einen Warnhinweis und unter *Portal → System → Funktionsprüfung*
einen echten Lese-/Schreibtest. Grundsatz: **nie Erfolg behaupten, der nicht
gemessen wurde** — dort stand vorher ein fest verdrahtetes grünes „synchron".

**Animationsklassen.** `animate-in`, `fade-in` usw. stammen aus
tailwindcss-animate, das nie installiert war — die Klassen waren wirkungslos.
Sie sind jetzt direkt in `src/index.css` definiert.

## Versionsnummer

Einzige Quelle ist `package.json`; Vite setzt sie beim Bauen ein.
Erhöhen mit `npm version patch|minor|major` — **nicht** von Hand in
`src/constants/version.ts` eintragen.

Nach dem Deploy können Geräte alte Stände im Zwischenspeicher halten:
*Portal → System → „Aktualisierung für alle erzwingen"*.

## Stand der Einrichtung

Vollständig eingerichtet: Firestore samt Regeln, Google-Anmeldung,
Freigabeliste, Netlify mit GitHub verbunden, E-Mail über Gmail-SMTP,
Push-Schlüssel, Signaturschlüssel und Dienstkonto für die Abstimmungslinks.

Der Dienstkonto-Zugang ist als „secret" hinterlegt (Bereiche: builds,
functions, runtime) und nachweislich wirksam: Ein Abstimmungslink für einen
nicht existierenden Beschluss antwortet mit „Nicht gefunden" statt „Noch nicht
eingerichtet" — der Server erreicht die Datenbank also.

Neue Mitglieder brauchen keinen Handgriff in der Firebase-Konsole mehr: Anlegen
in den Einstellungen erteilt die Freigabe automatisch.

## E-Mail

Bisher Versand über das Gmail-Postfach des Vereins (`offenbachwj@gmail.com`)
per SMTP mit App-Passwort. Resend war früher bewusst ausgeschlossen, weil die
Domain-Verifizierung den SPF-Eintrag von `wj-offenbach.de` (IONOS +
vereinonline.org) berührt hätte.

**Seit 24.09.2026 über Resend:** mit der eigenen Domain
`vorstandsportal.cloud` entfällt das SPF-Risiko. Absender
`portal@vorstandsportal.cloud`, Region EU, Schritte in
`ANLEITUNG-Domain-und-Mailversand.md`. Umgeschaltet wird allein über
Netlify-Variablen (`RESEND_API_KEY`, `RESEND_FROM`, `MAIL_REPLY_TO`,
`MAIL_PROVIDER=resend`) – ohne `MAIL_PROVIDER=resend` bleibt Gmail aktiv, und
das Entfernen dieser Variable schaltet jederzeit zurück. Die Gmail-Variablen
bleiben als Rückfall stehen.

Gmail erlaubt rund 500 Empfänger pro Tag und akzeptiert nur das angemeldete
Konto als Absender.

## Zuschüsse

Eigener Bereich nach der Zuschuss-Richtlinie 01.2026 (liegt als PDF im Ordner).
Beträge und Grenzen stehen in `src/data/subsidyCatalogue.ts`.

Grenzen je Kalenderjahr: Academies 200 €, Trainings 75 €, Konferenzen 200 €,
je Person 475 €, Gesamtbudget 2.500 €. Nicht verbrauchtes Budget verfällt zum
01.01.

Die Prüfung in `src/utils/subsidies.ts` erzeugt **Hinweise, keine Sperren** —
der Vorstand darf im Einzelfall abweichen (§ 3, § 5 Abs. 3), soll es aber
bewusst tun. Geprüft wird: Kategorie- und Personengrenze, Gesamtbudget,
Zuschuss höher als die tatsächlichen Kosten (§ 9) und dieselbe Veranstaltung
mehrfach je Mitgliedschaft (§ 5 Abs. 5, § 6 Abs. 3).

**Abweichungen von der Richtlinie auf Wunsch des Vorstands:** Die
Vier-Wochen-Frist für den Nachweis entfällt, und ein Zuschuss darf auch nach
der Veranstaltung beantragt werden. Beträge sind frei überschreibbar — in der
Praxis gibt es auch Kleinbeträge (5 € für ein Kurztraining).

Die Personen hier sind **nicht** die Vorstandsmitglieder aus den Einstellungen,
sondern eine eigene Liste (Mitglieder, Fördermitglieder, Interessenten) mit
Bankverbindung.

### Sammelüberweisung

`src/utils/sepa.ts` erzeugt SEPA-XML im Format **pain.001.001.03** — das lesen
Sparkasse und VR-Bank im Online-Banking ein. Mehrere Zuschüsse derselben Person
werden zu einer Überweisung zusammengefasst. IBANs werden über die Prüfziffer
(Modulo 97) geprüft; ohne gültige IBAN wird eine Person von der Auszahlung
ausgenommen statt stillschweigend übersprungen.

Umlaute im Verwendungszweck werden umschrieben (ae, oe, ue, ss), weil der
SEPA-Zeichensatz sie nicht zulässt.

## Speicher (wichtig)

Belege liegen als Base64 **im Firestore-Dokument selbst**, nicht in einem
Dateispeicher. Daraus folgen zwei harte Grenzen:

- **1 MiB je Dokument** (Firestore). Base64 vergrößert um ein Drittel, also
  passen höchstens ~700 KB Rohdaten. Ein normales Handyfoto (3–8 MB) sprengt
  das um ein Vielfaches.
- **~5 MB lokaler Browser-Speicher.** Deshalb werden Dateiinhalte
  (`dataUrl`, `fileUrl`, `filePreview`) beim lokalen Ablegen **entfernt** —
  sie liegen in Firestore. Sonst schlägt das Schreiben irgendwann fehl und
  **alle** weiteren Änderungen gehen verloren.

`src/utils/fileStorage.ts` verkleinert Bilder vor dem Speichern: max. 2400 px
Kante, JPEG ab Qualität 92 %, die nur so weit gesenkt wird, wie die
Größengrenze es verlangt. Reicht das nicht, wird die Auflösung reduziert statt
die Qualität weiter — Artefakte zerstören feine Schrift stärker als eine etwas
kleinere Kante. Ein Beleg landet damit bei 300–500 KB. Zu große Nicht-Bilder werden mit klarer Meldung abgelehnt, statt
still zu scheitern.

Firebase Storage ist im Projekt **nicht** eingerichtet (404) und würde für neue
Projekte den Blaze-Tarif erfordern. Solange die Komprimierung reicht, ist das
nicht nötig.

Gesamtkapazität im kostenlosen Tarif: 1 GiB. Bei ~400 KB je Beleg entspricht
das grob 2.500 Belegen.

## Stimmberechtigung

Ausschließlich in *Einstellungen → Vorstand* pro Mitglied festgelegt
(`isVotingMember`, Feld auf `BoardMember`). Beim Anlegen eines Beschlusses ist
das **nicht mehr auswählbar** — `eligibleVoterIds` wird in `NewResolutionModal`
automatisch aus den aktuell stimmberechtigten Mitgliedern abgeleitet
(`useMemo`, kein manueller Toggle mehr). Genau daran hängt auch, wer die
Abstimmungs-E-Mail bekommt — beides läuft über dieselbe Liste, eine Änderung
in den Einstellungen wirkt sich also automatisch auf künftige Beschlüsse aus
(nicht rückwirkend auf bereits erstellte).

`calculateVoteStats()` in `formatters.ts` leitet `eligibleCount` selbst aus
`resolution.eligibleVoterIds` ab (Fallback auf die übergebene Gesamtzahl nur,
wenn das Feld leer ist). Prozent-Balken und „X von Y"-Texte in der
Detailansicht müssen deshalb `activeStats.eligibleCount` verwenden, nicht
`members.length` — sonst zählen Nicht-Stimmberechtigte (z. B. Festangestellte)
fälschlich mit.

## Bug behoben: Stimme per E-Mail-Link kam nie an

`FirestoreAdmin.patchDocument()` schickte verschachtelte Felder
(`votes.mem123`) als **flachen** Schlüssel mit Punkt im Namen statt als echte
verschachtelte Firestore-Map. Firestore quittierte das mit Erfolg, legte den
Wert aber unter einem nirgends gelesenen Feld ab — die E-Mail zeigte „Stimme
erfasst", im Portal blieb der Beschluss unverändert auf „Ausstehend". Behoben
über `setNestedFirestoreField()` in `api/firestoreAdmin.ts`, die Punkt-Pfade
korrekt in verschachtelte `mapValue`-Strukturen umwandelt. Isoliert gegen die
erwartete JSON-Struktur getestet; ein Livetest mit echter Beschluss-ID steht
noch aus (bitte nach dem Deploy einmal mit einem echten Abstimmungslink
prüfen).

## Detailansicht eines Beschlusses — Reihenfolge

Bewusst so sortiert (Stand: Nutzerwunsch nach mehreren Anläufen):

1. Stammdaten ganz oben: von wem, wann, E-Mail-/Druck-Aktionen, Status,
   Buchhaltungsstatus — alles in einer kompakten Box
2. Bezeichnung, Antragswortlaut, Budget
3. **Abstimmung**: eine einzige Mitgliederliste (nicht zwei getrennte wie
   früher). Nur die eigene Zeile ist klickbar; erst der Klick öffnet die
   Knöpfe zum Abstimmen bzw. Ändern (`voteBoxOpenFor`-State, keyed nach
   Beschluss-ID). Nicht-Stimmberechtigte zeigen „Kein Stimmrecht" statt
   fälschlich „Ausstehend"
4. Quorum kompakt (Balken + Zahlen) — **ohne** erneute Namensliste darunter
5. Dateianhänge, Zugeordnete Rechnungen, Kommentare, Archivieren/Löschen

Der Datei-Upload direkt in der Detailansicht (`handleDetailFileUpload`) nutzt
jetzt ebenfalls `prepareFileForStorage()` — vorher lief dieser zweite
Upload-Pfad noch am Komprimierungs-Fix vorbei.

## Archivierte Beschlüsse

Müssen an **jeder** Stelle, die „offene Beschlüsse" zählt oder auflistet,
explizit ausgeschlossen werden (`!res.isArchived`) — der reine Status
`in_abstimmung` reicht nicht, ein archivierter Beschluss kann diesen Status
weiterhin tragen. Betroffene Stellen: `App.tsx` (`pendingVotesCount`),
`DashboardView.tsx` (`openResolutions`, `pendingResolutionsForMember`),
`NotificationCenter.tsx` (`unvotedResolutions`), `EmailCenterView.tsx`
(`activeResolutions`). Bei einer neuen Zählstelle immer mitdenken.

## Bug behoben: Erzwungene Aktualisierung hing sich in Endlosschleife auf (v3.1.2)

**Symptom:** Nach Klick auf „Aktualisierung erzwingen" (Einstellungen → System)
blieb auf allen Geräten dauerhaft das Update-Popup offen. Klick auf
„Aktualisieren" lud neu, das Popup kam aber sofort wieder — auf beiden
betroffenen Geräten des Nutzers, ohne jede Möglichkeit, das zu umgehen.

**Ursache:** `handleForceUpdateNow` in `SettingsModal.tsx` hat **nicht** die
tatsächlich laufende `CURRENT_APP_VERSION` als Pflichtversion nach Firestore
geschrieben, sondern eine rechnerisch um eine Patch-Stelle **erfundene**
Zukunftsversion (z. B. lief 3.1.1 → geschrieben wurde 3.1.2, obwohl nie
wirklich als 3.1.2 gebaut/deployt). Diese erfundene Nummer entsprach keinem
real existierenden Deploy. `ForceUpdateModal.tsx` verglich außerdem noch
gegen `latestVersion` statt gegen `minRequiredVersion`. Jedes Gerät lud beim
Klick auf „Aktualisieren" zwangsläufig nur die tatsächlich vorhandene
(ältere) Version nach — die verlangte Version konnte nie erreicht werden.
Endlosschleife ohne Ausweg, da es keine Möglichkeit gab, die erzwungene
Aktualisierung wieder zu deaktivieren.

**Fix:**
- `handleForceUpdateNow` schreibt jetzt `CURRENT_APP_VERSION` **unverändert**
  als `latestVersion` **und** `minRequiredVersion` — keine Erfindung mehr.
  UI warnt den Admin vorher, die eigene Seite selbst einmal neu zu laden,
  damit garantiert die neueste echte Version verlangt wird.
- `ForceUpdateModal.tsx` vergleicht jetzt korrekt gegen `minRequiredVersion`
  und zeigt permanent „Installiert: vX · Benötigt: vY" an — Diagnose auf
  einen Blick, ob überhaupt eine erreichbare Version verlangt wird.
- Neuer Zähler (`sessionStorage`, `wjof_force_update_attempts`): ab dem 2.
  erfolglosen Klick erscheint ein Hinweis, dass die verlangte Version
  vermutlich nicht wirklich veröffentlicht ist.
- **Neue Notbremse**: Solange `forceUpdateEnabled === true` zeigt
  Einstellungen → System jetzt „Aktiv seit … · Pflichtversion vX" mit einem
  „Deaktivieren"-Knopf, der `forceUpdateEnabled` direkt zurücksetzt — vorher
  gab es aus einem hängenden Zustand keinerlei Ausweg außer manuellem
  Löschen des Firestore-Dokuments.

**Wichtig für künftige Versionsbumps:** Der Knopf ist jetzt bewusst simpel —
er zwingt exakt die Version, die im Browser des klickenden Admins gerade
läuft. Nach einem echten Deploy muss der Admin also **erst selbst neu laden**,
dann erst klicken. Nie mehr eine Versionsnummer rechnerisch erfinden.

Isoliert per Skript gegen `compareVersions()` getestet (alte Schleife
nachgestellt und bestätigt; neuer Deploy 3.1.2 löst alle bisher denkbaren
hängengebliebenen Zielversionen 3.0.1/3.1.1/3.1.2 auf). Kein Livetest gegen
das tatsächlich in Firestore hängende `settings/versionConfig`-Dokument
möglich (kein authentifizierter Lesezugriff von hier aus) — die Argumentation
für „3.1.2 deckt garantiert alle je erfundenen Werte ab" steht in der
Commit-Nachricht.

## Bug behoben: E-Mail-Versand bei Beschlüssen erlaubte Nicht-Stimmberechtigte als Standard (v3.1.3)

**Symptom:** Im Beschluss-Detail unter „E-Mail versenden" (`EmailVoteModal.tsx`) waren
standardmäßig **alle** Mitglieder ausgewählt — auch Nicht-Stimmberechtigte
und bereits Abgestimmte. Der „Alle"-Knopf zeigte zudem eine **hartcodierte**
Zahl „(8)" statt der tatsächlichen Mitgliederzahl (real z. B. nur 3). Die
Live-HTML-Vorschau war immer sichtbar und erschwerte den schnellen Versand.

**Ursache:** `members={members}` in `App.tsx` übergab die komplette,
ungefilterte Mitgliederliste an das Modal; `selectedRecipients` wurde initial
auf `members.map(m => m.id)` gesetzt (alle, unabhängig von Stimmrecht/Status).
Der Text `Alle (8)` war ein vergessener Literal-String statt `members.length`.

**Fix (`EmailVoteModal.tsx`):**
- Mitglieder werden intern in `eligibleMembers` (`isVotingMember`) und
  `otherMembers` getrennt.
- Standardauswahl = nur `eligibleMembers`, die noch **nicht** abgestimmt haben
  (`!resolution.votes[m.id]`) — bereits Abgestimmte und Nicht-Stimmberechtigte
  sind initial abgewählt.
- Nicht-Stimmberechtigte stehen in einer eigenen, standardmäßig
  **eingeklappten** Sektion („Nicht stimmberechtigt (n) — nur bei Bedarf
  hinzufügen") und lassen sich bei Bedarf manuell dazuwählen.
- „Alle"-Knopf bezieht sich nur auf `eligibleMembers` und zeigt die echte
  Zahl dynamisch (`Alle (${eligibleMembers.length})`), kein Hardcoding mehr.
- Die HTML-Live-Vorschau ist jetzt standardmäßig **eingeklappt** (Knopf
  „E-Mail-Vorschau anzeigen (nicht notwendig zum Versenden)"); „Automatisch
  senden" funktioniert direkt ohne vorherigen Blick auf die Vorschau.

Live im Browser mit 5 Testmitgliedern (3 stimmberechtigt, 2 nicht) und einem
teilweise abgestimmten Testbeschluss verifiziert: Standardauswahl zeigte
korrekt nur die zwei noch offenen Stimmberechtigten, „Alle (3)" korrekt,
Nicht-Stimmberechtigte blieben abgewählt/versteckt, Vorschau blieb bis zum
manuellen Aufklappen verborgen.

## Neues Feature: Öffentliches Zuschuss-Formular + Beschluss-Pflicht vor Auszahlung (v3.2.0)

Großes, mehrteiliges Feature. Zuschüsse laufen jetzt durch eine Ampel-Kette,
bevor tatsächlich Geld fließt:

```
beantragt → bestätigt ("Geprüft") → im_beschluss (gebündelt, Abstimmung läuft)
          → zur_zahlung_freigegeben (Beschluss angenommen) → bezahlt
```

„Geprüft" (`bestaetigt`, alter Schlüssel beibehalten für Bestandsdaten)
bedeutet nur „inhaltlich korrekt, Nachweise vollständig" — **keine**
Zahlungsfreigabe. Erst ein angenommener Vorstandsbeschluss schaltet frei.
Gilt einheitlich für alle Zuschüsse, nicht nur öffentlich eingereichte.

### Öffentliches Antragsformular (/antrag) und Nachweis-Nachreichen (/nachweis)

Beide Seiten sind eigenständige React-Komponenten
(`src/public/SubsidyApplicationPage.tsx`, `SubsidyProofUploadPage.tsx`),
KEINE rohen HTML-Seiten wie die E-Mail-Abstimmung. `src/main.tsx` verzweigt
per **dynamischem** `import()` auf `window.location.pathname` — bewusst kein
statischer Import, sonst würde das komplette authentifizierte App-Bundle
(Firebase, Vorstands-State) trotzdem im Netzwerkpfad anonymer Besucher
landen. Bestätigt im Build: beide Seiten sind eigene, kleine Chunks
(~5–10 KB), `App.tsx` ein separater ~1,5-MB-Chunk.

Zugangsschutz: einfacher Zugangscode (SHA-256-Hash in
`SecuritySettings.subsidyFormCodeHash`, setzbar in Einstellungen →
Sicherheit), gleiches Hash-Schema wie der Vorstandscode. **Fail closed**:
ohne gesetzten Hash ist das Formular nicht nutzbar, kein Standard-Fallback.

Backend folgt exakt dem Muster der E-Mail-Abstimmung
(`api/vote.ts`/`api/voteToken.ts`): eigene signierte HMAC-Tokens
(`api/subsidyProofToken.ts`, eigenes Secret `SUBSIDY_PROOF_LINK_SECRET`,
180 Tage gültig, **kein** Einmalverbrauch — der Nachweis-Link darf mehrfach
geöffnet werden, der Handler prüft stattdessen bei jedem Aufruf live den
Zuschuss-Status). Alle Schreibzugriffe laufen über `FirestoreAdmin`
(Dienstkonto), nie direkt vom Browser — das ist bei einem unauthentifizierten
Formular auch technisch der einzige Weg, da Firestore-Regeln jeden Zugriff
ohne echten Google-Login blockieren.

**Wichtiger Fallstrick, der beim Testen auffiel und behoben wurde:**
`verifySubsidyFormCode`/`handleGetProofStatus`/`handleUploadProof` müssen
`FirestoreAdmin`-Aufrufe in try/catch kapseln bzw. vorher `isConfigured()`
prüfen — sonst wirft ein fehlendes `FIREBASE_SERVICE_ACCOUNT` (z. B. lokal)
eine ungefangene Exception, die die ganze Anfrage ohne Antwort hängen lässt,
statt sauber `{ok:false}` zurückzugeben. Genau nach dem Vorbild von
`api/vote.ts`s durchgängigem try/catch nachgezogen.

### Bündeln zu Beschluss

Neuer Knopf „Zu Beschluss bündeln" in der Zuschüsse-Übersicht
(`SubsidiesView.tsx`) öffnet `BundleSubsidiesModal.tsx`: Checkliste aller
„geprüft"-Einträge, erzeugt einen vorausgefüllten Beschluss (Kategorie
„Finanzen & Budget", Antragswortlaut zählt jeden Zuschuss auf) über die
bestehende `handleCreateResolution` — kein neuer Erstellungspfad nötig.
Jeder Zuschuss-Nachweis wird automatisch als `ResolutionAttachment` an den
Beschluss gehängt. Danach `status: 'im_beschluss'`, `resolutionId` gesetzt.

### Reaktive Kaskade statt Verdrahtung in der Stimmabgabe

Sobald ein Beschluss mit verknüpften Zuschüssen `angenommen` wird, sollen
diese automatisch auf `zur_zahlung_freigegeben` springen (bei `abgelehnt`
zurück auf `bestaetigt`, `resolutionId` gelöscht — neu bündelbar). Das läuft
**bewusst nicht** in `handleVoteForMember` verdrahtet, sondern als eigener
`useEffect`, der auf den `resolutions`-State selbst reagiert: E-Mail-Link-
Stimmen ändern den Beschluss-Status serverseitig direkt in Firestore
(`api/vote.ts`), nie über `handleVoteForMember` — ein Effekt auf den
State selbst erfasst beide Wege (lokale Stimme UND Live-Firestore-
Subscription) gleichermaßen. Live getestet: Kaskade greift zuverlässig,
Zuschuss erscheint danach korrekt in `SubsidyPayoutModal` (dort jetzt auf
`zur_zahlung_freigegeben` gefiltert statt `bestaetigt`).

### Nachweis-Zusammenfassung (PDF)

Neue Abhängigkeit `jspdf`. `src/utils/subsidyReceipt.ts` erzeugt beim
Markieren als „Bezahlt" (`handleMarkSubsidiesPaid` in `App.tsx`) pro
Zuschuss eine reine Text-PDF (Person, Veranstaltung, Betrag, maskierte
IBAN, Beschluss-Nummer) und hängt sie über die bestehende
`handleAddAttachment` an den Beschluss — **ohne** das Nachweisfoto darin
erneut einzubetten (das hängt schon separat dran, aus dem Bündeln).
Live getestet: Beschluss zeigt danach beide Anhänge (Original-Nachweis +
automatische Zusammenfassung).

### Nicht manuell wählbar

`im_beschluss` und `zur_zahlung_freigegeben` (`PIPELINE_MANAGED_STATUSES`
in `utils/subsidies.ts`) sind aus den Status-Dropdowns in
`NewSubsidyModal.tsx` und `SubsidiesView.tsx` ausgeblendet (außer als
aktueller Wert, damit ein bereits so gesetzter Eintrag sichtbar bleibt) —
sonst könnte man die Beschluss-Pflicht einfach per Dropdown umgehen.

### Bekannte Grenzen (bewusst nicht gebaut)

Kein CAPTCHA/Rate-Limiting am öffentlichen Formular (nur der Zugangscode
schützt), keine automatische Dublettenerkennung bei Personen (kein
Firestore-Query im Admin-Client, nur Einzeldokument-Zugriff), kein
Status-Auskunftsportal für Antragsteller über den Nachweis-Link hinaus.

### Nicht lokal end-to-end testbar

`FIREBASE_SERVICE_ACCOUNT`, `VOTE_LINK_SECRET`, `SUBSIDY_PROOF_LINK_SECRET`
sind lokal nicht gesetzt — das öffentliche Formular wurde bis zur
Zugangscode-Prüfung (korrektes Fail-closed-Verhalten bestätigt) und
UI/Validierung getestet, nicht aber der volle Firestore-Schreibpfad. Bitte
nach dem Deploy einmal echt mit einem gesetzten Zugangscode durchklicken.

## Bug behoben: Nachweisfotos/Anhänge ließen sich nicht öffnen (v3.2.1)

**Symptom:** Bilder (Nachweisfotos bei Zuschüssen, Bild-Anhänge bei
Beschlüssen) ließen sich nicht "aufmachen" - Klick auf den Dateinamen löste
höchstens einen erzwungenen Download aus (`<a href download>`), keine
Vorschau. Auf dem Handy landet ein solcher Download oft unsichtbar im
System, ohne dass der Nutzer merkt, dass überhaupt etwas passiert ist.

**Ursache, zweite Ebene:** `stripFilePayloads()` in `utils/storage.ts`
entfernt `dataUrl`-Felder bewusst vor dem Schreiben in den Browser-Speicher
(5-MB-Limit) - betrifft Beschluss-Anhänge **und** Zuschuss-Nachweise
gleichermaßen. Ohne Verbindung zur Vereinsdatenbank (oranger Banner "Keine
Verbindung...") bleibt die App nach einem Neuladen auf diesen
lokalstorage-Daten sitzen - die `dataUrl` fehlt dann komplett, ein Klick tat
buchstäblich gar nichts.

**Fix:** Neue `src/components/FilePreviewModal.tsx` - Vollbild-Overlay für
Bilder, direkter Download-Button. Eingebunden in `ResolutionsView.tsx`
(Dateianhänge), `SubsidiesView.tsx` (Nachweis-Link) und
`NewSubsidyModal.tsx` (Nachweis beim Bearbeiten). Klick-Logik:
- Bild vorhanden → Vorschau-Overlay
- PDF vorhanden → neuer Browser-Tab (nativer PDF-Viewer)
- sonst → klassischer Download
- **`dataUrl` fehlt** → Overlay zeigt jetzt eine klare Erklärung
  ("Datei auf diesem Gerät gerade nicht verfügbar, vermutlich fehlende
  Verbindung zur Datenbank - Seite neu laden") statt stillschweigend nichts
  zu tun.

Live im Browser mit allen drei Fällen getestet (Bild-Vorschau, PDF-Link,
fehlende Datei) - jeweils korrektes Verhalten bestätigt.

## UI-Politur: Scroll-Sperre, Ein-/Ausblend-Animationen, gleitender Tab-Indikator, Antragslink sichtbar (v3.3.0)

**Hintergrund scrollte mit, wenn ein Fenster offen war.** Ursache: Fenster
sind `fixed inset-0`, aber `document.body` blieb selbst scrollbar - ein
Mausrad-/Wisch-Ereignis, das der innere Scrollbereich des Fensters am Rand
nicht mehr aufnehmen konnte, wanderte weiter zu body/html. Neuer Hook
`src/hooks/useBodyScrollLock.ts` (zählt mehrere gleichzeitig offene Fenster
mit, sperrt `body.style.overflow` erst beim letzten Öffnen, entsperrt erst
beim letzten Schließen) - eingebunden in `SettingsModal.tsx` und alle
Formular-Fenster mit sicherer Hook-Reihenfolge (NewResolutionModal,
NewSubsidyModal, SubsidyPayoutModal, BundleSubsidiesModal, NewInvoiceModal,
InvoiceDetailModal, NewMeetingModal, QuickAgendaModal, InvoiceRequestModal,
SubsidyPeopleModal, TeamsSettingsModal). **Bewusst ausgenommen:**
`EmailVoteModal.tsx` hat ein vorbestehendes Rules-of-Hooks-Problem (früher
Return-Guard *vor* den `useState`-Aufrufen) - dafür wurde ein separater
Hintergrund-Task angelegt, nicht hier mit-repariert.

**Keine Animation beim Wechseln/Schließen von Fenstern.** `index.css` hatte
bisher nur "enter"-Animationen (`animate-in`, `fade-in`, `zoom-in-95` ...),
kein Gegenstück zum Schließen. Neu: `@keyframes wj-exit` + `.animate-out`,
`.fade-out`, `.zoom-out-95` usw., exakt spiegelbildlich zu den bestehenden
enter-Klassen. Neuer Hook `src/hooks/useModalTransition.ts` haelt ein
Fenster nach `isOpen=false` noch kurz (150ms) weitergerendert, damit die
Exit-Animation ablaufen kann, bevor es aus dem DOM verschwindet - bisher
riss React es beim Schliessen sofort raus, keine Zeit für eine Animation.
In `SettingsModal.tsx` eingebunden; die 5 Tab-Inhalte (Vorstand,
Vorstandscode, System, Benachrichtigungen, MS Teams Link) tragen jetzt
`wj-expand` (bereits vorhandene Klasse für "sanftes Einblenden ganzer
Bereiche", war aber dort noch nirgends verwendet).

**Bottom-Nav-Indikator sprang statt zu gleiten.** `MobileBottomNav.tsx`
zeichnete den blauen Aktiv-Strich bisher pro Knopf einzeln (`{isActive &&
<span .../>}`) - beim Tab-Wechsel verschwand er auf dem alten Knopf und
erschien sofort auf dem neuen, keine Bewegung dazwischen. Jetzt **eine**
gemeinsame Leiste als Geschwister der Knöpfe, über `left` (berechnet aus
Tab-Index, alle Knöpfe sind gleich breit dank `flex-1`) mit
`transition-[left]` positioniert - sie gleitet jetzt sichtbar zum neuen Tab.
Die Inhalts-Wechsel-Animation (`wj-view-enter` auf `<main key={activeTab}>`
in `App.tsx`) existierte bereits von früher, war aber vermutlich zu subtil,
um als "Animation" wahrgenommen zu werden - unverändert gelassen.

**Öffentlicher Zuschuss-Antragslink jetzt im Portal sichtbar.** Neue Karte
oben in `SubsidiesView.tsx`: zeigt `${origin}/antrag` mit Kopieren-Knopf
(`EmailService.copyToClipboard`), damit jedes Vorstandsmitglied den Link
selbst abrufen kann - z. B. um ihn als Antwort auf eine
E-Mail-Zuschussanfrage direkt mitzuschicken ("bitte die Daten über diesen
Link erfassen"). Der Zugangscode selbst wird bewusst nicht angezeigt (liegt
nur als SHA-256-Hash vor, nicht rückholbar) - nur die URL.

Live im Browser getestet (Mobile-Ansicht + Desktop): Scroll-Sperre aktiv
(`body.style.overflow === 'hidden'` bei offenem Fenster, zurückgesetzt nach
Schließen), Tab-Wechsel-Klasse `wj-expand` bestätigt, Exit-Klasse
`animate-out fade-out` 30ms nach Schließen-Klick bestätigt, Bottom-Nav-
Indikator wandert sichtbar zum neuen Tab, Antragslink-Karte inkl.
Kopieren-Knopf erscheint korrekt in der Zuschüsse-Ansicht.

## Hintergrund-Task erledigt + dabei gefundene Regression behoben (v3.3.1)

Der zuvor angelegte Hintergrund-Task hat `EmailVoteModal.tsx` korrekt
repariert: Hooks stehen jetzt vor dem `if (!isOpen || !resolution) return
null;`, `resolution?.votes?.[m.id]` ist null-sicher, `useBodyScrollLock`
eingebunden. Soweit sauber.

**Beim Nachtesten aber eine echte, durch genau diese Umstellung neu
entstandene Regression gefunden:** `EmailVoteModal` bleibt dauerhaft im
App-Baum gemountet (`isOpen`/`resolution` wechseln nur als Props, das
Modal wird nie neu erzeugt). `useState`-Startwerte werden aber nur **ein
einziges Mal** beim allerersten Rendern der Komponente berechnet - und das
geschieht bereits beim App-Start, lange bevor zum ersten Mal wirklich ein
Beschluss geöffnet wird, also mit `resolution = null`. Die
Empfänger-Vorauswahl `eligibleMembers.filter((m) => !resolution?.votes?.[m.id])`
wertete `resolution` an dieser Stelle IMMER als `null` aus →
`!undefined` ist immer `true` → **alle** Empfänger wurden vorausgewählt,
für jeden jemals geöffneten Beschluss, unabhängig davon, wer schon
abgestimmt hatte. Das hat genau die in v3.1.3 gebaute Funktion
("nur offene Stimmberechtigte vorauswählen") wieder lautlos ausgehebelt.

**Fix:** `selectedRecipients` startet jetzt leer; ein `useEffect` mit
Abhängigkeit `[isOpen, resolution?.id]` berechnet die Vorauswahl bei jedem
tatsächlichen Öffnen neu. Live getestet: Beschluss mit 2 bereits
abgestimmten und 1 offenen Mitglied geöffnet → nur das offene Mitglied ist
vorausgewählt; manuell alles abgewählt, Fenster geschlossen und erneut
geöffnet → Vorauswahl stellt sich zuverlässig wieder korrekt her (nicht nur
beim allerersten Öffnen).

**Lehre für ähnliche Fälle:** Bei Fenstern, die dauerhaft gemountet bleiben
und nur über eine `isOpen`-Prop sichtbar/unsichtbar geschaltet werden,
dürfen von Props abhängige Vorauswahlen NIE als reiner `useState`-
Startwert berechnet werden - das läuft nur beim allerersten Mount, nicht
bei jedem "Öffnen". Immer per `useEffect`, das auf die relevante Prop
(hier `resolution?.id`/`isOpen`) reagiert.

## App.tsx modularisiert (v3.3.1 → v3.4.0, sechs Schritte)

Der ursprüngliche Google-AI-Studio-Monolith `App.tsx` (1820 Zeilen, fast
aller State + alle Handler in einer Datei) ist in sechs fachlich klar
abgegrenzte Custom Hooks aufgeteilt worden — reine Verschiebung, **keine
Verhaltensänderung**. App.tsx ist jetzt noch **1007 Zeilen** (-45 %).

**Warum:** Nutzerwunsch, ausdrücklich als generelles Prinzip für alle
Projekte festgehalten (siehe eigene Feedback-Memory
`feedback_avoid_monolithic_files`) — Google-AI-Studio-Apps neigen zu
solchen "God files", und genau dort verstecken sich Regressionen am
leichtesten (siehe die EmailVoteModal-Story weiter oben).

**Reihenfolge (wichtig bei künftigen Änderungen an der Kopplung):**

1. `src/hooks/useSubsidies.ts` — am eigenständigsten, `createResolution`/
   `addResolutionAttachment` als Parameter (damals noch App.tsx-lokale
   Consts, heute aus useResolutions).
2. `src/hooks/useMeetings.ts` — braucht nur `members`, `setSystemBanner`,
   `setActiveTab`.
3. `src/hooks/useNotifications.ts` — Benachrichtigungen + E-Mail-Protokoll
   + deren Einstellungen. Wird von Resolutions/Invoices gebraucht, daher
   früh extrahiert.
4. `src/hooks/useMembers.ts` — Vorstand/Anmeldung/Sicherheit. Braucht
   **keine** externen Abhängigkeiten, wird deshalb als **erster** Hook in
   App.tsx aufgerufen (praktisch jede andere Domain braucht
   `currentMember`).
5. `src/hooks/useInvoices.ts` — braucht `setResolutions` (schreibt
   `linkedInvoiceIds`), `currentMember`, `addInAppAndPushNotification`,
   `handleAddEmailLog`, `notificationSettings`.
6. `src/hooks/useResolutions.ts` — am stärksten von anderen abhängig,
   wird selbst von Subsidies/Invoices gebraucht. Deshalb in App.tsx **vor**
   diesen beiden aufgerufen (nach Members/Notifications).

**Muster für jeden Hook:** eigener State + eigene Persistenz-Effekte +
Handler, fremde Daten/Handler als Parameter-Interface (keine globale
Store-Lösung nötig, die Kopplung ist klein und bekannt). App.tsx
destrukturiert jeden Hook-Aufruf mit denselben Variablennamen wie vorher,
damit der Rest der Datei (v. a. JSX-Props) unverändert bleibt.

**Bewusst zentralisiert gelassen (nicht Teil dieser Runde):**
- Die eine große Firestore-Sync-`useEffect` in App.tsx (mountet alle
  `subscribe*`-Aufrufe + `autoInitCloudIfEmpty` in einem Rutsch) - eine
  saubere Aufteilung auf die einzelnen Hooks wäre riskant (Gefahr
  doppelter Subscriptions) und ist ein eigener, späterer Schritt.
- `pendingUrlAction` (1-Klick-E-Mail-Aktionen `?action=vote|...`) bleibt
  in App.tsx - echte Cross-Domain-Orchestrierung (Resolutions + Invoices +
  Members + UI-Navigation gleichzeitig), gehört an die Kompositionsstelle.
- 3 bereits vorher tote/unverdrahtete Handler
  (`handleUpdateResolutionBookkeepingStatus`, `handleUpdateInvoiceRecurrence`,
  `handleCheckForUpdates`) wurden unverändert mitverschoben, nicht
  bereinigt - kein Verhaltens-Cleanup in diesem Umbau, nur Struktur.
- Automatisierte Tests (separates, noch offenes Thema).

**Wichtiger struktureller Punkt, falls weitere Hooks dazukommen:** Ein
Hook-Aufruf ist eine *eager* Funktionsauswertung - anders als
`useEffect`-Closures (die erst nach dem Render laufen und deshalb auf
später im Code stehende Consts zugreifen dürfen), müssen alle Parameter
eines Hook-Aufrufs zum Zeitpunkt des Aufrufs bereits zugewiesen sein. Das
zwingt eine echte Reihenfolge in App.tsx: `useMembers()` zuerst (keine
Abhängigkeiten), dann `useMeetings()`/`useNotifications()`, dann
`useResolutions()` (braucht Members+Notifications-Ausgaben), erst danach
`useInvoices()`/`useSubsidies()` (brauchen Resolutions-Handler).

**Verifikation:** Jede Phase einzeln `npx tsc --noEmit` + `npm run build`
+ Live-Test im Browser, dann Commit - nicht erst am Ende. Abschließend
zusätzlich der Cross-Domain-Kernfall getestet: Zuschuss bündeln
(useSubsidies) → erzeugt Beschluss (useResolutions) → Beschluss annehmen
→ Kaskade greift → Auszahlung → Nachweis-PDF an Beschluss angehängt -
funktioniert identisch zum Stand vor der Modularisierung.

## Zuschuss-Antrag erweitert: Pflichtfelder, Kostennachweis, Drag&Drop,
## Sicherungsdatei, Namens-Zusammenführung (v3.5.0)

Große Erweiterung des öffentlichen Zuschuss-Formulars (`/antrag`) und der
Admin-Ansicht, in 5 Phasen umgesetzt (jede einzeln `tsc`+`build`+Live-Test
im Browser+Commit):

**1. Datenmodell + Backend** (`src/types.ts`, `api/subsidy.ts`,
`api/router.ts`): `Subsidy` bekam einen zweiten, unabhängigen Nachweis-Satz
(`costProofState`/`costProofNote`/`costProofFile` - Kostennachweis/Rechnung,
neben dem bisherigen Teilnahmenachweis). `handleSubmitSubsidy`: E-Mail,
Veranstaltungsdatum und `actualCost` sind jetzt Pflicht; der gewährte
Betrag wird serverseitig auf `Math.min(catalogueEntry.amount, actualCost)`
gekappt (§ 9 der Richtlinie technisch statt nur als Hinweis durchgesetzt);
liegt das Veranstaltungsdatum in der Zukunft, startet der Antrag im Status
`nicht_stattgefunden` statt `beantragt`. `handleGetProofStatus`/
`handleUploadProof` liefern/erwarten jetzt beide Nachweisarten getrennt
(`proofType: 'attendance' | 'cost'`). Neuer Endpunkt
`POST subsidy/resend-proof-link` (`handleResendProofLink`), mit dem der
Vorstand aus der App heraus einen frischen Nachweis-Link nachschicken kann
- nach demselben unauthentifizierten Vertrauensmodell wie `vote/links`.

**Falle bei der Betragskappung:** `SUBSIDY_CATALOGUE`-Einträge mit
`amount: 0` sind kein "kein Zuschuss", sondern der Sentinel für
"vollständig übernommen" (`fullCost: true`, z. B. LEO Academy) bzw. "durch
Vorstandsbeschluss festgelegt" (Sonstiges). `Math.min(0, actualCost)` ergibt
in beiden Fällen weiterhin `0` - **kein** Verhalten geändert gegenüber
vorher (der Admin trägt den tatsächlichen Betrag ohnehin manuell nach,
`NewSubsidyModal` befüllt `amount` bei diesen Einträgen bewusst nicht vor).
Nur die reine Anzeige im öffentlichen Formular hätte fälschlich "Maximal
möglicher Zuschuss: 0,00 €" gezeigt - dort wird jetzt anhand von
`entry.fullCost` unterschieden und ein passender Text gezeigt.

**2.-3. Formular + `/nachweis`-Seite**: neue, wiederverwendbare
`src/components/DropzoneFileInput.tsx` (Klick oder Drag&Drop, ruft
denselben `prepareFileForStorage`-Pfad wie bisher). Öffentliches Formular
(`SubsidyApplicationPage.tsx`) zeigt Teilnahme- und Kostennachweis als zwei
getrennte Abschnitte, dazu ein neues Pflichtfeld "Tatsächliche Kosten" mit
Live-Hinweis auf den Katalog-Höchstbetrag. Neuer Abschnitt
"Sicherungsdatei": clientseitig erzeugte CSV mit allen Antragsdaten (Format
zentralisiert in `src/utils/subsidyBackupCsv.ts`, Feld;Wert-Paare statt
echter Tabellenzeilen, damit Sonderzeichen/Kommas in Namen und Kommentaren
das Format nicht zerlegen) - jederzeit herunterladbar, zusätzlich prominent
bei einem Sende-Fehler und als Rückfalloption auf der Erfolgsseite.
`/nachweis` (`SubsidyProofUploadPage.tsx`) zeigt beide Nachweise als zwei
unabhängige `ProofSection`-Komponenten; ein bereits vorhandener Nachweis
zeigt "liegt bereits vor" statt erneut nach einer Datei zu fragen.

**4. Admin-Ansicht**: `NewSubsidyModal.tsx` nutzt jetzt ebenfalls
`DropzoneFileInput` für beide Nachweise. `SubsidiesView.tsx`: neue
Übersichtskarte "Noch nicht stattgefunden", zwei getrennte
Nachweis-Badges pro Zeile, Button "Nachweis-Link senden" (ruft
`resendSubsidyProofLink` aus `emailService.ts` auf) und "CSV importieren"
- liest die Sicherungsdatei eines Antragstellers ein und legt Person +
Zuschuss lokal genauso an wie ein erfolgreich übertragener Antrag (gleiche
Kappungs-/Status-Logik wie im Backend, dupliziert in
`useSubsidies.ts::handleImportSubsidyCsv` - bewusst kein gemeinsamer Code
mit `api/subsidy.ts`, da eine Serverfunktion nicht im Browser-Bundle
importierbar ist).

**5. Namens-Zusammenführung**: `normalizeNameKey()` (`utils/subsidies.ts`)
erkennt Namen in vertauschter Reihenfolge ("Max Mustermann" ==
"Mustermann Max"). `SubsidyPeopleModal.tsx` gruppiert Personen danach und
zeigt bei Treffern ein Banner mit "Zusammenführen"-Knopf (mit
`confirm()`-Bestätigung, kein automatisches Merge). Neuer Handler
`handleMergeSubsidyPeople` in `useSubsidies.ts` hängt alle Zuschüsse der
Duplikat-Person auf die behaltene um (die mit dem älteren `createdAt`) und
löscht den Duplikat-Eintrag.

**Bug beim Live-Test gefunden und behoben:** `handleMergeSubsidyPeople`
schrieb zunächst nur `personId` auf den umgehängten Zuschüssen um, nicht
das mitgeführte `personName` (dieses Feld existiert redundant, damit Listen
ohne Nachschlagen lesbar bleiben - siehe Kommentar am `Subsidy`-Typ). Nach
einem Merge zeigte die Zuschuss-Liste beim übernommenen Eintrag deshalb
weiterhin den Namen der bereits gelöschten Duplikat-Person. Fix: der
kept-Personenname wird beim Merge mit umgeschrieben, analog zu
`handleSaveSubsidyPerson`, das dasselbe bei einer Namens*bearbeitung*
schon immer getan hat.

**Wichtig für lokale Tests ohne Firestore-Dienstkonto:** `/antrag` und
`/nachweis` lassen sich lokal nicht über den echten Zugangscode-Schritt
hindurch testen (`FirestoreAdmin.isConfigured()` ist ohne
`FIREBASE_SERVICE_ACCOUNT` immer `false`, `verifySubsidyFormCode` schlägt
darum immer fehl). Zum Testen der Formular-UI testweise den
`useState`-Startwert (`step`/`state`) direkt auf den gewünschten Schritt
setzen, verifizieren, danach unbedingt zurücksetzen, bevor committet wird.
Drag&Drop lässt sich ohne echten OS-Dateidialog über `javascript_tool`
prüfen: ein `File`-Objekt in ein `DataTransfer` packen und ein
`DragEvent('drop', …)` auf das Dropzone-`<label>` dispatchen.

## Zuschuss-Katalog admin-editierbar (v3.6.0)

Veranstaltungen/Beträge und die Jahres-Obergrenzen (Gesamtbudget, pro
Person, je Kategorie) waren fest im Code (`src/data/subsidyCatalogue.ts`).
Jetzt admin-editierbar über ein neues Firestore-Settings-Dokument
`settings/subsidyCatalogue` (`{ entries, limits }`), exakt nach dem
bereits bestehenden `settings/security`-Muster (siehe
`FirebaseSync.subscribeSecuritySettings`/`saveSecuritySettings`):
`FirebaseSync.subscribeSubsidyCatalogueSettings`/
`saveSubsidyCatalogueSettings`, Subscription in der zentralen
Firestore-`useEffect` in `App.tsx`, State+Handler
(`catalogueSettings`, `handleSaveCatalogueSettings`,
`handleResetCatalogueToDefault`) in `useSubsidies.ts`, `localStorage`
über `SubsidyStorage.getCatalogueSettings`/`saveCatalogueSettings`.

**Ein Katalog-Eintrag = ein aktueller Betrag, keine Jahres-Historie**
(bewusste Entscheidung, siehe Rückfrage im Plan): bereits gestellte
Anträge speichern `amount`/`category`/`eventName` schon als eigene Felder
auf dem `Subsidy`-Datensatz, nicht als Referenz auf den Katalog - eine
Änderung am Katalog wirkt sich nur auf künftige Anträge aus.

**`null` statt `Infinity` für "kein Limit"** (`SubsidyLimits.perCategoryPerYear`):
Firestore/JSON kennen kein `Infinity` (`cleanData()` in `firebaseSync.ts`
macht per `JSON.stringify`-Rundreise sonst unkontrolliert `null` daraus) -
hier wird das absichtlich so gehandhabt. `resolveCategoryLimit()` in
`utils/subsidies.ts` übersetzt beim Rechnen zurück auf `Infinity`.
`budgetOverview`/`personBudget`/`checkSubsidy` bekommen `limits` jetzt als
expliziten Parameter statt eines statischen Imports - alle Aufrufer
(`SubsidiesView.tsx`, `SubsidyPeopleModal.tsx`, `NewSubsidyModal.tsx`)
reichen `catalogueSettings.limits` durch.

**Backend** (`api/subsidy.ts`) kann den Katalog nicht mehr statisch
importieren (der ist jetzt admin-editierbar, also zur Laufzeit
unbekannt) - `loadCatalogueEntries()` liest `settings/subsidyCatalogue`
per `FirestoreAdmin.getDocument`, fällt bei fehlendem Dokument (frische
Installation, oder lokal ohne `FIREBASE_SERVICE_ACCOUNT`) auf den
eingebauten `SUBSIDY_CATALOGUE`-Standard zurück. Neuer öffentlicher
Endpunkt `GET subsidy/catalogue` (kein Zugangscode nötig - wird im
Formular erst nach bestandenem Code-Schritt abgerufen, der Code-Schritt
bleibt der einzige Gatekeeper); `SubsidyApplicationPage.tsx` laedt den
Katalog jetzt darüber statt aus dem gebündelten Modul.

**Admin-UI**: neue `src/components/SubsidyCatalogueModal.tsx` (Button
"Katalog" in `SubsidiesView.tsx`, neben "Personen") - Obergrenzen-Formular
oben, Veranstaltungsliste mit Bearbeiten/Löschen/Neu-anlegen darunter,
"Auf Richtlinien-Standard zurücksetzen". Neue Einträge bekommen einen aus
der Bezeichnung generierten `key` (klein, `[a-z0-9]+`, Kollisionen per
Zähler aufgelöst).

**Regression beim Bauen vermieden, nicht erst live gefunden:** Diese
Modal-Komponente bleibt wie `SubsidyPeopleModal.tsx` permanent gemountet
(nur `isOpen` togglet den Inhalt). Der Obergrenzen-Entwurf (`limitsDraft`)
darf deshalb NICHT per bloßem `useState(settings.limits)`-Initializer
gesetzt werden (der würde nur beim allerersten Render laufen und den
Stand von damals dauerhaft einfrieren) - stattdessen ein
`useEffect(() => { if (isOpen) setLimitsDraft(settings.limits); }, [isOpen])`,
der bei jedem Öffnen frisch synchronisiert. Exakt dieselbe Lektion wie
beim `EmailVoteModal`-Fix weiter oben in dieser Datei - hier direkt beim
Schreiben angewendet statt erst durch einen Live-Test entdeckt.

**Nachweis-Erinnerung präzisiert** (`handleResendProofLink` und die
Bestätigungs-Mail in `handleSubmitSubsidy`, beide `api/subsidy.ts`): neue
gemeinsame Hilfsfunktion `missingProofLabels(hasAttendance, hasCost)`
baut aus den beiden Nachweis-Status eine konkrete Liste ("Teilnahmenachweis
und Kostennachweis (Rechnung)") statt der bisherigen generischen
Formulierung "den fehlenden Nachweis". Sind beim erneuten Anfordern
bereits beide Nachweise vorhanden, gibt es einen `400`-Fehler statt einer
sinnlosen E-Mail.

Live im Browser getestet (Katalog-Editor: Obergrenzen ändern inkl.
"kein Limit"-Checkbox, Veranstaltung anlegen/löschen, sofortige
Übernahme in `NewSubsidyModal` und der Budget-Anzeige, Reset-Button);
`GET /api/subsidy/catalogue` direkt aufgerufen (liefert lokal den
Default-Fallback). Die E-Mail-Textbausteine selbst konnten wie bisher
nicht live verschickt werden (kein SMTP/Resend lokal), nur durch
Code-Lesen verifiziert.

## Benachrichtigungen erweitert + Revisionshistorie + Beleg-Nachreichelink (v3.7.0)

Drei zusammenhängende Ergänzungen, alle motiviert durch dieselbe Lücke:
Vorgänge außerhalb der eingeloggten App (öffentliche Formulare,
E-Mail-Links) hinterließen bisher keine sichtbare Spur für den Vorstand.

**Zwei neue, einfache Firestore-Collections** (kein Regel-Update nötig -
die bestehende Catch-all-Regel in `firestore.rules` deckt jede neue
Collection automatisch ab):
- `notifications/{id}` - servergeschrieben, clientseitig live abonniert
  (`FirebaseSync.subscribeNotifications`, Muster wie `subscribeSubsidies`).
  In `App.tsx`s zentraler Subscribe-`useEffect` werden nur **neue** IDs
  additiv in den bestehenden `notifications`-State gemergt (nicht die
  ganze Liste ersetzt), damit lokale `isRead`-Änderungen erhalten bleiben.
  Bewusst **kein** Push dafür - diese Benachrichtigungen laufen nie über
  `addInAppAndPushNotification` (das würde auch pushen), sondern
  ausschließlich über diesen Merge-Pfad.
- `auditLog/{id}` (`AuditLogEntry`, `src/types.ts`) - die Revisionshistorie:
  kurze, lesbare Ereignisse ("Status auf 'Geprüft' gesetzt", "Anna stimmte:
  Ja") statt vollständiger Feld-Diffs. Neuer `src/hooks/useAuditLog.ts`
  (Muster wie `useNotifications.ts`), `addAuditLogEntry` wird - genau wie
  `addInAppAndPushNotification` - als Parameter in `useResolutions.ts`,
  `useInvoices.ts`, `useSubsidies.ts` hereingereicht und dort an jeder
  wichtigen Mutation aufgerufen. Bewusst **kein** Eintrag beim endgültigen
  Löschen (der Datensatz ist danach weg, der Eintrag wäre verwaist).

**Serverseitig** (`api/notify.ts`, neu, gemeinsam genutzt von `api/subsidy.ts`,
`api/vote.ts`, `api/invoice.ts`): `writeNotification`/`writeAuditLogEntry`
schreiben per `FirestoreAdmin.patchDocument` in beide Collections - bei
jedem öffentlich eingereichten Zuschuss-Antrag, jedem über den
Nachweis-Link hochgeladenen Nachweis, jeder per E-Mail-Link abgegebenen
Stimme und jedem über den neuen Beleg-Link eingereichten Beleg.

**Neue `src/components/RevisionHistory.tsx`** (reine Anzeige, Aufrufer
filtert `entries` nach `entityId`) - eingebunden bei Beschlüssen
(`ResolutionsView.tsx`), Rechnungen (`InvoiceDetailModal.tsx`) und
Zuschüssen (`SubsidiesView.tsx`, in der schon bestehenden aufklappbaren
Zeile).

**Einstellungen → neuer 6. Tab „Historie"** (`SettingsModal.tsx`):
gesperrt hinter dem **bereits bestehenden Löschcode**
(`verifyDeleteCode`/`deleteCodeHash`, Standard `1122334455` - derselbe
Code wie beim endgültigen Löschen archivierter Beschlüsse in
`ResolutionsView.tsx`, **nicht** der normale App-Zugangscode). Zeigt alle
Beschlüsse, aufklappbar mit vollständiger Abstimmungsübersicht (direkt
aus `Resolution.votes`, kein neuer Speicher) und der zugehörigen
Revisionshistorie.

**Neuer Link-Flow `/beleg?t=<token>`** (`api/invoiceAttachmentToken.ts`,
Kopie von `subsidyProofToken.ts` mit eigenem Secret
`INVOICE_ATTACHMENT_LINK_SECRET`; `api/invoice.ts`;
`src/public/InvoiceAttachmentUploadPage.tsx`, Pfad-Weiche in `main.tsx`):
der Vorstand verschickt aus einem Beschluss heraus (Button "Beleg-Link
senden" in `ResolutionsView.tsx`, neues `RequestInvoiceLinkModal.tsx` -
Empfänger wählbar aus den Mitgliedern **oder** frei per E-Mail) einen
Link ohne Login. Anders als beim Zuschuss-Nachweis gibt es **kein**
"locked"-Konzept - ein Beschluss darf beliebig viele Rechnungen sammeln.
Die eingereichte Datei wird ein vollwertiger `Invoice`-Datensatz
(gleiche Feldbefüllung wie `useInvoices.ts::handleCreateInvoice`),
verknüpft mit dem Beschluss (`linkedInvoiceIds`) UND automatisch in der
normalen Belege-Übersicht sichtbar (beide lesen aus derselben
`invoices`-Collection) - Nutzeranforderung: "Rechnungen die separat nur
zum Beschluss angehängt sind, müssen auch bei Rechnungsübersicht
angezeigt werden."

**Zwei Fallstricke, live beim Testen entdeckt:**
- **Neue Backend-Dateien brauchen einen Dev-Server-Neustart.** Der lokale
  `server.ts`/tsx-Watch-Prozess erkennt Aenderungen an bereits geladenen
  Dateien sofort, aber neue Dateien (`api/notify.ts`, `api/invoice.ts`,
  `api/invoiceAttachmentToken.ts`), die von `api/router.ts` neu importiert
  werden, erst nach einem manuellen Neustart (`preview_stop`+`preview_start`)
  - vorher liefert die neue Route einen irreführenden 404 "Unbekannter
  Endpunkt", obwohl der Code korrekt ist.
- **React 18 StrictMode verdoppelt Side-Effects in `setState`-Updatern im
  Dev-Server** (nicht im Produktions-Build): Ein Muster wie
  `setResolutions((prev) => prev.map((r) => { FirebaseSync.saveX(...); return r; }))`
  lässt den Updater beim lokalen Testen zweimal laufen, wodurch z. B. ein
  einzelner Kommentar zwei identische Revisionshistorie-Einträge erzeugt.
  Kein echter Bug (die Produktion ist nicht betroffen), aber beim
  Live-Testen zu erwarten - nicht mit doppelten echten Aufrufen verwechseln.

Live im Browser getestet: Revisionshistorie bei Beschluss (Kommentar),
Rechnung (Statuswechsel) und Zuschuss (Statuswechsel); Einstellungen →
Historie-Tab (Code-Sperre, Abstimmungsübersicht + Änderungen);
Beleg-Link-Modal (Mitglieder-Dropdown, freie E-Mail, Serveraufruf bis
zum erwarteten 500 lokal); `/beleg`-Formular inkl. Drag&Drop. Die
tatsächliche Zustellung von Benachrichtigungen/E-Mails ließ sich wie
bisher nur bis zum erwarteten Fehler ohne echtes Firestore-Dienstkonto
pruefen.

## Bildkomprimierung bei allen öffentlichen Upload-Links robuster (v3.7.1)

`compressImage()` (`src/utils/fileStorage.ts`, genutzt von JEDEM
Datei-Upload in der App - Zuschuss-Antrag, Nachweis-Nachreichung,
Beleg-Nachreichung, aber auch den authentifizierten Admin-Formularen)
gab bisher nach je **einem** Versuch mit reduzierter Qualität und
**einem** Versuch mit verkleinerter Auflösung auf und zeigte einen
Fehler ("Bitte einen Ausschnitt oder ein einfacheres Foto verwenden"),
wenn ein sehr großes/detailreiches Foto (z. B. ein modernes 12-48-MP-
Handyfoto) danach immer noch über `MAX_STORED_BYTES` (700 KB) lag.

Jetzt eine echte Schleife (`renderAtSize()` + bis zu 20 Iterationen):
erst Qualität in kleinen Schritten senken (0.92 → 0.4, schont die
Schärfe am meisten), ist die Untergrenze erreicht und es passt immer
noch nicht, die Bildkante verkleinern (bis minimal 800 px) und mit
Qualität 0.75 von vorn - bis es passt oder beide Grenzen erreicht sind
(dann bleibt die bisherige Fehlermeldung als letzter Rückfall). Live
getestet: ein 23,7-MB-Zufallsrausch-Bild (härter als jedes reale Foto,
JPEG-Kompression greift bei echtem Rauschen kaum) wurde zuverlässig auf
genau 700 KB in ~2 s komprimiert; ein realistisches 12-MP-Handyfoto
(1,4 MB) in ~150 ms auf 578 KB. `MAX_STORED_BYTES` (700 KB, mit Blick
auf Firestores 1-MiB-Dokumentgrenze samt Base64-Overhead) bewusst
unverändert gelassen - nur die Komprimierung selbst ist gründlicher.

## Lücke geschlossen: doppelter Zuschuss-Nachweis-Upload über zwei Links (v3.7.2)

Szenario aus der Praxis: Antragsteller bekommt beim Antrag einen
Nachweis-Link, vergisst hochzuladen; der Vorstand fordert per
„Nachweis-Link senden" (`handleResendProofLink`) einen zweiten,
frischen Link an - jetzt existieren zwei gültige Links für denselben
Zuschuss (`subsidyProofToken.ts` erlaubt bewusst mehrfaches Öffnen,
kein Einmalverbrauch). Lädt die Person über den alten Link hoch und
später versehentlich nochmal über den neuen, überschrieb
`handleUploadProof` (`api/subsidy.ts`) die bereits hochgeladene Datei
bisher **stillschweigend** - kein Schutz, keine Warnung.

Die `/nachweis`-Seite selbst schützt bereits vor dem Normalfall: sie
fragt bei jedem Öffnen den *aktuellen* Firestore-Stand ab (nicht
irgendetwas aus dem Link) und blendet das Formular für einen bereits
hochgeladenen Nachweis aus ("liegt bereits vor"). Die Lücke betraf nur
eine **bereits vorher geöffnete, nicht neu geladene** Seite (z. B. ein
alter Browser-Tab), die danach trotzdem abgeschickt wird.

Fix: `handleUploadProof` prüft jetzt zusätzlich zum bestehenden
resolutionId/bezahlt/abgelehnt-Schutz, ob `proofState`/`costProofState`
für den jeweiligen `proofType` bereits `'hochgeladen'` ist, und lehnt in
dem Fall mit `409` und einer klaren Fehlermeldung ab ("liegt bereits vor
... bitte den Vorstand kontaktieren"), statt zu überschreiben. Konnte
lokal nur bis `tsc`/Build verifiziert werden (kein Firestore-
Dienstkonto lokal, wie bei allen `/api/subsidy/*`-Handlern in dieser
Sitzung) - die Logik selbst ist eine einfache, isolierte
Zusatzbedingung direkt neben dem bereits bestehenden, identisch
aufgebauten Sperr-Check.

## Live-Fehler behoben: Firestore-1-MiB-Grenze bei zwei Nachweisen (v3.7.3)

Echter Produktionsfehler, vom Nutzer per Screenshot gemeldet: beim
Hochladen des Kostennachweises über `/nachweis` schlug Firestore fehl
mit "Document ... exceeds the maximum allowed size of 1,048,576 bytes",
obwohl die v3.7.1-Komprimierung (siehe oben) einwandfrei funktionierte.

**Ursache:** `MAX_STORED_BYTES` (700 KB roh, `src/utils/fileStorage.ts`)
war urspruenglich fuer den Fall kalibriert, dass ein Dokument
HOECHSTENS EINE grosse eingebettete Datei enthaelt (700 KB roh × 4/3
Base64-Aufblaehung ≈ 933 KB Zeichenkette im Dokument, sicher unter 1
MiB). Seit dieser Sitzung traegt ein Zuschuss-Dokument aber ZWEI
unabhaengige eingebettete Dateien gleichzeitig (`proofFile` UND
`costProofFile`, Teilnahme-/Kostennachweis) - das wurde beim Einbauen
des zweiten Nachweistyps nicht mit der Speichergrenze abgeglichen.
Zwei Dateien à ≈933 KB ≈ 1,87 MB haben die 1-MiB-Grenze gesprengt,
sobald zum bereits vorhandenen Teilnahmenachweis der Kostennachweis
dazukam.

**Fix:** `MAX_STORED_BYTES` von 700 KB auf 300 KB roh gesenkt (≈400 KB
Base64 je Datei, zwei Dateien zusammen ≈800 KB - mit ≈22 % Puffer unter
1 MiB fuer alle uebrigen Felder). Die serverseitigen Sicherheitsnetze
in `api/subsidy.ts` (`validateProofFile`) und `api/invoice.ts`
(`validateFile`) hatten bisher einen eigenen, unabhaengigen 800-KB-Wert
- jetzt importieren beide `MAX_STORED_BYTES` direkt aus
`src/utils/fileStorage.ts`, damit Client-Ziel und Server-Pruefung nie
wieder auseinanderlaufen koennen.

**Bekannte, verwandte Restrisiko (nicht Teil dieses Fixes):**
`Resolution.attachments` ist ein unbegrenzt wachsendes Array - haengt
jemand ueber die Zeit mehrere grosse Dateien an denselben Beschluss,
addieren sich deren Groessen im selben Dokument genauso auf. Strukturell
dasselbe Muster, aber langsamer/seltener ausgeloest (mehrere einzelne
Anhaenge über Zeit statt zwei Dateien in einem Formular) - bei Bedarf
separat angehen.

Live getestet: ein 9-MB-PNG (Groessenordnung des im Screenshot
gemeldeten Fotos) komprimiert jetzt auf 290 KB roh / 386 KB
Base64-Zeichenkette - zwei solche Dateien bleiben bei ≈772 KB, sicher
unter der 1-MiB-Grenze.

## Termine: Wiederkehrende Serien, Protokoll-/Agenda-Upload, Beschlusserkennung (v3.8.0/v3.9.0)

Bisher musste jede Vorstandssitzung einzeln angelegt werden - kein
Wiederholungsmuster, kein Datei-Anhang fuers Protokoll, keine separate
Agenda-Datei. Vier Teile, alle ueber mehrere Phasen mit Commit nach
jeder Phase umgesetzt:

**1. Wiederkehrende Serien** (`src/utils/recurrence.ts`, neu -
reine Datumslogik ohne React/Firebase-Abhaengigkeit): Outlook-artiges
`RecurrenceRule`-Modell (taeglich / woechentlich mit Wochentags-Set /
monatlich - Tag X oder "3. Donnerstag" / jaehrlich - Datum oder "letzter
Freitag im November"), `generateOccurrenceDates()` erzeugt daraus eine
konkrete ISO-Datumsliste (Ende ueber `endDate`, `count` oder einen
24-Monats-Horizont), `describeRecurrence()` eine menschenlesbare
Zusammenfassung fuers UI. Wichtiger Bugfix: bei `endMode:'afterCount'`
darf der 24-Monats-Horizont NICHT als harte Grenze gelten (sonst wird
vor Erreichen der gewuenschten Anzahl abgeschnitten) - dafuer gilt dort
eine 50-Jahres-Grenze, `count` begrenzt dann tatsaechlich.

`useMeetings.ts` bekam dazu `meetingSeries`-State (eigene
Firestore-Collection, Sync-Muster identisch zu `meetings`) und
`handleCreateMeetingSeries`/`handleUpdateMeetingSeries`/
`handleDeleteMeetingSeries`. Jeder generierte Termin ist ein normaler,
unabhaengig editierbarer `Meeting`-Datensatz (`seriesId` gesetzt) - kein
volles Ausnahme-Tracking wie in Outlook. Stattdessen eine bewusst
einfachere Heuristik ("unveraenderter Termin" = keine Agenda, keine
Anhaenge, keine Teilnahme-Antworten): Aendern/Loeschen einer Serie
ersetzt bzw. entfernt nur zukuenftige, noch unveraenderte Termine -
bereits bearbeitete bleiben unangetastet, mit Hinweis an den Vorstand,
wie viele das betrifft.

`NewMeetingModal.tsx`: Umschalter "Einzeltermin"/"Wiederkehrende Serie"
mit Outlook-artigem Muster-Editor (Haeufigkeit, Intervall, je nach Typ
passende Zusatzfelder, Serien-Ende, Live-Vorschau via
`describeRecurrence()`). Der MS-Teams-Link wird - Nutzerwunsch
ausdruecklich bestaetigt ("der Link fuer Teams bleibt gleich, ist einmal
zu hinterlegen") - **einmal fuer die ganze Serie** aus dem bestehenden
`defaultTeamsUrl`-Feld uebernommen, nicht pro Termin neu abgefragt.

**2. Protokoll- und Agenda-Datei-Upload** (`MeetingsView.tsx`): zwei
neue Upload-Abschnitte in der Termin-Detailansicht, nach dem etablierten
Muster (`DropzoneFileInput` + `prepareFileForStorage`, inkl. der
Komprimierung/Groessengrenze aus v3.7.1/v3.7.3). Neue `MeetingAttachment`-
Felder `protocolFile`/`agendaFile` an `Meeting` (das alte, ungenutzte
`protocol: string`-Feld blieb unangetastet stehen). Die Agenda-Datei ist
**zusaetzlich** zur bestehenden strukturierten TOP-Liste (`agenda:
AgendaItem[]`), die unveraendert bleibt - explizite Nutzervorgabe, da die
TOP-Liste u. a. fuers Dashboard genutzt wird.

**3. Beschlusserkennung aus Protokolltext** (v3.9.0, ersetzt eine
zunaechst gebaute, dann verworfene v3.8.0-Version mit Anthropic-API-
Anbindung, siehe unten): rein textbasiert, **komplett clientseitig,
kein Server-Aufruf, kein API-Key, keine laufenden Kosten**
(`src/utils/protocolResolutionParser.ts`, neu). Statt eine KI ein PDF
lesen zu lassen, bekommt Teams Copilot vom Vorstand ein festes
Ausgabeformat vorgegeben, das jeder Beschluss im generierten
Protokolltext einhalten muss:

```
BESCHLUSS 1
Titel: Freigabe Budget Sommerfest 2026
Text: Der Vorstand beschließt die Bereitstellung eines Budgets von
2.500 € für die Durchführung des Sommerfests.
Betrag: 2500
Kategorie: Veranstaltungen & Projekte
```

(`Betrag`/`Kategorie` optional; `Kategorie` muss - Gross-/Kleinschreibung
egal - exakt einer der sieben `ResolutionCategory`-Werte sein, sonst
bleibt sie leer und wird im Review-Modal von Hand nachgetragen.)
`parseResolutionsFromProtocolText()` splittet den eingefuegten Text an
jeder `BESCHLUSS`-Kopfzeile und liest je Block `Titel:`/`Text:`/
`Betrag:`/`Kategorie:` per Regex aus - ein Block ohne Titel oder Text
wird übersprungen. In `MeetingsView.tsx` gibt es dafuer ein eigenes
Textfeld "Beschluesse aus Protokolltext erkennen" (unabhaengig vom
Datei-Upload des Protokolls, der weiterhin nur der Archivierung dient)
mit Format-Hinweis und Live-Beispiel als Platzhaltertext.

**Wichtigste Leitplanke der ganzen Funktion** (Nutzerentscheidung nach
Rueckfrage, "dringend empfohlen", gilt unveraendert fuer die
textbasierte Version): die Erkennung legt **nie selbst** einen
Beschluss an. `ProtocolScanResultsModal.tsx` zeigt jeden erkannten
Kandidaten einzeln mit Checkbox (Standard: angehakt) und editierbaren
Feldern; erst der Button "X Beschluesse anlegen" ruft fuer die
angehakten Eintraege die **bestehende** `handleCreateResolution`
(`useResolutions.ts`) auf - dadurch laufen Benachrichtigung,
Revisionshistorie und der Abstimmungs-E-Mail-Versand automatisch mit,
ohne die Logik zu duplizieren.

Live getestet: zwei Beschluss-Bloecke im obigen Format korrekt in
Titel/Text/Betrag/Kategorie zerlegt, ein dritter, nicht im Format
gehaltener Absatz ("Verschiedenes: ...") korrekt ignoriert.

**Verworfene v3.8.0-Version (zur Referenz, nicht mehr im Code):**
zunaechst ueber `api/protocolScan.ts` gebaut - ein Endpunkt
`POST meeting/scan-protocol`, der die Anthropic Messages API mit dem
hochgeladenen Protokoll als `document`-Content-Block aufrief (natives
PDF-Verstaendnis). Auf Nutzerwunsch noch VOR dem ersten Produktiveinsatz
verworfen ("kann man es ohne KI bauen, mit Script-Erkennung auf
Textbasis") - keine laufenden API-Kosten, keine Abhaengigkeit von einem
externen KI-Anbieter, funktioniert offline/lokal ohne Secrets. Endpunkt,
Server-Config (`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`) und
`.env.example`-Eintraege wieder entfernt.

## Format-Hinweis fuer Copilot einblendbar gemacht (v3.9.x)

Der Vorstand fragte, wo er das feste "BESCHLUSS/Titel/Text/Betrag/
Kategorie"-Format fuer Copilot wiederfindet. Bei den Sitzungen gibt es
dafuer jetzt einen aufklappbaren Hinweis ("Format fuer Copilot anzeigen")
mit der Vorlage + einem "Format kopieren"-Button. In den Einstellungen
(Tab "MS Teams Link") laesst sich dieser Hinweis ausblenden - eine rein
lokale Geraete-Einstellung (`AppStorage.getShowProtocolFormatHint()`/
`saveShowProtocolFormatHint()`, kein Firestore-Sync), damit jedes
Vorstandsmitglied selbst entscheidet.

## Sitzungen-Ansicht ueberarbeitet: Detail-Fenster, korrekte naechste Sitzung, Absagen, Teams-App-Link (v3.10.0)

Nach dem Anlegen echter Vorstandssitzungen (inkl. Serie) meldete der
Nutzer mehrere konkrete Probleme, alle in einem Rutsch behoben:

**1. Fehlerhafte "naechste Sitzung"-Berechnung.** Frueher wurde an DREI
unabhaengigen Stellen (`App.tsx`, `Header.tsx` per Prop, `DashboardView.tsx`)
jeweils separat `upcomingMeetings[0] || meetings[0]` berechnet - nahm
einfach das erste Array-Element und filterte nur nach dem statischen,
nie aktualisierten `isUpcoming`-Flag (wird bei Erstellung auf `true`
gesetzt und nie wieder neu bewertet), nicht nach dem echten Datum. Damit
konnte eine bereits vergangene Sitzung als "naechste" angezeigt werden.
Fix: EINE zentrale Quelle in `useMeetings.ts`
(`upcomingMeetingsSorted`/`nextMeeting`/`upcomingMeetingsCount`, per
`useMemo` aus `meetings.filter(m => !m.cancelled && m.date >= heute)`
berechnet), an alle drei Stellen durchgereicht.

**2. Layout-Grundproblem: dauerhafte Liste+Detail-Spalten-Ansicht.** Bei
einer langen Serie (Termine ueber mehrere Jahre) war die alte
Liste+Detail-Ansicht unuebersichtlich, und Details weiter unten in der
Liste liessen sich wegen eines separaten Layout-Fehlers
(`.wj-view-enter`-Transform brach `position: fixed`, siehe eigener
CLAUDE.md-Eintrag/Fix) teils gar nicht oeffnen. Neu: `MeetingsView.tsx`
zeigt standardmaessig NUR die naechste Sitzung als Karte; ein Button
"Weitere Termine anzeigen (N)" klappt bei Bedarf die vollstaendige,
nach Datum sortierte Liste auf (inkl. vergangener/abgesagter Termine mit
entsprechenden Badges). Jede Karte oeffnet beim Klick ein eigenstaendiges
Fenster: `MeetingDetailModal.tsx` (neu), extrahiert aus dem bisher fest
in `MeetingsView.tsx` verdrahteten Detailblock (Teams-Link, Kalender-
Sync, Protokoll-/Agenda-Upload, Beschlusserkennung, RSVP, TOP-Liste) -
Modularisierung passend zu [[feedback-avoid-monolithic-files]] und
gleichzeitig die vom Nutzer gewuenschte "in separatem Fenster oeffnen"-UX.

**3. Sitzung absagen, ohne sie zu loeschen.** Neues optionales Feld
`Meeting.cancelled`, Toggle-Button im Modal-Header ("Sitzung absagen" /
"Absage zuruecknehmen", `handleToggleMeetingCancelled` in
`useMeetings.ts`). Abgesagte Sitzungen zaehlen nicht mehr als
"naechste Sitzung", bleiben aber mit rotem "Abgesagt"-Badge in der
Liste sichtbar; Protokoll/Agenda/TOPs bleiben erhalten.
`isUntouchedOccurrence()` behandelt abgesagte Serientermine wie bereits
bearbeitete - eine Serien-Aktualisierung ueberschreibt eine bewusste
Absage nicht mehr automatisch.

**4. MS-Teams-App-Deep-Link.** Neue Hilfsfunktion
`getTeamsAppDeepLink()` (`src/utils/calendar.ts`) ersetzt das Schema
`https://` durch `msteams://` (Rest der URL unveraendert - bestaetigtes
Format laut Microsoft-Doku). Zusaetzlicher Button "In Teams-App oeffnen"
neben dem bestehenden "Jetzt beitreten"-Browser-Link; ohne installierte
Teams-Desktop-App laeuft er ins Leere, deshalb nie als Ersatz, nur als
Zusatz-Option.

**5. Pulsierender Punkt im oberen Banner entfernt.** Der Nutzer meinte
mit "auffaelliges Dings da oben" nicht die Teams-Link-Box im Termin-
Detail (wie zunaechst angenommen), sondern den gruenen, pulsierenden
Punkt (`animate-pulse`) vor "Naechste Vorstandssitzung" im globalen
Banner (`Header.tsx`) - wirkte wie ein Aufnahme-Symbol. Ersatzlos
entfernt, der Banner selbst bleibt unveraendert klein.

Live getestet: korrekte naechste Sitzung nach Filterkorrektur, Detail-
Fenster oeffnet auch fuer einen weit unten in einer langen, gescrollten
Serie liegenden Termin (2028) korrekt im sichtbaren Bereich (bestaetigt
indirekt, dass der separat behobene Fixed-Modal-Layout-Fehler bereits
griff), Absagen/Zuruecknehmen funktioniert und wirkt sich sofort auf die
"naechste Sitzung"-Auswahl aus, `msteams://`-Link wird korrekt erzeugt.

## Oberen Sitzungs-Banner und Termine-Badge entfernt (v3.10.1)

Direktes Nutzer-Feedback nach v3.10.0: der blaue "Naechste
Vorstandssitzung"-Banner ganz oben (`Header.tsx`) wird komplett entfernt
(nicht nur, wie in v3.10.0 angenommen, der pulsierende Punkt) - "braucht
man nicht". Ausserdem die rote Zaehler-Badge bei "Termine" in der
unteren Mobil-Navigation (`MobileBottomNav.tsx`) entfernt: zeigte die
Anzahl kuenftiger Sitzungen an, wirkte durch die vielen
Test-Serientermine dieser Sitzung verzerrt ("23 Stueck") und war als
Benachrichtigung ohnehin unerwuenscht ("macht nur die Leiste unnoetig
schwer"). Nicht mehr benoetigte Props (`upcomingMeeting`/
`onOpenQuickAgenda` in `Header.tsx`, `upcomingMeetingsCount` in
`MobileBottomNav.tsx`/`useMeetings.ts`/`App.tsx`) mit entfernt statt nur
das Rendering zu unterdruecken. Die zentrale `nextMeeting`-Berechnung in
`useMeetings.ts` (siehe v3.10.0) bleibt unveraendert bestehen und wird
weiterhin fuer Dashboard und `QuickAgendaModal` verwendet.

## Drei Live-Fehler behoben: Modal-Hoehe auf Mobilgeraeten, doppeltes Mitglied/Admin-Bug, fehlende Zuschuss-Benachrichtigung (v3.11.0)

Direktes Nutzer-Feedback nach echter Nutzung, drei unabhaengige Fixes:

**1. Modal-Kopfzeile/Schliessen-Kreuz auf iPhone/Android teils nicht
klickbar.** Alle 19 Modals der App nutzten `max-h-[NNvh]` fuer ihre
maximale Hoehe. `vh` reagiert nicht auf die dynamisch ein-/ausblendende
Adressleiste in mobilem Safari/Chrome - je nach ihrem Zustand konnte der
Kopfbereich samt Kreuz ausserhalb des tatsaechlich sichtbaren Bereichs
liegen. Global auf `dvh` (dynamic viewport height) umgestellt
(`sed -i '' -E 's/max-h-\[([0-9]+)vh\]/max-h-[\1dvh]/g' src/components/*.tsx`),
betrifft alle Modals einheitlich. Lokal nur in einem Fenster mit fester
Groesse pruefbar, nicht mit der echten, sich dynamisch aendernden
Adressleiste eines realen Telefons - `dvh` ist die dafuer vorgesehene,
gut unterstuetzte CSS-Loesung.

**2. Neue Person doppelt angelegt + versehentliche Admin-Rechte beim
ersten Google-Login.** Ursache: `AuthModal.tsx::handleGoogleUser` prüfte
sowohl "hat diese Person schon ein Profil" als auch "ist das der
allererste Zugang ueberhaupt" gegen den LOKALEN React-`members`-State
statt gegen Firestore. Auf einem neuen Geraet (kein localStorage) ist
dieser State beim ersten Login immer leer, egal wie viele Mitglieder
tatsaechlich schon existieren - ein vom Admin bereits angelegtes
Mitglied wurde dadurch nicht gefunden (→ Dopplung unter neuer ID) und
`isAdmin: members.length === 0` wertete faelschlich "true" (→
versehentliche Admin-Vergabe). Fix: neue
`FirebaseSync.getMembersOnce()` fragt die Mitgliederliste autoritativ
direkt aus Firestore ab (zu diesem Zeitpunkt bereits erlaubt, da die
Allowlist-Freigabe schon existiert, siehe `firestore.rules::isBoardMember()`)
statt den lokalen State zu verwenden. Schlaegt die Abfrage fehl, bricht
der Login mit klarer Fehlermeldung ab statt stillschweigend mit einer
leeren Liste weiterzumachen (das wuerde denselben Fehler reproduzieren).
**Die bereits entstandene Dopplung aus dem gemeldeten Vorfall muss der
Nutzer einmalig manuell in den Mitgliedseinstellungen bereinigen** - der
Fix verhindert nur kuenftige Vorkommnisse.

**3. Zuschuss-Auszahlungs-Workflow "passiert nicht automatisch".**
Untersucht und festgestellt: der komplette Ablauf (Zuschuss auf
"Geprueft" setzen → `BundleSubsidiesModal.tsx` erstellt einen
Sammelbeschluss → bei Annahme (auch bei Teilabstimmung, sobald die
Mehrheit steht) schaltet ein bestehender `useEffect` in
`useSubsidies.ts` die gebuendelten Zuschuesse automatisch auf
`zur_zahlung_freigegeben` → `SubsidiesView.tsx` zeigt dann automatisch
eine Karte "Ueberweisungsdatei erzeugen" → `SubsidyPayoutModal.tsx`
erzeugt eine SEPA-Datei (`utils/sepa.ts`, pain.001.001.03)) existierte
bereits vollstaendig und lief automatisch. Die tatsaechliche Luecke:
keine Benachrichtigung beim letzten Schritt - man musste zufaellig in
den Zuschuesse-Tab schauen, um die neue Karte zu bemerken. Fix: derselbe
bestehende Effekt loest jetzt zusaetzlich eine In-App-/Push-
Benachrichtigung aus ("💶 Zuschuesse zur Auszahlung bereit"), gebuendelt
pro Sammelbeschluss statt einzeln pro Zuschuss (`releasedByResolution`-
Map). Debugging-Erkenntnis: die Betrags-/Anzahl-Berechnung fuer die
Benachrichtigung darf NICHT innerhalb des `setSubsidies(prev => ...)`-
Updaters befuellt und direkt danach synchron ausgelesen werden - React
garantiert nicht, dass der Updater synchron mit dem `setSubsidies()`-
Aufruf laeuft (fuehrte zu einer leeren Map beim Auslesen trotz korrekt
durchgefuehrter State-Aenderung); die Berechnung laeuft jetzt VOR dem
`setSubsidies()`-Aufruf auf Basis von `subsidies` aus dem Hook-State.
Live getestet (Testdaten manipuliert, Beschluss auf "angenommen"
gebracht): Zuschuss-Status-Wechsel, Benachrichtigung und die
Ueberweisungsdatei-Karte erscheinen korrekt; Benachrichtigung feuert im
lokalen Dev-Modus zweimal (bekannte, bereits dokumentierte React-
StrictMode-Eigenheit, nicht in Produktion).

## Vier weitere Live-Fixes: strengerer Login, Einstellungen-Sperre, Beschluss-Mehrheit, Zuschuss-Reiter (v3.12.0)

Direktes Folge-Feedback nach v3.11.0, vier unabhaengige Aenderungen:

**1. Login noch strenger eingeschraenkt.** Der v3.11.0-Fix (autoritative
Firestore-Pruefung statt lokalem State) reichte dem Nutzer nicht - er
wollte ausdruecklich, dass sich NUR vom Admin bereits vollstaendig
angelegte Personen ueberhaupt anmelden koennen, keine automatische
Profilerstellung mehr fuer freigegebene, aber noch unbekannte
E-Mail-Adressen. `AuthModal.tsx::handleGoogleUser`: die automatische
Anlage ist jetzt auf den einzigen legitimen Fall beschraenkt - eine
komplett LEERE Mitgliederliste (echter Erst-Login, der den Vorstand
einmalig einrichtet). Ist bereits mindestens ein Mitglied vorhanden,
wird der Zugang mit klarer Fehlermeldung verweigert ("Ein Administrator
muss diese Person zuerst unter Einstellungen -> Vorstand vollstaendig
anlegen"), statt automatisch (und ohne Admin-Rechte) ein Profil
anzulegen.

**2. Gesamter Einstellungen-Bereich per Code gesperrt.** Der Nutzer
erwartete beim Oeffnen der Einstellungen einen Code und war ueberrascht,
dass keiner kam - dort wird u.a. die Vorstandsliste verwaltet. Neue
Sperre in `SettingsModal.tsx` (gleicher Löschcode wie beim endgueltigen
Loeschen archivierter Beschluesse und beim Historie-Tab, siehe
`verifyDeleteCode`) fuer den KOMPLETTEN Bereich, nicht nur einzelne
Tabs - zeigt einen Code-Eingabe-Bildschirm anstelle der Tab-Leiste und
des gesamten Inhalts, setzt sich beim Schliessen zurueck. Die
bestehende, eigene Historie-Sperre bleibt zusaetzlich als redundante
zweite Schicht bestehen. Live getestet.

**3. Beschluss blieb trotz erreichter Mehrheit auf "In Abstimmung"
stehen.** Zwei echte Bugs gefunden: (a) Der Mehrheits-Vergleich in
`useResolutions.ts::handleVoteForMember` nutzte `members.length` (ALLE
Mitglieder inkl. nicht stimmberechtigter Festangestellter) statt
`stats.eligibleCount` (nur die tatsaechlich Stimmberechtigten) - bei
Vereinen mit nicht-stimmberechtigten Mitgliedern (Festangestellte)
konnte eine Ja-Mehrheit der Stimmberechtigten dadurch rechnerisch nie
ueber 50% der GESAMTEN Mitgliederzahl kommen und der Beschluss blieb
fuer immer offen. (b) Gravierender: `api/vote.ts` (Abstimmung per
E-Mail-Link, ohne Login) schrieb bisher NUR das Stimmfeld, berechnete
den Beschluss-Status nie neu - ein ausschliesslich per E-Mail-Link
abgestimmter Beschluss wurde dadurch NIE automatisch abgeschlossen,
egal wie viele Stimmen eingingen. Fix: beide Stellen nutzen jetzt
`stats.eligibleCount` als Nenner; `api/vote.ts` importiert
`calculateVoteStats` direkt aus `src/utils/formatters.ts`
(plattformuebergreifender Import wie bei `api/protocolScan.ts` und
`MAX_STORED_BYTES`) und berechnet/schreibt den Status inline mit, inkl.
derselben "Beschluss angenommen"-Benachrichtigung wie der Client-Pfad.
Live per manueller Abstimmung nachgestellt und die Korrektur bestaetigt.

**4. Zuschuesse als Laufbahnsystem mit Reitern.** Der Nutzer wollte
sichtbare Reiter statt der bisher hinter "Filter" versteckten
Status-Auswahl, um auf einen Blick zu sehen, was offen/geprueft/im
Beschluss/zur Zahlung freigegeben/erledigt ist. Neue `SUBSIDY_STAGES`
(`utils/subsidies.ts`) fasst die sieben granularen Status zu fuenf
Phasen zusammen, `SubsidiesView.tsx` zeigt sie als Reiter-Leiste mit
Live-Zaehlern; die automatischen Uebergaenge selbst (siehe v3.11.0,
Punkt 3 dort) blieben unveraendert - die Reiter sind reine
Navigation/Uebersicht. Zusaetzlich ein dedizierter "Als geprueft
markieren"-Button bei offenen Antraegen statt nur der generischen
Status-Auswahlliste. Live getestet (Reiter-Zaehler, Filterung, Button).

## Beschluss-Selbstheilung, Zuschuss-Vollautomatik, Rollen-Katalog, Einladungs-E-Mail (v3.13.0)

Direktes Folge-Feedback nach v3.12.0, vier Themen:

**1. Beschluss-Selbstheilung.** Der Mehrheits-Fix aus v3.12.0 korrigiert
nur *kuenftige* Stimmabgaben - ein Beschluss, der schon VORHER genug
Ja-Stimmen der Stimmberechtigten hatte, wurde nie neu bewertet (dafuer
braucht es normalerweise eine neue Stimme, und alle Berechtigten hatten
ja schon abgestimmt). Neuer Reconciliation-`useEffect` in
`useResolutions.ts`: prueft bei jedem Laden alle `in_abstimmung`-
Beschluesse gegen die aktuelle Formel nach und schliesst sie bei Bedarf
nachtraeglich (inkl. Audit-Log-Eintrag + derselben "Beschluss
angenommen"-Benachrichtigung). Live getestet: ein kuenstlich
zurueckgesetzter, aber bereits mehrheitlich angenommener Beschluss
korrigiert sich beim Laden automatisch, ganz ohne neue Stimme.

**2. Zuschuss-Pipeline: keine freie Status-Wahl mehr, SEPA = automatisch
erledigt.** Der Reiter-Umbau aus v3.12.0 allein reichte dem Nutzer nicht
- er wollte, dass der Status **nie** frei waehlbar ist (nur als bewusste
Ausnahme). `SubsidiesView.tsx`: der Status-Dropdown steckt jetzt hinter
"Status manuell aendern (Ausnahme)", eingeklappt per Default, nicht mehr
gleichrangig neben "Bearbeiten"/"Entfernen". `SubsidyPayoutModal.tsx`:
das Erzeugen der SEPA-Datei markiert die gewaehlten Zuschuesse jetzt
automatisch als erledigt (`onMarkPaid` direkt im Anschluss an den
Download) - der bisherige zweite Bestaetigungsschritt ("Als „Bezahlt"
markieren" / "Spaeter markieren") entfaellt. Live getestet.

**3. Rollen-Katalog statt fester `BoardRole`-Liste + Admin-Konzept
entfernt.** Die alte Liste (`Kreissprecher / Vorsitzender`, ...)
entsprach nicht den echten Posten (`President`/`Vize President`/
`Schatzmeister`/`Past Year President`) und aendert sich durch jaehrliche
Neuwahlen - jetzt ein admin-editierbarer Katalog
(`src/data/roleCatalogue.ts`, Firestore-Dokument
`settings/roleCatalogue`, gleiches Muster wie
`SubsidyCatalogueSettings`). `BoardRole` ist jetzt `string` statt
striktem Union-Typ (Rolle ist reines Anzeige-Feld, keine
Berechtigungslogik haengt daran). Mitgliederzeilen in
`SettingsModal.tsx` sind jetzt klickbar und klappen einen
Bearbeiten-Bereich auf (Rolle zuweisen - bisher nur beim Anlegen
moeglich, nicht nachtraeglich). Admin-Badge/-Konzept ersatzlos entfernt
(wertete ohnehin nirgends echte Berechtigungen aus, der
Einstellungen-Loeschcode aus v3.12.0 ist die eigentliche
Zugriffskontrolle) - `isAdmin` bleibt optional im Typ, wird aber
nirgends mehr gesetzt/angezeigt (auch nicht mehr beim Erst-Login-
Bootstrap in `AuthModal.tsx`). Live getestet inkl. konkreter
Rollen-Zuweisung.

**4. Einladungs-E-Mail.** Neue `sendMemberInvite()`
(`emailService.ts`), nutzt das bestehende einfache `sendMail()` (reine
Info-Mail, kein Token/Server-Endpunkt noetig): Link zum Portal +
Installationsanleitung fuer iPhone (Safari → Teilen → Zum
Home-Bildschirm)/Android (Chrome-Menue → App installieren)/Computer
(nichts einzurichten). Nach dem Anlegen fragt die App direkt nach
("Soll {Name} eine Einladung bekommen?"), im Bearbeiten-Bereich
zusaetzlich ein "Einladung (erneut) senden"-Button - nutzt den bisher
ungenutzten `credentialsSentAt`-Zeitstempel auf `BoardMember` fuer die
Anzeige "Zuletzt gesendet am ...". Lokal nur bis zur erwarteten
Fehlermeldung pruefbar (kein SMTP lokal konfiguriert, wie bei allen
E-Mail-Flows dieser App).

---

## v3.15.0 - Auslagenerstattung als eigener Bereich, Handlungsbedarf-Kacheln, SEPA-Pruefung

**1. Auslagenerstattung (neuer Reiter "Auslagen").** Zweiter Vorgangstyp
mit exakt demselben Freigabe-Ablauf wie Zuschuesse (eingereicht →
geprueft → im Beschluss → zur Zahlung freigegeben → bezahlt), aber
getrennten Reitern. Umgesetzt **nicht** als kopiertes Modul, sondern als
Unterscheidungsmerkmal `Subsidy.kind: 'zuschuss' | 'auslage'` auf dem
bestehenden Datensatz (alte Dokumente ohne Feld gelten als `zuschuss`,
siehe `subsidyKind()` in `utils/subsidies.ts`). Damit gelten alle
Sperr-, Kaskaden- und Auszahlungslogiken automatisch fuer beide Arten -
eine Kopie waere zwangslaeufig auseinandergelaufen.
`SubsidiesView`/`NewSubsidyModal`/`BundleSubsidiesModal`/
`SubsidyPayoutModal` bekommen eine `kind`-Prop und filtern/beschriften
sich darueber (`KIND_TEXTS`).

Unterschiede zum Zuschuss: kein Richtlinien-Katalog und **keine
Budgetanrechnung** (`countsTowardsBudget()` zaehlt nur Zuschuesse, das
Budget-Panel ist im Auslagen-Reiter ausgeblendet), Veranstaltung
optional/frei benannt, und **der Beleg ist beim Einreichen Pflicht** -
ohne Rechnung gibt es nichts zu erstatten und nichts zu pruefen.
Oeffentliches Formular unter **`/auslage`** (`ExpenseSubmissionPage.tsx`,
gleicher Zugangscode wie `/antrag`), serverseitig
`handleSubmitExpense()` in `api/subsidy.ts` → Route
`subsidy/submit-expense`. Der Beleg wird als `costProofFile` abgelegt,
`proofState` steht auf `anderweitig` (einen separaten Teilnahmenachweis
gibt es hier nicht). Benachrichtigung + E-Mail an den Schatzmeister wie
beim Zuschuss.

Neu fuer beide Arten: **"Bestehendem Beschluss zuordnen"** direkt an
einem geprueften Vorgang (bisher nur im versteckten Ausnahme-Pfad). Die
Zuordnung setzt den Stand auf `im_beschluss`; ist der Beschluss bereits
angenommen, gibt ihn die vorhandene Kaskade sofort zur Zahlung frei.
Auslagen-Belege erscheinen zusaetzlich lesend in der Rechnungsuebersicht
("Belege aus Auslagen"), damit jede Rechnung des Vereins an einer Stelle
auffindbar bleibt.

**2. Handlungsbedarf-Kacheln in der Uebersicht.** `DashboardView` zeigt
oben Zahlen-Kacheln fuer Beschluesse in Abstimmung, Zuschuesse/Auslagen
"zu pruefen" und "zur Zahlung" - jede springt in den passenden Reiter.
Kacheln mit Zaehler 0 werden ausgeblendet.

**3. SEPA-Datei gegen das echte Schema geprueft.** Die von der Sparkasse
abgelehnte Datei wurde mit `xmllint` gegen das offizielle
`pain.001.001.09.xsd` validiert - Ursache war eindeutig das fehlende
Pflichtelement `DbtrAgt` (Fix in v3.14.6), die bankeigene Beispieldatei
validiert einwandfrei. Das Schema liegt jetzt unter
`schemas/pain.001.001.09.xsd` im Repo, dazu **`npm run check:sepa`**
(`scripts/check-sepa.mjs`): erzeugt beide Varianten (mit/ohne
Vereins-BIC) und validiert sie. Bei kuenftigen Aenderungen an
`utils/sepa.ts` immer laufen lassen - genau dieser Fehler ist zweimal
erst beim Nutzer aufgefallen. Dateinamen enthalten jetzt Zweck, Anzahl
der Einzelueberweisungen und Gesamtsumme
(`WJOF_Auslagen_2026-09-08_2-Ueberweisungen_150-50-EUR.xml`), ebenso die
QR-Code-PDF.

## v3.16.0 - Festschreibung, App-Sperre, Downloads auf dem iPhone, Beschlussauswahl

**1. Festschreibung von Beschluessen** (`utils/resolutionLock.ts`). Haben
alle Stimmberechtigten abgestimmt, bleiben 24 Stunden fuer Korrekturen,
danach sind Stimmabgabe und -aenderung gesperrt (Kommentare, Rechnungen,
Anhaenge bleiben moeglich). **Berechnet, nicht gespeichert**: kein
Hintergrundjob noetig, und `api/vote.ts` prueft E-Mail-Stimmen mit
derselben Funktion. Gespeichert wird nur die Aufhebung (`lockLiftedAt`,
`lockLiftedBy`) - nur mit dem Admin-Code (= Loeschcode,
`verifyDeleteCode`), danach erneut 24 Stunden ab Aufhebung bzw. letzter
Stimme. Sperre greift doppelt: `useResolutions.handleVote` UND
`handleVoteForMember` (gibt jetzt `boolean` zurueck). Serverseitig ohne
`eligibleVoterIds` am Beschluss keine Festschreibung (nur Altbestand).

**2. Rueckfrage bei Nein/Enthaltung.** Ja geht ohne Rueckfrage durch; eine
erste Stimme mit Nein/Enthaltung laeuft ueber `pendingVoteChange` (Feld
`previous` jetzt optional - gesetzt = Stimmaenderung, leer = Bestaetigung)
mit "Doch mit Ja stimmen". Gilt auch fuer `?action=vote` und fuer den
E-Mail-Link: `api/vote.ts` zeigt bei no/abstain erst eine
Bestaetigungsseite, verbucht wird mit `&confirm=1` (Nonce wird erst dann
verbraucht).

**3. App-Sperre beim Zurueckkehren** (`useMembers.ts`, `BiometricLock.tsx`).
War die App laenger als `RELOCK_AFTER_MS` (seit v3.16.1: 2 Minuten) im Hintergrund
(`visibilitychange`), wird gesperrt; ebenso bei jedem neuen Start - jetzt
fuer alle, nicht nur mit Face ID. Entsperren per Face ID/Touch ID oder
Vorstandscode (5 Fehlversuche = Abmeldung). Vom Code Befreite ohne Face ID
muessen sich neu anmelden. Die Frist verhindert, dass Face-ID-Abfrage,
Foto-Auswahl oder Teilen-Menue die App selbst sperren; Verstecken WAEHREND
der Sperre zaehlt nicht.

**4. Downloads auf dem iPhone - alles ueber `saveFile()`**
(`utils/fileHelpers.ts`). Symptom: Bild-Download in der Vorschau liess die
installierte App kurz "blinken", danach hing JEDER weitere Download
(auch SEPA) bis zum Neustart. Ursachen: `<a download href="data:...">`
bzw. `window.open(dataUrl)` in der Home-Bildschirm-App, und
`URL.revokeObjectURL` direkt nach `click()`. Jetzt: auf iPhone/iPad
`navigator.share({ files })` (Teilen-Menue), sonst Blob-Download mit
verzoegerter Freigabe. `dataUrlToBlob` ist bewusst synchron (Tipp-
Berechtigung fuers Teilen-Menue). PDFs oeffnen ueber `openDataUrl`.
**Keine neuen Download-Links mehr direkt bauen.** Ausnahme: `.ics`
(Kalender) bleibt ein normaler Download, damit iOS "Zum Kalender
hinzufuegen" anbietet. Nicht auf einem echten iPhone getestet.

**5. Bildvorschau** (`FilePreviewModal.tsx`): eigener Zoom (Zwei Finger,
Doppeltippen, Mausrad/Trackpad, Verschieben) - die Seite selbst ist per
`user-scalable=no` nicht zoombar. Hintergrund-Scrollen gesperrt, Esc
schliesst.

**6. Sammelueberweisung** (`SubsidyPayoutModal.tsx`): Phasen form →
working (nur QR-PDF) → done mit Animation; die erzeugte Datei bleibt im
State, wird mit Namen angezeigt und ist per "Datei speichern" erneut
abrufbar, dazu "Wo finde ich die Datei?". `saveFile` wird VOR den
State-Updates angestossen (Teilen-Menue braucht den frischen Tipp).

**7. Beschlussauswahl** (`ResolutionPicker.tsx`, in `BundleSubsidiesModal`
und beiden Zuordnungsstellen in `SubsidiesView`): Suche, Budget, Datum
(beschlossen/erstellt); Beschluesse mit Buchhaltung "bearbeitet" oder
"nicht notwendig" werden nicht mehr vorgeschlagen.

**8. Korrektur zu v3.15.0:** Die Aussage "die Kaskade gibt eine Zuordnung
zu einem angenommenen Beschluss sofort frei" stimmte nicht - der Effekt
hing nur an `[resolutions]`, eine neue Zuordnung aendert aber nur den
Vorgang. Jetzt setzt `handleReassignSubsidyResolution` bei angenommenem
Beschluss direkt `zur_zahlung_freigegeben`, und die Kaskade reagiert
zusaetzlich auf `subsidies`.

**9. Beschlussliste:** Symbole je Eintrag - Bueroklammer mit Anzahl
(Anhaenge + Rechnungen), "Z n" (Zuschuesse), "A n" (Auslagen), Schloss bei
Festschreibung.

## v3.16.1 - Fenster respektieren den Geraeterand, Animationen vervollstaendigt

**Fenster unter der Statusleiste.** In der installierten iPhone-App
(`viewport-fit=cover`) lag der Kopf der Fenster samt Schliessen-Kreuz unter
Uhrzeit/Akku (gemeldet am Termin-Fenster, betraf aber alle). Neu in
`index.css`: **`wj-overlay`** fuer den abgedunkelten Hintergrund
(Innenabstand = Safe Area + 0,5rem) und **`wj-overlay-panel`** fuer das
Fenster selbst (Hoehe = Bildschirm minus beide Raender) - beide bewusst
ausserhalb von `@layer`, damit sie immer gegen Tailwind-Utilities gewinnen.
Alle 26 Fenster umgestellt, `max-h-[92dvh]`/`[90dvh]` gibt es nicht mehr.
Fenster mit fester Innenhoehe (`max-h-[80dvh]` im Inhalt:
`InvoiceDetailModal`, `NewMeetingModal`) sind jetzt `flex flex-col` mit
`flex-1 min-h-0` im Inhalt. **Neue Fenster immer mit diesen beiden Klassen
bauen.**

**Animationen.** Jeder Fenster-Hintergrund blendet ein; ohne Animation
waren Anmeldefenster, Update-Hinweis und Verbindungspruefung. Die Schritte
im Anmeldefenster haben jetzt einen `key` - ohne ihn verwendet React das
`div` weiter und die Animation laeuft nicht. Ebenso `key` am Beschluss in
der Detailansicht (Wechsel zwischen Beschluessen). Aufklapp-Animation
(`wj-expand`) ergaenzt bei: Termine "alle", Formathinweis im Termin,
Beschlussauswahl (Zuschuesse + Buendeln), manueller Status. Schliess-
Animationen gibt es weiterhin nur in `SettingsModal`
(`useModalTransition`) - die uebrigen Fenster werden vom Aufrufer per
`{isOpen && ...}` entfernt, dafuer muesste jedes umgebaut werden.

**App-Sperre:** Frist auf 2 Minuten (Nutzerwunsch - Belegsuche in Fotos
oder Dateien dauert laenger als 15 s).

## v3.17.0 - Anmeldung mit E-Mail + Passwort (Standard), Einladung, Passwort vergessen

**Warum:** Nicht jedes Vorstandsmitglied hat ein Google-Konto. E-Mail +
Passwort ist jetzt die Standard-Anmeldung, Google bleibt als zweiter Weg.
In Firebase ist *Authentication → Sign-in method → E-Mail/Passwort*
aktiviert (vom Nutzer erledigt).

**Ablauf** (`api/auth.ts`, alles ueber die vorhandene Netlify-Function und
das vorhandene `FIREBASE_SERVICE_ACCOUNT`, keine neuen Variablen):
1. *Einstellungen → Vorstand → Person freigeben* legt Mitglied + Freigabe an,
   danach "Einladung senden" → `POST /api/auth/invite`. Der Server prueft das
   ID-Token des Einladenden (Signatur gegen die securetoken-Zertifikate, Projekt,
   Ablauf, Freigabeliste), legt das Firebase-Konto **bereits bestaetigt** mit
   Zufallspasswort an und schickt die Einladung aus dem Gmail-Postfach.
2. Die Einladung verlinkt `/passwort?t=...` - ein eigener, 14 Tage gueltiger
   HMAC-Link (`api/inviteToken.ts`, Schluessel `VOTE_LINK_SECRET` mit Zweck
   "invite:"). **Grund:** Firebase-Codes zum Passwort-Festlegen gelten nur
   1 Stunde. Erst beim Oeffnen tauscht `POST /api/auth/invite-exchange` den
   Link gegen einen frischen Code. Verbraucht, sobald `passwordUpdatedAt`
   juenger als der Link ist.
3. `/passwort` (`src/public/PasswordSetupPage.tsx`) setzt das Passwort per
   `confirmPasswordReset` direkt bei Firebase - das Passwort beruehrt den
   eigenen Server nie. Danach Installationsanleitung (`InstallGuide.tsx`).
4. "Passwort vergessen" → `POST /api/auth/password-reset`: gleiche Antwort
   egal ob freigegeben (keine Mitglieder-Ausforschung), 2 Minuten Sperre je
   Adresse (`passwordResets/{email}`), Link `/passwort?oobCode=...` (1 Stunde).

**Sicherheit - wichtig:** Firebase erlaubt Selbstregistrierung mit E-Mail +
Passwort. Ohne weitere Pruefung koennte sich jemand ein Konto mit der Adresse
eines Vorstandsmitglieds anlegen und kaeme an die Daten. Deshalb verlangen
`firestore.rules` jetzt `request.auth.token.email_verified == true`, das
Anmeldefenster weist unbestaetigte Konten ab, und `ensureVerifiedAccount`
setzt bei einem vorgefundenen unbestaetigten Konto ein neues Zufallspasswort
und entwertet alle Sitzungen (`validSince`), bevor es bestaetigt wird.
Google-Konten sind immer bestaetigt. **Die Regeln muessen in der Konsole
veroeffentlicht sein** - der Code allein schliesst die Luecke nicht.

**Dienstkonto:** Das OAuth-Token fragt jetzt zusaetzlich den Bereich
`identitytoolkit` an (`firestoreAdmin.ts`). Das Firebase-Admin-Dienstkonto hat
die Rechte dafuer standardmaessig.

**Einladungs-Mail** (`api/authEmails.ts`): drei nummerierte Schritte, die
App-Installation als eigener, orange hervorgehobener Schritt 2 mit Hinweis
"In Safari oeffnen" (aus Gmail/Outlook heraus fehlt sonst "Zum
Home-Bildschirm"). Vorher stand die Anleitung klein am Ende und wurde
uebersehen. Der Vorstandscode steht bewusst nicht in der Mail.

**Nicht lokal testbar:** Ohne `FIREBASE_SERVICE_ACCOUNT` antworten die
Endpunkte mit "Firebase-Zugang fehlt"; getestet wurden lokal nur Seiten,
Routing und Fehlerpfade.

## v3.17.1 - Hinweis: Google nur mit der hinterlegten Adresse

Typischer Fehlversuch: "Mit Google anmelden" mit dem privaten Google-Konto,
waehrend im Portal eine andere Adresse hinterlegt ist. Jetzt steht ein
kurzer Hinweis unter dem Google-Knopf, die Fehlermeldung nennt bei
Google-Konten (`providerData` enthaelt `google.com`) die verwendete Adresse
und beide Auswege, und Einladungs-Mail sowie Einstellungen erwaehnen es.
Der Google-Anbieter nutzt `prompt: 'select_account'`, nach dem Fehlversuch
wird abgemeldet - beim naechsten Versuch erscheint also wieder die
Kontoauswahl.

## v3.17.2 - Entwickler-Login fuer lokale Tests (echte Daten)

**Problem:** Lokal (`npm run dev`) kam nach dem alten "Entwickler-Login" nur
"Keine Verbindung": der Knopf meldete sich nie bei Firebase an, die
Datenbankregeln liessen nichts durch.

**Loesung:** Ein eigenes Firebase-Konto "Entwickler (lokal)" (Adresse
`offenbachwj@gmail.com` - das Portal-Postfach, zuerst war `offenbachwj+entwickler@gmail.com` geplant -, **ohne Stimmrecht und nicht festangestellt**, damit das Live-Portal fuer dieses Google-Konto den Vorstandscode verlangt). Die Zugangsdaten
stehen in `.env.local` (`DEV_LOGIN_EMAIL`, `DEV_LOGIN_PASSWORD`, per
`.gitignore` ausgeschlossen). Der Knopf holt sie ueber `GET /api/dev/login` -
diese Route gibt es **nur in `server.ts`** (nie in `api/router.ts`, also nie
auf Netlify), sie antwortet nur an Loopback-Adressen mit Host `localhost` und
nicht bei `NODE_ENV=production`. Bewusst keine `VITE_`-Variablen:
`src/lib/firebase.ts` liest `import.meta.env` als Ganzes, Vite wuerde sonst
alle `VITE_`-Werte in das Bundle schreiben.

Lokal (`import.meta.env.DEV`) entfallen Vorstandscode (`proceedWith`) und
App-Sperre (`useMembers`). Im Produktions-Build ist `DEV` fest `false`, die
Zweige werden entfernt.

**Einmalige Einrichtung des Kontos:** Im Live-Portal *Einstellungen → Vorstand
→ Person freigeben* (Name "Entwickler (lokal)", Stimmrecht aus), Einladung
senden, Mail im Portal-Postfach oeffnen, auf /passwort das Passwort aus
`.env.local` eintragen.

**Achtung:** Lokale Aenderungen landen in der echten Datenbank. Mails und
Einladungen funktionieren lokal nicht (kein SMTP, kein Dienstkonto).

**Arbeitsablauf ab jetzt:** Claude committet nur. Der Nutzer testet lokal und
pusht selbst (`git push`).

## v3.17.3 - Einladung scheiterte bei Adressen mit "+"

Die Einladung an `offenbachwj+entwickler@gmail.com` meldete "noch nicht
freigegeben", obwohl `allowlist/offenbachwj+entwickler@gmail.com` in Firestore
existierte (in der Konsole geprueft). Ursache: `firestoreAdmin.ts` setzte den
Dokumentpfad unmaskiert in die REST-URL, ein "+" im Pfad wurde als Leerzeichen
gelesen. Jetzt maskiert `encodeDocumentPath()` jedes Pfadstueck
(`encodeURIComponent`). Betrifft alle Server-Zugriffe; Adressen ohne
Sonderzeichen waren vorher schon korrekt.

## v3.17.4 - Sicherheitsluecke "Vorstandsmitglied wechseln" geschlossen, doppelte Adressen

**Sicherheitsluecke (vom Nutzer gefunden):** Im Menue oben rechts gab es aus
der urspruenglichen AI-Studio-Vorlage die Liste "Vorstandsmitglied wechseln"
(`Header.tsx` → `useMembers.handleSelectMember`). Ein Tipp setzte
`authSession.user` auf ein anderes Mitglied - danach liefen Stimmen,
Kommentare und Aenderungen in dessen Namen. Die Firestore-Regeln verhindern
das nicht (jedes freigegebene Mitglied darf alles schreiben). Liste und
Funktion ersatzlos entfernt.

**Doppelte E-Mail-Adressen:** "WJ OF" und "Entwickler (lokal)" hatten beide
`offenbachwj@gmail.com`. Folgen: die Anmeldung nahm die erste passende Person
(`AuthModal.handleSignedInUser` → `find`), und das Loeschen einer der beiden
haette die Freigabe fuer beide entfernt. Jetzt: Anlegen weist eine schon
vergebene Adresse ab; Loeschen entfernt die Freigabe nur, wenn keine andere
Person die Adresse nutzt. "Festangestellt" wird nach dem Anlegen
zurueckgesetzt (blieb vorher fuer die naechste Person angehakt).

## v3.17.5 - "Festangestellt" nachtraeglich aenderbar

Im Bearbeiten-Bereich einer Person (Einstellungen → Vorstand → Person
antippen) gibt es jetzt den Haken "festangestellt (kein Vorstandscode
noetig)" - vorher nur beim Anlegen setzbar. Beim Umschalten wird
`isVotingMember` ausdruecklich mitgeschrieben, weil `isVotingMember()` bei
Altbestand ohne eigenes Feld das Stimmrecht aus `isPermanentStaff` ableitet.
Hinweis: `securitySettings.exemptMemberIds`/`exemptEmails` befreien ebenfalls
vom Code, werden aber von keiner Stelle der App mehr geschrieben.

## v3.17.6 - Geloeschte Mitglieder kamen wieder (ganze Liste wurde zurueckgeschrieben)

**Beobachtung (13.09.2026):** "Entwickler (lokal)" im Portal geloescht, kurz
darauf existierte `members/mem_1789290504769` wieder - mit **derselben
Kennung**. Also kein erneutes Anlegen, sondern ein Zurueckschreiben.

**Ursache:** `useMembers.handleUpdateMembers` (jede Aenderung an einer Person:
Rolle, Stimmrecht, Einladung gesendet) und der Knopf "Cloud synchronisieren"
riefen `FirebaseSync.syncAllMembers(liste)` auf: die komplette Liste des
Geraets per `setDoc(merge)` hochladen und alles loeschen, was lokal fehlt.
Jedes Geraet mit veraltetem Stand (anderer Browser, lokale Testsitzung)
stellte so Geloeschtes wieder her bzw. haette Neues geloescht. Welches Geraet
es konkret war, laesst sich nicht mehr feststellen.

**Behoben:** `handleUpdateMembers` speichert nur noch Mitglieder, deren Inhalt
sich gegenueber dem vorigen Stand geaendert hat (`saveMember`). Loeschen nur
gezielt ueber `deleteMember`, Freigaben nur beim Anlegen/Entfernen.
`syncAllMembers` ist entfernt, der Sync-Knopf fasst die Mitglieder nicht mehr
an. Die automatische Abmeldung entfernter Personen vergleicht nur noch die
Kennung (vorher auch die Adresse - bei doppelter Adresse blieb die geloeschte
Person angemeldet).

## v3.17.7 - Namen bestehender Personen aenderbar

Einstellungen → Vorstand → Person antippen: neues Feld "Name" mit
"Speichern" (auch per Enter). Kuerzel wird neu aus dem Namen gebildet. Die
E-Mail-Adresse bleibt bewusst fest (Anmeldung, Freigabeliste). Bereits
gespeicherte Stimmen/Kommentare behalten den damaligen Namen (`memberName`
wird beim Abstimmen kopiert). `handleUpdateMembers` gleicht jetzt auch
`authSession.user` ab, damit Aenderungen an der eigenen Person sofort im
Kopfbereich sichtbar sind.

## v3.17.8 - Einstellungen lokal ohne Admin-Code testbar

Admin-Code und Vorstandscode liegen nur als SHA-256-Hash vor; Claude kennt sie
nicht und soll sie nicht durchprobieren. Damit Einstellungen und Historie
trotzdem lokal testbar sind, starten beide Sperren in `SettingsModal` bei
`npm run dev` (`import.meta.env.DEV`) entsperrt. Im Produktions-Build bleibt es
bei `false`. **Bewusst weiter geschuetzt, auch lokal:** Admin-Code vor dem
endgueltigen Loeschen, vor dem Aufheben einer Festschreibung und beim Aendern
des Admin-Codes - lokal wird mit echten Daten gearbeitet.

## v3.17.9 - Rollen-Auswahl zeigt Rollen ausserhalb des Katalogs

Beim lokalen Test gefunden: "WJ OF" hat die Rolle "Schriftfuehrer /
Protokoll", die nicht im Rollen-Katalog steht - die Auswahl im
Bearbeiten-Bereich zeigte deshalb "noch keine", ein Tippen haette die Rolle
still ueberschrieben. Die bisherige Rolle erscheint jetzt als eigene Option
"(nicht im Rollen-Katalog)".

## v3.18.0 - Start haengt nicht mehr, "verbunden aber keine Daten" abgefangen

**Anlass:** Bei der Vorstellung im Vorstand blieb die App auf "Verbindung wird
geprueft" haengen bzw. zeigte trotz Verbindung keine Daten - nur ein Neustart
half.

**Ursachen:**
1. Der Sync-Effekt in `App.tsx` lief einmal beim Mount (`[]`) und abonnierte
   sofort alle Sammlungen - ohne auf die asynchron wiederhergestellte
   Firebase-Anmeldung zu warten. War er schneller, lehnten die Regeln die Abos
   ab; ein abgelehntes `onSnapshot` beendet Firebase endgueltig. Die spaetere
   Pruefung meldete "ok", Daten kamen trotzdem nie. Nach einer frischen
   Anmeldung wurden die Abos ebenfalls nie neu aufgebaut.
2. `checkConnection()` hatte keine Zeitgrenze, und der Schreibtest wartet bei
   wackliger Verbindung auf die Server-Bestaetigung - endloses Warten.

**Loesung:**
- `onAuthStateChanged` → `firebaseUid`; der Sync-Effekt haengt an
  `[firebaseUid, syncEpoch]` und startet erst mit Anmeldung.
- Lokal gemerkte Sitzung ohne Firebase-Anmeldung → `handleLogout()` (statt
  ewig "Keine Verbindung"). `handleLogout` meldet jetzt auch bei Firebase ab.
- Gate: eigener Effekt, einmal je Anmeldung, nur Lesetest (`checkRead`),
  **5 s Zeitgrenze** → einmal automatisch neu laden (`reloadOnce`, hoechstens
  alle 2 Minuten per `sessionStorage`), sonst Meldung mit "Erneut versuchen"
  (baut Pruefung + Abos neu auf) und "App neu laden". Schreibtest nur noch im
  Hintergrund fuer den "Sync blockiert"-Hinweis.
- Watchdog: kommt 8 s nach dem Abonnieren keine Mitgliederliste (nie leer),
  Abos neu aufbauen (`syncEpoch`), beim zweiten Mal einmal neu laden. Nicht
  waehrend der Anmeldung (Code-Schritt). Eine angekommene Mitgliederliste
  setzt das Gate auf "ok".
- Nach > 5 Minuten im Hintergrund werden die Abos neu aufgebaut (abgerissene
  Verbindungen auf dem iPhone).
- `applyRemote` laedt bei leerer Cloud-Sammlung **nicht** mehr den lokalen
  Stand hoch - mit dem haeufigeren Neuaufbau haette das Geloeschtes
  wiederhergestellt (gleiche Fehlerklasse wie `syncAllMembers`).

**Lokal getestet:** Neuladen zeigt Daten; Abmelden → Entwickler-Login zeigt
Daten ohne Neustart; keine abgelehnten Abos in der Konsole. Nicht simulierbar:
haengende Leitung auf dem iPhone (5-s-Neuladen) - nur im Feld pruefbar.

## v3.19.0 - Übersicht mit Modulen, „Alle" am Ende, Beschlussbereiche

**Übersicht** (`DashboardView.tsx`, Baustein `DashboardModule.tsx`): unter der
Vorstandssitzung untereinander drei Module – Beschlüsse, Zuschüsse, Auslagen.
Nur Zähler, nichts bearbeitbar. Zeilen mit 0 und leere Module werden
ausgeblendet. Ein Tipp springt in den Reiter mit vorausgewählter Phase bzw.
Bereich (`OverviewTarget`; in `App.tsx` als `overviewTarget`, wird nach dem
Reiterwechsel wieder geleert, damit die normale Navigation mit der
Standard-Vorauswahl startet). Zuschüsse zählen über alle Jahre, beim Sprung
wird das neueste betroffene Jahr gewählt. Ersetzt die Handlungsbedarf-Kacheln
(v3.15.0) und die aufklappbare Liste offener Beschlüsse; der Hinweis „wartet
auf deine Stimme" oben bleibt.

**Zuschüsse/Auslagen:** „Alle" steht hinter „Erledigt" und zeigt jetzt
wirklich alle (vorher ohne Erledigte). Vorauswahl ist die erste nicht
erledigte Phase mit Einträgen (`defaultSubsidyStage`).

**Beschlüsse:** Reiter Offen / Abgestimmt · Buchhaltung offen / Alle
(`utils/resolutionSections.ts`). „Buchhaltung offen" = angenommen, Buchhaltung
weder „bearbeitet" noch „nicht notwendig"; abgelehnte stehen nur unter
„Alle". Im Archiv keine Reiter. Jede Zeile zeigt Erstell- und Beschlussdatum
(`passedAt` wird nur bei angenommenen gesetzt).

## v3.20.0 - Personen: Vor-/Nachname, Zuordnung über den Namen, Personenübersicht

**Warum die Grenze je Person nie griff:** Der Server legte bei **jedem**
öffentlichen Antrag (`/antrag`, `/auslage`) eine neue Person an. Außerdem war
die Personenliste nur über ein kleines Symbol erreichbar.

**Jetzt:**
- Formulare und Personenfenster fragen Vor- und Nachname getrennt ab.
  `SubsidyPerson.firstName/lastName` sind optional, `name` bleibt der
  Anzeigename; ältere Einträge über `splitPersonName()`.
- `findOrCreatePublicPerson()` (`api/subsidy.ts`) liest die Personen über das
  neue `FirestoreAdmin.listDocuments()` und sucht denselben `normalizeNameKey`
  – Reihenfolge, Groß-/Kleinschreibung, Umlaute (ü = ue), Akzente und
  Bindestriche egal. Treffer → Vorgang wird dieser Person zugeordnet.
  **Bestehende E-Mail/IBAN werden nie überschrieben** – sonst könnte jeder mit
  dem Zugangscode unter fremdem Namen die IBAN eines Mitglieds austauschen.
  Fehlende Angaben werden ergänzt, Abweichungen stehen als „Hinweis: Im
  Formular abweichend angegeben …" in der Notiz des Vorgangs. Ist die Liste
  nicht lesbar, wird wie früher neu angelegt (Antrag geht nicht verloren).
  Ältere Formulare, die nur `personName` schicken, funktionieren weiter.
- Restrisiko: zwei verschiedene Menschen mit gleichem Namen landen bei
  derselben Person – dann den Vorgang über „Bearbeiten" umhängen.
- CSV-Import ordnet ebenfalls nur über den Namen zu (vorher Name + IBAN). Die
  Sicherungsdatei enthält zusätzlich Vorname/Nachname, alte Dateien bleiben
  lesbar.
- **Personenübersicht** (`SubsidyPeopleModal.tsx`; als Zeile im Budget-Kasten
  der Zuschüsse, mit Zähler „über Grenze"): sortiert nach Nachname, je Person
  Balken gegen `perPersonPerYear`, aufgeklappt Kategorien, Vorgänge des Jahres
  und „Anderen Eintrag zuordnen" (manuelles Zusammenführen, z. B. bei anderer
  E-Mail-Adresse). Beim Zusammenführen werden fehlende Kontakt- und Bankdaten
  vom entfernten Eintrag übernommen.

**Getestet:** Namensfunktionen und Sicherungsdatei per Skript; Server-Zuordnung
mit nachgestellter Datenbank (gleicher Name mit abweichenden Daten, neuer Name,
altes Formular, fehlender Nachname, Datenbank nicht lesbar). Im Browser:
Personenübersicht und die neuen Namensfelder. Echter Antrag erst nach dem
Deploy möglich.

## v3.21.0 - Buchhaltung als Schalter mit Archiv, Archiv nach Jahr/Monat/Art

**Fehler:** Die Buchhaltungs-Auswahl im Beschluss (drei Optionen „Offen (Nicht
bearbeitet)", „✓ Bearbeitet", „Nicht notwendig") hat nie etwas gespeichert –
`App.tsx` hat `onUpdateResolutionBookkeepingStatus` gar nicht an
`ResolutionsView` übergeben (einer der toten Handler aus der
App.tsx-Modularisierung).

**Jetzt** (Detailansicht, Kasten „Buchhaltung"):
- **Ein Schalter** „In der Buchhaltung berücksichtigt" (`bearbeitet` ↔
  `nicht_bearbeitet`). Einschalten verschiebt den Beschluss ins Archiv,
  Ausschalten eines archivierten holt ihn wieder heraus.
- Darunter **„Nicht relevant für die Buchhaltung"** → Rückfrage-Fenster
  („Bist du sicher …? Nach der Bestätigung wird er ins Archiv verschoben …")
  → `nicht_notwendig` + Archiv. Danach Text mit „Rückgängig".
- Während einer laufenden Abstimmung ist der Schalter gesperrt.
- `handleUpdateResolutionBookkeepingStatus` (`useResolutions.ts`) setzt Status
  und Archiv in **einem** Speichervorgang, schreibt einen Historie-Eintrag
  und zeigt einen Hinweis.
- Sanfter Übergang (`changeBookkeeping` in `ResolutionsView`): Schalter gleitet
  sofort, „Wird ins Archiv verschoben …", nach 0,6 s blendet die Detailansicht
  aus, nach 0,9 s wird gespeichert und die Auswahl geschlossen.
- Die Knöpfe je Rechnung (Bearbeitet/Offen/Nicht nötig) sind unverändert – sie
  gehören zu Rechnungen, nicht zum Beschluss.

**Archiv** (`ResolutionArchiveTree.tsx`): aufklappbarer Baum Jahr → Monat →
Zuschüsse / Auslagen / Allgemeine Beschlüsse, einsortiert nach Beschlussdatum
(sonst Erstelldatum), neueste zuerst. Standardmäßig offen: neuestes Jahr und
dessen neuester Monat, Art-Gruppen immer offen. Art ergibt sich aus den
verknüpften Vorgängen (`linkCountsByResolution`). Liste und Archiv nutzen
dieselbe Karte (`renderCard`). Filter und Suche wirken auch im Archiv.

**Bewusst nicht automatisch:** Ältere Beschlüsse, die schon „bearbeitet" sind,
aber nicht archiviert, bleiben, wo sie sind (unter „Alle"; seit v3.22.0 im
Reiter „Archiv").

## v3.22.0 - Archiv als Reiter, weiche Übergänge überall

**Beschlüsse:** Reiter Offen / Abgestimmt · Buchhaltung offen / **Archiv**, der
Reiter „Alle" und der Archiv-Knopf entfallen. Weil es kein „Alle" mehr gibt,
ordnet `resolutionSectionOf()` (`utils/resolutionSections.ts`) jeden Beschluss
genau einem Bereich zu: **Archiv = archiviert ODER abgelehnt ODER Buchhaltung
erledigt** – sonst wären abgelehnte Beschlüsse nirgends mehr zu sehen.
Endgültig löschen geht weiterhin nur bei tatsächlich archivierten
(`isArchived`).

**Weiche Übergänge – vier Bausteine. Bei neuen Funktionen verwenden:**

1. **`smooth(fn)` / `smoothly(handler)`** (`utils/smooth.ts`): View Transitions
   API mit `flushSync` – der Browser blendet vom alten ins neue Bild über.
   Genutzt für alles, was der Nutzer selbst auslöst und das Bild umbaut:
   Reiterwechsel (`handleSelectTab`, Sprünge aus der Übersicht, Bereichs- und
   Phasenreiter), Aktionen, die Einträge verschieben (in `App.tsx` als
   `smoothly(...)` an die Ansichten übergeben: Zuschuss-Status/-Zuordnung/
   -Löschen, Rechnungsstatus/-Ordner/-Buchhaltung, Sitzung absagen, Personen
   zusammenführen/löschen, Archivieren). **Nie für Firestore-Live-Updates** –
   während des Übergangs liegt kurz ein Standbild über der Seite, das stört
   beim Tippen. Beschluss- und Zuschusskarten haben einen
   `viewTransitionName` (`transitionName('res'|'sub', id)`) und gleiten an ihren
   neuen Platz; Kopfzeile (`wj-header`) und untere Navigation (`wj-bottom-nav`)
   haben eigene Namen, damit Karten nicht über sie malen. Namen müssen auf der
   Seite eindeutig sein. Ohne Browser-Unterstützung (iOS vor 18) oder bei
   „Bewegung reduzieren" passiert die Änderung sofort ohne Animation.
2. **`<Collapse open>`** (`components/Collapse.tsx`): Auf- UND Zuklappen über
   `grid-template-rows`, der Rest der Seite gleitet mit. Ersetzt das alte
   `{x && <div className="wj-expand">}` an 24 Stellen (Filter, Kurzinfos,
   Personen- und Zuschusszeilen, Archiv-Baum, Formularteile, Hinweisleisten).
   Merkt sich beim Zuklappen den letzten Inhalt, `{banner && …}` darin
   funktioniert also.
3. **Fenster und Menüs blenden beim Schließen aus** (`utils/overlayExit.ts`,
   gestartet in `main.tsx`): Ein MutationObserver setzt für entfernte
   `.wj-overlay`- bzw. `[data-wj-exit]`-Elemente kurz eine nicht bedienbare
   Kopie ein (`.wj-ghost`, 200 ms, Scroll-Position übernommen). **Neue Fenster
   brauchen dafür nichts**; schwebende Menüs/Klappen außerhalb des
   Seitenflusses bekommen `data-wj-exit` (Profilmenü, Mitteilungen,
   Bildvorschau). Nie für Elemente im Seitenfluss – die Kopie würde Platz
   einnehmen. Fenster mit eigener Schließ-Animation (`animate-out`,
   SettingsModal) werden übersprungen.
4. **Buchhaltungs-Schalter → Archiv:** Schalter gleitet, Hinweis „Wird ins
   Archiv verschoben …", nach 0,65 s blendet `smooth()` die Detailansicht in die
   Liste über (ältere Browser: eigene Ausblendung).

**Bewusst nicht umgebaut:** Wechsel zwischen zwei Inhalten per `? :` (z. B.
„Beschluss zuordnen" ↔ Auswahl) und die Reiter in den Einstellungen behalten
ihre kurze Einblendung (`wj-expand` mit `key`).

## v3.23.0 - Übersicht ohne große Knöpfe, Nachweis-Link kopieren

**Übersicht:** Die großen Knöpfe „Beschluss fassen" und „Rechnung hochladen"
sind entfernt (Nutzerwunsch: die Module darunter reichen, angelegt wird im
jeweiligen Bereich). `onOpenNewResolution`/`onOpenNewInvoice` gibt es an
`DashboardView` nicht mehr.

**Nachweis-Link kopieren** (Zuschüsse/Auslagen, aufgeklappter Vorgang, solange
ein Nachweis fehlt): neben „Nachweis-Link senden" ein Knopf „Link kopieren" –
auch für Personen ohne E-Mail, zum Weiterleiten per WhatsApp.
- Server: `handleGetProofLink` (`api/subsidy.ts`, Route `subsidy/proof-link`)
  liefert denselben signierten `/nachweis?t=…`-Link wie die Mail, ohne sie zu
  verschicken, und schreibt einen Historie-Eintrag. Gemeinsamer Baustein
  `buildProofLink()` für Senden und Kopieren.
- **Kopieren auf dem iPhone:** Safari erlaubt Zwischenablage nur direkt nach
  einem Tipp. `copyPendingText()` (`utils/clipboard.ts`) startet deshalb sofort
  mit einem `ClipboardItem`, dessen Inhalt ein Promise auf den Server-Link ist.
  Klappt es trotzdem nicht, erscheint der Link zum Markieren plus „Teilen".
- Senden und Kopieren verlangen jetzt das Firebase-ID-Token eines
  freigegebenen Vorstandsmitglieds (`verifyBoardCaller()` in `api/auth.ts`,
  gemeinsam mit der Einladung; Client in `utils/accountService.ts`). Einordnung
  des Nutzers: Die Zuschuss-Kennung ist intern und nirgends sichtbar, nur der
  Vorstand hat Portalzugang – das Risiko vorher war also gering; die Prüfung
  ist zusätzliche Absicherung ohne sichtbare Änderung. Die alte, ungeprüfte
  `resendSubsidyProofLink` in `emailService.ts` ist entfernt.

**Getestet:** Server mit nachgestellter Anmeldung/Datenbank (ohne Anmeldung
401, nicht freigegeben 403, Vorstand erhält gültig signierten Link +
Historie, beide Nachweise da 400, unbekannt 404, Senden ohne Anmeldung 401).
Echtes Kopieren auf dem iPhone erst nach dem Deploy prüfbar (lokal fehlen
Dienstkonto und Link-Schlüssel).

## v3.24.0 - Beschluss-Entwurf vor dem Anlegen, Archiv in der Beschlussauswahl

**Beschlussauswahl** (`ResolutionPicker.tsx`, beim Zuordnen von Zuschüssen/
Auslagen): zeigt wie bisher nur Beschlüsse außerhalb des Archivs
(`resolutionSectionOf`), darunter jetzt „N archivierte Beschlüsse einblenden".
Archivierte tragen dann ein Etikett „Archiv" und einen Hinweis, dass die
Buchhaltung dort erneut geprüft werden sollte. Abgelehnte kommen weiterhin nie
in Frage (`statuses`).

**Beschluss-Entwurf** (`ResolutionDraftModal.tsx`, wiederverwendbar): Beim
Bündeln wird der Beschluss nicht mehr sofort angelegt. „Beschluss über N …
prüfen" öffnet ein Entwurfsfenster mit
- **Vorschau** – sieht aus wie die Beschluss-Detailansicht (Nummer, Entwurf,
  Kategorie, Bezeichnung, Erläuterung, Antragswortlaut, Budget, angehängte
  Nachweise); statt Abstimmknöpfen nur ein Hinweis, dass sie nach dem Anlegen
  erscheinen (mit den Namen der Stimmberechtigten),
- **Bearbeiten** – Bezeichnung, Kategorie, Antragswortlaut, Erläuterung,
  „Auf den automatischen Vorschlag zurücksetzen",
- Fuß: „Zurück" zur Auswahl, „Beschluss anlegen".

**Kein Fenster über dem anderen:** `BundleSubsidiesModal` hat zwei Schritte
(`step`); im Schritt „preview" gibt es statt der Auswahl das Entwurfsfenster
zurück. Die Auswahl blendet dadurch über `overlayExit` aus, der Entwurf ein.
Angepasster Text bleibt beim Zurückgehen erhalten, solange dieselben Positionen
gewählt sind (`draftKey`); beim Schließen wird alles zurückgesetzt (das Fenster
ist in App.tsx dauerhaft eingebunden). Die Beschlusserkennung aus dem
Protokolltext (`ProtocolScanResultsModal`) hatte schon bearbeitbare Felder und
ist unverändert.

## v3.25.0 - Reiter per Wischen, Budget-Leiste, kleiner Link-Knopf

**Wischen** (`hooks/useSwipeTabs.ts`): In Beschlüssen (Offen / Buchhaltung
offen / Archiv) sowie Zuschüssen und Auslagen (Phasen + „Alle") wechselt ein
Wisch nach links zum nächsten, nach rechts zum vorherigen Reiter. Erkannt wird
nur eine klar waagerechte, zügige Bewegung (≥ 60 px, ≤ 700 ms, 1,5× waagerechter
als senkrecht). Ignoriert werden Gesten in Eingabefeldern, Fenstern
(`.wj-overlay`, `[data-wj-exit]`), waagerecht scrollbaren Leisten (die
Reiterleiste selbst) und `[data-no-swipe]`. In den Beschlüssen ist Wischen bei
offener Detailansicht aus. Tippen und Wischen laufen über `select()`: der
Inhalt mit `key={active}` gleitet mit `wj-slide-from-right/left` (index.css)
aus der passenden Richtung herein; die Karten blenden dann nicht zusätzlich
ein. Reiterwechsel laufen dafür **nicht mehr** über `smooth()`.

**Gemeinsame Reiterleiste** (`components/StageTabs.tsx`): schiebt den aktiven
Reiter per `scrollTo` in die Mitte (bewusst nicht `scrollIntoView`, das würde
auch die Seite senkrecht verschieben). Für neue Bereiche mit Reitern verwenden.

**Budget-Leiste** (`components/SubsidyBudgetBar.tsx`, nur Zuschüsse): schlanke
Leiste wie der iPhone-Speicher (Bezahlt grün, Zugesagt blau, bei
ausgeschöpftem Budget rot). Antippen klappt auf: Legende, § 8-Hinweis, „Nach
Personen" (Summe je Person, Balken gegen die Grenze je Person) und „Alle
Personen & Bankverbindungen". Ein Tipp auf eine Person öffnet die
Personenübersicht direkt aufgeklappt bei ihr (`focusPersonId` in
`SubsidyPeopleModal`, `peopleFocusId` in App.tsx; gescrollt wird im
Fenster-Inhalt, nicht die Seite).

**Antragslink:** nur noch ein kleiner Knopf „Antragslink kopieren" bzw.
„Auslagen-Link kopieren", die Adresse wird nicht mehr angezeigt.

## v3.26.0 - Belege wie die anderen Bereiche

Der Nutzer fand den Belege-Bereich unübersichtlich und optisch anders als
Beschlüsse/Zuschüsse (große Umschaltleiste Ohne/Alle/Mit Beschluss, eigener
Ordner-Kasten mit Chips, Karten mit je zwei Auswahlfeldern). `InvoicesView.tsx`
ist neu aufgebaut nach dem Muster der Zuschuss-Ansicht:

- **Kopf:** „Belege", CSV, „Hochladen".
- **Reiter** (`StageTabs` + `useSwipeTabs`, wischbar): „Buchhaltung offen"
  (`bookkeepingOf() === 'nicht_bearbeitet'`), „Erledigt" (bearbeitet oder nicht
  nötig), „Aus Auslagen" (nur wenn es Auslagen gibt; nur zum Nachschlagen, mit
  Sprung in den Auslagen-Bereich). Jeder Beleg steht genau in Offen oder
  Erledigt.
- **Filter** (eingeklappt): Suche, Beschluss mit/ohne, Ordner, Jahr, Monat;
  darin „Ordner verwalten" (anlegen, löschen mit Rückfrage). Mit/ohne Beschluss
  und Ordner sind damit keine eigenen Leisten mehr.
- **Karten:** Lieferant + Betrag, Beschreibung · Datum, kleine Etiketten
  (Beleg vorhanden, Beschlussnummer, Ordner, „Nicht nötig"). Aufklappen zeigt
  Nummer/Kategorie/Einreicher, den Beschluss, die Ordner-Auswahl (nur ohne
  Beschluss) und „Details & Beleg" (Detailfenster), „In Buchhaltung erledigt" /
  „Nicht nötig" bzw. „Wieder offen". Buchhaltungsaktionen laufen über
  `smoothly()` aus App.tsx, die Karte (`viewTransitionName` `inv-…`) wandert
  weich in den anderen Reiter.
- Die Props an `InvoicesView` sind unverändert; `onUpdateInvoiceStatus`,
  `onToggleBookkeepingRecorded` und `onOpenInvoiceRequestModal` nutzt die
  Liste nicht mehr (Status und Historie stehen im Detailfenster).

## v3.27.0 - Belege: Offen und Archiv, Belege-Modul in der Übersicht

**Zwei Reiter** (`InvoicesView.tsx`, Logik in `utils/invoiceSections.ts`):
- **Offen** = eingereicht, keinem Beschluss zugeordnet, Buchhaltung
  „nicht bearbeitet".
- **Archiv** = einem Beschluss zugeordnet (`hasResolution` oder
  `resolutionId`) ODER Buchhaltung „bearbeitet"/„nicht notwendig" – analog zu
  den Beschlüssen. „In Buchhaltung erledigt"/„Nicht nötig" verschieben also
  sofort ins Archiv; „Wieder offen" gibt es nur ohne Beschluss (mit Beschluss
  heißt der Knopf „Buchhaltung zurücksetzen", der Beleg bleibt im Archiv und
  trägt das Etikett „Buchhaltung offen").
- Der Reiter „Aus Auslagen" (v3.26.0) ist entfallen (Nutzervorgabe: nur zwei
  Reiter). Auslagen-Belege stehen weiter im Bereich Auslagen.

**Archiv-Baum:** Jahr (Belegdatum) → Kategorie → Mit/Ohne Beschluss. Neuer
gemeinsamer Baustein **`components/ArchiveTree.tsx`** (drei Ebenen, Karten
zeichnet der Aufrufer); `ResolutionArchiveTree` nutzt ihn jetzt ebenfalls –
per Render-Vergleich geprüft, dass das Beschluss-Archiv zeichengenau gleich
aussieht. Für weitere Archive diesen Baustein verwenden.

**Übersicht:** Modul „Belege" mit der Zahl offener Belege
(`countOpenInvoices`), nur sichtbar, wenn welche offen sind; Sprung in
Belege → Offen (`OverviewTarget` um `tab: 'invoices'` erweitert).

## v3.28.0 - Öffentlicher Beleg-Link, „Belege anfragen" mit Vorlagen

**Beleg-Link** (Belege, kleiner Knopf „Beleg-Link kopieren" unter der
Überschrift): allgemeiner Link `/beleg?t=…` **ohne Beschluss**. Ein darüber
eingereichter Beleg landet ohne Beschluss unter Belege → Offen (mit
Benachrichtigung und Historie). Umsetzung:
- `createGeneralInvoiceUploadToken()` (`api/invoiceAttachmentToken.ts`):
  gleicher Schlüssel `INVOICE_ATTACHMENT_LINK_SECRET`, Nutzdaten `g: 1` statt
  Beschluss `r`, 180 Tage gültig. Die Prüfung verlangt `r` oder `g`.
- `handleGetGeneralUploadLink` (Route `invoice/upload-link`) nur mit
  `verifyBoardCaller`; jeder Tipp erzeugt einen frischen Link. Kopieren über
  `copyPendingText` wie beim Nachweis-Link, sonst Link zum Markieren.
- **Bewusst ohne Zugangscode** (anders als `/antrag`): Der Link geht auch an
  Externe (Dienstleister), und die App kennt den Code nicht (nur Hash), könnte
  ihn also nicht in die Anfrage-Mail schreiben. Schlimmstenfalls landen
  unerwünschte Belege unter „Offen".
- `/beleg` (`InvoiceAttachmentUploadPage`) erkennt den allgemeinen Link
  (`general: true` aus `invoice/attachment`), zeigt „Beleg einreichen" und ein
  optionales Feld „Hinweis an den Vorstand" (`notes`, auch beim Beschluss-Link).
  Serverseitig ist die Datei jetzt Pflicht (die Seite verlangte sie schon).

**Belege anfragen** (`RequestInvoicesModal.tsx`, ersetzt das alte, nur
simulierte `InvoiceRequestModal`): ein Fenster, drei Schritte – Vorlage wählen
(oder ohne Vorlage) → Empfänger (Auswahl aus Vorstand und Zuschuss-Personen
mit E-Mail, oder frei), Betreff, Text, Vorschau → Bestätigung. Versand über
`handleSendInvoiceRequest` (Route `invoice/send-request`, nur Vorstand): Text
als Absätze im Portal-Mail-Rahmen (`layout`/`button` aus `api/authEmails.ts`,
jetzt exportiert), darunter der Knopf „Beleg hochladen" mit frischem
allgemeinem Link. Platzhalter `{Name}`/`{Absender}` füllt
`utils/invoiceRequestText.ts` – dieselbe Funktion für Vorschau und Server.

**Vorlagen:** geteilt über `settings/invoiceRequestTemplates`
(`src/data/invoiceRequestTemplates.ts`, drei Standardvorlagen; Sync wie der
Rollen-Katalog, Abo im zentralen Sync-Effekt, State in `useInvoices`). Im
Fenster: löschen (Schritt 1), „Vorlage … aktualisieren" und „Als neue Vorlage
speichern" (Schritt 2).

**Getestet:** Server mit nachgestellter Anmeldung/Datenbank (401/403, gültiger
allgemeiner Link, Beleg ohne Beschluss samt Hinweis, Beschluss-Link
unverändert verknüpft, Pflichtdatei, Anfrage-Prüfungen bis zum Mailversand),
Platzhalter, Render-Test von Fenster und Knöpfen, Browser (nur ansehen).
Echter Versand und Kopieren erst nach dem Deploy (lokal fehlen Dienstkonto,
Link-Schlüssel und Mailzugang).

## v3.29.0 - Einstellungen → Zuschüsse (Grenzen und Veranstaltungen)

Neuer Reiter **„Zuschüsse"** in den Einstellungen (vor „Historie"), Inhalt
`components/SubsidyCatalogueEditor.tsx`; das frühere Fenster
`SubsidyCatalogueModal` ist entfernt. Der Knopf „Katalog" bei den Zuschüssen
öffnet jetzt Einstellungen → Zuschüsse (`settingsInitialTab`, gemeinsamer Typ
`SettingsTab` aus `SettingsModal.tsx`). Achtung: Die Einstellungen sind im
Live-Portal per Admin-Code gesperrt – der Katalog damit jetzt auch (vorher frei).

- **Grenzen je Kalenderjahr:** Gesamtbudget, je Person, je Kategorie (mit
  „kein Limit"). Der Entwurf folgt Änderungen anderer Geräte, solange nichts
  ungespeichert geändert ist.
- **Veranstaltungen:** der vorhandene Katalog (`settings/subsidyCatalogue`,
  sonst Richtlinien-Standard), nach Kategorie gruppiert; „Eigene erfassen",
  bearbeiten direkt an der Stelle des Eintrags, entfernen.
- **Aus bisherigen Anträgen:** Veranstaltungsnamen aus Zuschüssen (keine
  Auslagen), die nicht im Katalog stehen – gleiche Bezeichnung
  (Groß-/Kleinschreibung, Leerzeichen egal) oder ein Katalogschlüssel außer
  „Sonstiges" gelten als bekannt. „Übernehmen" belegt einen neuen Eintrag mit
  Name, Kategorie und zuletzt gewährtem Betrag vor.
- Speicherlogik unverändert (`handleSaveCatalogueSettings` in `useSubsidies`).

## v3.30.0 - Zuschuss-Kategorien frei anlegbar, „Belege anfragen" überarbeitet, Reiter „Vorlagen"

**Kategorien flexibel** (Nutzer: Grenzen je Kategorie ohne anpassbare
Kategorien „geht so nicht"). `SubsidyCategory` ist jetzt `string`.
- Kategorien liegen als `limits.categories` (`SubsidyCategoryDef`: `key`,
  `label`, `limit` oder `null`, `oncePerMembership`) im Dokument
  `settings/subsidyCatalogue` – bewusst bei den Grenzen, weil `limits` ohnehin
  überall hingereicht wird. `perCategoryPerYear` wird daraus abgeleitet und
  mitgespeichert, damit ältere App-Stände weiterrechnen.
- **Altbestand ohne `categories`** ergibt über `subsidyCategoriesOf()` die vier
  Richtlinien-Kategorien mit den gespeicherten Grenzen. Alles, was aus
  Speicher, Firestore oder dem Editor kommt, läuft durch
  `normalizeCatalogueSettings()` (useSubsidies, Abo in App.tsx).
- Anzeige nur noch über `categoryLabel(limits, key)` (kennt auch entfernte
  Schlüssel); `CATEGORY_LABEL` gibt es nicht mehr. `personBudget` rechnet über
  alle eingerichteten Kategorien plus solche, die nur noch in Vorgängen
  vorkommen (ohne Grenze). Die Regel „Veranstaltung nur einmal je Person" hing
  fest an Academy/Training und ist jetzt der Haken `oncePerMembership`.
- Editor: Name ändern (Schlüssel bleibt, Zuschüsse behalten ihre Kategorie),
  Grenze/„kein Limit", Regel, sortieren, hinzufügen, entfernen. Entfernen ist
  gesperrt, solange Katalog-Veranstaltungen die Kategorie nutzen; bei
  Zuschüssen mit dieser Kategorie Rückfrage. Neue Schlüssel entstehen beim
  Speichern aus dem Namen. `/antrag` bekommt die Namen über
  `subsidy/catalogue` (`categories`).

**„Belege anfragen"** (`RequestInvoicesModal.tsx`, Nutzervorgabe):
- Startet direkt mit dem Standardtext (`DEFAULT_INVOICE_REQUEST_EMAIL`), keine
  Vorlagenwahl vorweg. „Vorlage wählen" öffnet im selben Fenster die Liste –
  übernehmen, bearbeiten, löschen, **neue Vorlage anlegen**. Ersetzt eine
  Vorlage geänderten Text, kommt eine Rückfrage.
- Unten „E-Mail als Vorlage speichern" – auch für selbst geschriebene Texte;
  bei geänderter Vorlage zusätzlich „Vorlage … aktualisieren".
- Empfänger: Vorstandsmitglieder (mit Adresse) antippen und beliebige weitere
  Adressen (Name optional) hinzufügen. Server (`handleSendInvoiceRequest`,
  Feld `recipients`, höchstens 25) schickt **jeder Person eine eigene Mail**
  mit eigenem `{Name}` und eigenem Link; Antwort `sent`/`failed`. Ging keine
  Mail raus, kommt der Fehler des Mailversands zurück. Die ältere Form mit
  einem Empfänger wird weiter angenommen.

**Einstellungen → Vorlagen:** dieselbe Verwaltung
(`InvoiceRequestTemplateManager.tsx`, gemeinsam mit dem Anfragefenster), dazu
„Standardvorlagen wiederherstellen", wenn welche gelöscht wurden.

**Getestet:** Kategorie-Logik per Skript (Altbestand, eigene/umbenannte/
entfernte Kategorien, Grenzwarnung, Regel an/aus), Server mit nachgestellter
Anmeldung (keine/ungültige/zu viele Empfänger, Dubletten, ältere Form, bis zum
Mailversand), Render-Tests, Browser (nur ansehen).

## v3.31.0 - Bestätigungsmails, automatische Erinnerungen, Nachweise bei späten Anträgen Pflicht

**Eingangsbestätigung** (`api/subsidyEmails.ts`, neu – nutzt `layout`/`button`
aus `authEmails.ts`): Zuschuss und Auslage schicken dem Einreicher jetzt immer
eine Bestätigung mit den eingereichten Daten. Sie geht **erst nach dem
erfolgreichen Schreiben in Firestore** raus, ist also zugleich Quittung.
Beim Zuschuss ist **immer** der `/nachweis`-Link dabei – auch wenn nichts
fehlt, weil er den aktuellen Stand zeigt. Die frühere Mail „Dein
Nachweis-Link" (nur bei fehlenden Nachweisen) entfällt.

**Späte Anträge** (`handleSubmitSubsidy` + `/antrag`): Liegt das
Veranstaltungsdatum **vor heute**, sind Teilnahme- und Kostennachweis Pflicht;
ohne sie lässt sich der Antrag nicht absenden (serverseitig und im Formular,
dort „Pflicht" statt der Auswahl „Jetzt hochladen"). Nachreichen gibt es damit
nur für Termine, die noch bevorstehen. Der Veranstaltungstag selbst zählt
noch als „nicht vergangen".

**Automatische Erinnerungen** (`api/reminders.ts` +
`netlify/functions/reminders.mts`): erste Stelle im Projekt, die **ohne Zutun
eines Nutzers** läuft. Netlify plant in UTC, deshalb Zeitplan `0 18,19 * * *`
und im Code die Prüfung auf 20 Uhr deutscher Zeit (`berlinHour`, bewusst
`en-GB`/`h23` – die deutsche Schreibweise liefert „20 Uhr" statt „20"). Zwei
Erinnerungen je Zuschuss: am Veranstaltungstag und sieben Tage danach.
Bedingungen: nur Zuschüsse (keine Auslagen), nur **vor** der Veranstaltung
eingereicht, noch ein Nachweis offen, nicht in einem Beschluss/bezahlt/
abgelehnt. Verschickte Erinnerungen werden am Vorgang vermerkt
(`remindedOnEventDayAt`, `remindedAfterEventAt`), damit nichts doppelt kommt.
Manuell prüfbar über Einstellungen → Zuschüsse → „Jetzt prüfen" (Route
`reminders/run`, nur Vorstand, `verifyBoardCaller`).

**Fehler behoben:** Im Erfassungsfenster löschte der Papierkorb zwar die
Nachweisdatei, der Status blieb aber auf „Hier abgelegt". Der Nachweis-Link
meldete dann „liegt bereits vor", obwohl nichts gespeichert war, und die
Person konnte nichts hochladen. Löschen setzt den Status jetzt auf „Offen".

**Zur Einordnung des Nachweis-Links** (Nutzerfrage): Der Link trägt nur eine
signierte Kennung; die Seite fragt bei **jedem Öffnen** den Live-Stand ab.
Setzt der Vorstand einen Nachweis auf „Offen", kann über denselben alten Link
wieder hochgeladen werden. Ein bereits hochgeladener Nachweis lässt sich über
den Link nicht überschreiben (Schutz seit v3.7.2); gesperrt ist er, sobald der
Zuschuss in einem Beschluss, bezahlt oder abgelehnt ist.

**Getestet:** Einreichung mit nachgestellter Datenbank (vergangene
Veranstaltung ohne/mit Nachweisen, künftige Veranstaltung, Auslage ohne/mit
Beleg, Link gültig signiert), Mailtexte, Erinnerungs-Auswahl (Veranstaltungstag,
eine Woche danach, bereits erinnert, nachträglich eingereicht, vollständig, im
Beschluss, bezahlt, Auslage, ohne E-Mail-Adresse, Sommer-/Winterzeit,
Uhrzeit-Sperre). Echter Versand erst nach dem Deploy prüfbar.

## v3.32.0 - E-Mails an den Vorstand je Person und Ereignis einstellbar

**Vorher:** Nur eine einzige Adresse (`settings/security.adminEmail`) bekam
eine E-Mail, und nur bei neuem Zuschuss und neuer Auslage. Für Belege und
nachgereichte Nachweise gab es gar keine Mail, nur die Mitteilung in der App.

**Jetzt** (Einstellungen → Benachrichtigungen, Abschnitt „E-Mail an den
Vorstand"): je Vorstandsmitglied mit Adresse und je Ereignis ein Haken.
Ereignisse: **Neuer Zuschuss-Antrag**, **Neue Auslagenerstattung**, **Neuer
Beleg** (über einen Beleg-Link), **Nachweis nachgereicht**.

- Geteilt über `settings/boardEmails`
  (`src/data/boardEmailSettings.ts`, Sync-Muster wie der Rollen-Katalog, State
  in `useNotifications`, Abo im zentralen Sync-Effekt). Bewusst **ohne merge**
  gespeichert, sonst bliebe eine abgewählte Person im Dokument stehen.
- Serverseitig verschickt `api/boardNotify.ts` (`notifyBoardByEmail` +
  `boardMail`) an die ausgewählten Adressen; eingehängt in `api/subsidy.ts`
  (Zuschuss, Auslage, nachgereichter Nachweis) und `api/invoice.ts` (Beleg mit
  und ohne Beschluss).
- **Rückfall:** Solange das Dokument nicht existiert, verhält sich alles wie
  früher (Zuschuss und Auslage an die Admin-Adresse). Sobald einmal etwas
  gespeichert wurde, zählt ausschließlich die Auswahl – ohne Haken geht für
  dieses Ereignis bewusst keine E-Mail raus.
- Unberührt bleiben die Mitteilungen in der App und die Push-Nachrichten; die
  Auswahl darüber im selben Reiter ist weiterhin eine Geräte-Einstellung.

**Getestet:** Empfänger-Ermittlung mit nachgestellter Datenbank (ohne
Einstellung, Auswahl je Ereignis, Person ohne Adresse, doppelte Adresse,
alles abgewählt) und der Mailaufbau samt Maskierung.

## v4.0.0 - Versionsverlauf in der App und als Datei

Nutzerwunsch: nachvollziehen können, was sich von Version zu Version geändert
hat – und endlich eine 4 vorne.

**Eine Quelle, zwei Ausgaben:** `src/data/changelog.ts` (neueste Version
zuerst, bewusst in der Sprache des Vorstands). Daraus
- zeigt `components/ChangelogList.tsx` den Verlauf in **Einstellungen →
  System** (unten) und im Fenster `ChangelogModal.tsx` hinter der
  **Versionsnummer in der Fußzeile** – dort ohne Admin-Code, damit jedes
  Vorstandsmitglied nachlesen kann;
- erzeugt **`npm run changelog`** (`scripts/write-changelog.ts`) die Datei
  **CHANGELOG.md** im Projekt.

Die installierte Version ist markiert und aufgeklappt; ältere Versionen
erscheinen erst auf Tipp („N ältere Versionen anzeigen").

**Pflicht bei jeder neuen Version:** Eintrag oben in `changelog.ts` ergänzen
und `npm run changelog` laufen lassen (steht auch in den Arbeitsregeln).

Der Verlauf ist bis v3.1.2 zurück nachgetragen (33 Einträge); Datumsangaben
gibt es erst ab v3.25.0, vorher wurden sie nicht mitgeführt und werden bewusst
nicht erfunden.

## v4.1.0 - Wischen im ganzen Inhaltsbereich und in den Einstellungen

**Gemeldet:** Das Wischen zum Reiterwechsel funktionierte nur dort, wo
tatsächlich Karten lagen – im leeren Bereich darunter passierte nichts.

**Ursache:** `useSwipeTabs` hängte die Gesten an das `ref`-Element der Ansicht.
Das ist nur so hoch wie seine Liste; der leere Platz darunter gehört zu
`<main>`.

**Jetzt** (`hooks/useSwipeTabs.ts`):
- Die Gesten hängen am **Inhaltsbereich `<main>`** (über `closest('main')`),
  das `ref` dient nur noch als Bezugspunkt für die Ausschlüsse. Neue Option
  `scope: 'self'` für Fenster ohne `<main>` darüber.
- **Einstellungen wischbar**: `SettingsModal` nutzt den Hook mit `scope: 'self'`
  am Inhaltsbereich, Reiterfolge in `SETTINGS_TABS`; die Reiter-Knöpfe rufen
  jetzt `swipe.select()` statt `setActiveTab()`, damit die Richtung der
  Einblendung stimmt. Solange der Bereich per Code gesperrt ist, ist das
  Wischen aus.
- Der Ausschluss „Fenster" gilt nur noch für **fremde** Fenster: liegt der
  Wischbereich selbst in einem `.wj-overlay`, wird er nicht mehr geblockt –
  sonst könnte man in den Einstellungen nie wischen.
- **Wichtig für dauerhaft eingebundene Fenster:** Der Hook merkt sich das
  Element jetzt über ein **Callback-Ref mit State** statt `useRef`. Mit
  `useRef` lief der Effekt nur beim ersten Rendern – da existiert der Inhalt
  eines geschlossenen Fensters noch gar nicht, die Gesten wurden nie
  angemeldet. Genau daran ist der erste Versuch gescheitert.

Eingabefelder, waagerecht scrollbare Leisten und `[data-no-swipe]` bleiben
ausgenommen (in den Einstellungen wischt man also neben den Formularfeldern).

**Getestet** im Browser mit nachgestellten Touch-Gesten: Beschlüsse – Wisch
ganz unten im leeren Bereich wechselt „Abgestimmt" → „Archiv" und zurück;
Einstellungen – „Zuschüsse" → „Vorlagen" und zurück, während die Seite
dahinter unverändert bleibt.

## v4.1.1 / v4.2.0 - Eigene Adresse app.vorstandsportal.cloud, Google-Anmeldung dort

**Adresse (v4.1.1):** Domain `vorstandsportal.cloud` bei IONOS, Unteradresse
`app` als CNAME auf `wj-of-vorstandsportal.netlify.app`. IONOS legt zu jeder
neuen Unteradresse automatisch Mail-Einträge an (MX, SPF, DKIM, autodiscover);
ein CNAME verträgt sich nicht mit anderen Einträgen desselben Namens, IONOS
schaltet sie deshalb für `app` ab – harmlos, die Mail der Hauptdomain hat
eigene Einträge. Das Zertifikat stellt **Netlify** aus (Let's Encrypt, sobald
die alten Parkseiten-Einträge aus allen Zwischenspeichern verschwunden sind);
ein bei IONOS gekauftes/angelegtes SSL-Zertifikat hat damit nichts zu tun.
Beobachtet: Der Router des Nutzers (Speedport, `192.168.2.1`) hielt die alte
IONOS-Adresse noch rund eine Stunde, dort kam „404 Not Found" von IONOS,
während Mobilfunk schon ging. Achtung: Das Setzen der *Primary domain* in Netlify leitet die eigene
`…netlify.app`-Adresse **nicht** um (nur zusätzliche Domain-Aliase) – dafür
sorgt seit v4.2.1 eine eigene Regel in `netlify.toml`.

**Google-Anmeldung unter eigener Adresse (v4.2.0):** Standardmäßig läuft die
Google-Anmeldung über `vorstandsportal-wj-offenbach.firebaseapp.com` (Google
zeigt „Weiter zu …firebaseapp.com"), und Safari behandelt das als fremde Seite
(Rückkehr nach `signInWithRedirect` unzuverlässig). Umsetzung nach Firebases
Empfehlung „Anmeldedienst über die eigene Domain durchreichen":
- `netlify.toml`: `/__/auth/*` und `/__/firebase/*` werden mit Status 200 an
  `https://vorstandsportal-wj-offenbach.firebaseapp.com/…` durchgereicht, **vor**
  der Single-Page-Regel `/*`. (`/__/firebase/init.json` liefert dort 404 – das
  ist normal, die Anmeldeseite kommt ohne aus; durchgereicht wird es, damit sie
  nicht stattdessen unsere `index.html` bekommt.)
- `src/lib/firebase.ts`: `authDomain` ist auf den Adressen in
  `AUTH_PROXY_HOSTS` (nur `app.vorstandsportal.cloud`) die eigene Adresse, sonst
  weiter `firebaseapp.com`. **Bewusst keine „immer aktuelle Adresse"**: Google
  nimmt nur Rückkehradressen an, die beim OAuth-Client eingetragen sind –
  lokal, auf der alten Netlify-Adresse und auf Testversionen würde die
  Anmeldung sonst mit „redirect_uri_mismatch" scheitern. Neue Adresse →
  Liste ergänzen UND in Google Cloud eintragen.
- **Google Cloud Console** (Projekt `vorstandsportal-wj-offenbach`, Konto
  `/u/1`, *APIs und Dienste → Anmeldedaten → „Web client (auto created by
  Google Service)"*): JavaScript-Quelle `https://app.vorstandsportal.cloud` und
  Weiterleitungs-URI `https://app.vorstandsportal.cloud/__/auth/handler`
  eingetragen (24.09.2026). Firebase ist ein Teil von Google Cloud; diese Liste
  zeigt die Firebase-Konsole nicht an. Beim ersten Öffnen musste der Nutzer
  die Nutzungsbedingungen von Google Cloud für das Vereinskonto akzeptieren
  (kostenlos; „Jetzt kostenlos testen" bewusst **nicht** angeklickt).
- Der Service Worker (`public/sw.js`) hat keinen `fetch`-Handler, fängt
  `/__/auth/handler` also nicht ab – falls er je einen bekommt, `/__/`
  ausnehmen.

**Nicht lokal testbar** (die Durchreichung gibt es nur bei Netlify). Geprüft:
die Firebase-Seiten `/__/auth/handler` und `/__/auth/iframe` antworten, Build
und Typprüfung sauber. Google meldet, dass Änderungen am OAuth-Client 5 Minuten
bis einige Stunden brauchen können – kommt direkt nach dem Deploy
„redirect_uri_mismatch", etwas warten.

## v4.2.1 - Alte Netlify-Adresse leitet auf app.vorstandsportal.cloud um

Nach dem Setzen der *Primary domain* zeigte `wj-of-vorstandsportal.netlify.app`
das Portal weiter selbst an (HTTP 200) – Netlify leitet nur zusätzliche
Domain-Aliase auf die Hauptadresse um, nicht die eigene netlify.app-Adresse.
Dadurch gab es zwei Adressen mit getrennter Anmeldung, getrennter
Home-Bildschirm-App und getrennter Face-ID-Kopplung.

Jetzt: erste Regel in `netlify.toml`, nur für diesen Host,
`https://wj-of-vorstandsportal.netlify.app/*` → `https://app.vorstandsportal.cloud/:splat`,
**302** (vorläufig) mit `force`. Netlify hängt den Suchteil (`?t=…`) von selbst
an, alte Nachweis-/Beleg-/Abstimmungslinks funktionieren also weiter.
**Bewusst 302 statt 301:** eine 301 merken sich Browser dauerhaft – wird die
(privat registrierte, als Versuch gekaufte) Domain aufgegeben, sprängen Geräte
sonst weiter dorthin. Abschalten = Block entfernen. Testversionen
(Deploy Previews) haben andere Hostnamen und sind nicht betroffen. Eine in
einem alten, noch offenen Tab abgeschickte Anfrage (POST an `/api/…`) scheitert
nach der Umleitung – nach dem Neuladen landet man auf der neuen Adresse.

## v4.2.2 - Endlosschleife nach dem Abmelden

**Gemeldet (iPhone):** Nach dem Abmelden kam sofort „Face ID einrichten",
das Fenster ließ sich nicht wegklicken – „Später" führte immer wieder dorthin.

**Ursache:** `AuthModal` ist in `App.tsx` dauerhaft eingebunden und wird nur
über `isOpen` ein-/ausgeblendet (gleiche Falle wie früher bei
`EmailVoteModal`). Es behielt nach der Anmeldung `step` ('code' bzw.
'biometric') und `pendingUser`. Beim Abmelden öffnete es deshalb wieder beim
Face-ID-Schritt der gerade abgemeldeten Person. „Später" rief `onSuccess` auf –
**ohne Firebase-Anmeldung** (die hatte `handleLogout` beendet). Der Effekt in
`App.tsx` (`authReady && !firebaseUid && authSession.isAuthenticated →
handleLogout`) meldete sofort wieder ab → Fenster wieder offen → Schleife.
Nebenbei hätte „Später" die Person lokal ohne Passwort wieder „angemeldet"
(Daten kamen mangels Firebase-Anmeldung zwar nie an, trotzdem falsch).

**Behoben** (`components/AuthModal.tsx`):
- Effekt auf `isOpen`: bei jedem Öffnen zurück auf `step = 'login'`,
  `pendingUser = null`, Code-Felder, Fehler und Passwortfeld geleert.
- Alle Abschlüsse laufen über `complete()`: ohne `auth.currentUser` kein
  `onSuccess`, sondern zurück zur Anmeldung mit „Die Anmeldung ist abgelaufen".

**Lokal nicht nachstellbar:** Im Entwicklermodus entfallen Code und Face ID.
Geprüft: Typen, Build, Abmelden → Anmeldebildschirm bleibt stehen → erneut
anmelden. Auf dem iPhone nach dem Deploy testen. Bis dahin hilft: App
komplett schließen (vom Bildschirm wischen) und neu öffnen – dann startet das
Fenster frisch bei der Anmeldung.
