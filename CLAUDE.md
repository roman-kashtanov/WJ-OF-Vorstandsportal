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

`src/utils/fileStorage.ts` verkleinert Bilder vor dem Speichern (max. 1600 px
Kante, JPEG, Qualität wird gesenkt bis es passt). Ein Beleg landet damit bei
80–300 KB. Zu große Nicht-Bilder werden mit klarer Meldung abgelehnt, statt
still zu scheitern.

Firebase Storage ist im Projekt **nicht** eingerichtet (404) und würde für neue
Projekte den Blaze-Tarif erfordern. Solange die Komprimierung reicht, ist das
nicht nötig.

Gesamtkapazität im kostenlosen Tarif: 1 GiB. Bei ~150 KB je Beleg entspricht
das grob 6.000–7.000 Belegen.
