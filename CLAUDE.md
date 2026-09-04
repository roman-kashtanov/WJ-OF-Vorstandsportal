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

## Termine: Wiederkehrende Serien, Protokoll-/Agenda-Upload, KI-Beschlusserkennung (v3.8.0)

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

**3. KI-Beschlusserkennung** (`api/protocolScan.ts`, neu): neuer
Endpunkt `POST meeting/scan-protocol` - prueft per
`FirestoreAdmin.getDocument`, dass die `meetingId` existiert
(Missbrauchsschutz, gleiches Muster wie bei den anderen internen
Endpunkten), ruft dann die Anthropic Messages API mit dem Protokoll als
`document`-Content-Block auf (natives PDF-Verstaendnis, keine separate
Text-Extraktion noetig) und bittet um AUSSCHLIESSLICH ein JSON-Array
erkannter Beschluss-Kandidaten (`title`, `motionText`,
`requestedBudget?`, `category?`). Neue Server-Config
`ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (`api/config.ts`,
`.env.example`).

**Wichtigste Leitplanke der ganzen Funktion** (Nutzerentscheidung nach
Rueckfrage, "dringend empfohlen"): die KI legt **nie selbst** einen
Beschluss an. `ProtocolScanResultsModal.tsx` (neu) zeigt jeden
erkannten Kandidaten einzeln mit Checkbox (Standard: angehakt) und
editierbaren Feldern; erst der Button "X Beschluesse anlegen" ruft fuer
die angehakten Eintraege die **bestehende** `handleCreateResolution`
(`useResolutions.ts`) auf - dadurch laufen Benachrichtigung,
Revisionshistorie und der Abstimmungs-E-Mail-Versand automatisch mit,
ohne die Logik zu duplizieren. Der Button "Beschluesse erkennen" in
`MeetingsView.tsx` ist nur aktiv, wenn ein `protocolFile` vorliegt.

Lokal (kein `ANTHROPIC_API_KEY`/`FIREBASE_SERVICE_ACCOUNT` gesetzt)
ausschliesslich bis zur erwarteten, klaren Fehlermeldung pruefbar - wie
bei allen serverseitigen Flows dieser Sitzung. Der eigentliche KI-Aufruf
selbst kann daher nur nach dem Setzen echter Secrets auf Netlify final
verifiziert werden.
