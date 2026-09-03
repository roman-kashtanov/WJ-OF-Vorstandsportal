# WJOF Vorstandsportal — Projektgedächtnis

Diese Datei wird bei jeder Sitzung automatisch gelesen. Sie hält fest, was sich
aus dem Code allein **nicht** erschließt: getroffene Entscheidungen, bekannte
Fallstricke und der Stand der Einrichtung.

**Bitte bei jeder wesentlichen Änderung mit aktualisieren.**

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
| Live | https://wj-of-vorstandsportal.netlify.app |
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

1. Google-Anmeldung (einziger Weg)
2. E-Mail muss in der Firestore-Sammlung `allowlist` stehen (Dokument-ID = die
   Adresse, klein geschrieben) — das ist die **maßgebliche** Prüfung, nicht die
   lokale Mitgliederliste
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

Versand über das Gmail-Postfach des Vereins (`offenbachwj@gmail.com`) per SMTP
mit App-Passwort. Bewusst **kein** Resend: Dessen Domain-Verifizierung hätte
den bestehenden SPF-Eintrag von `wj-offenbach.de` (IONOS + vereinonline.org)
berührt und damit den Mailversand des Vereins gefährdet. Resend bleibt als
Alternative im Code und greift nur, wenn kein SMTP hinterlegt ist.

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
