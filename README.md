# WJOF Vorstandsportal

Digitales Vorstandsportal der Wirtschaftsjunioren Offenbach am Main e. V. –
Umlaufbeschlüsse mit Abstimmung, Belegverwaltung und Vorstandssitzungen.

React + Vite (Frontend) · Firebase Firestore (Echtzeit-Daten) ·
Netlify Functions (E-Mail & Push) · PWA (Installation auf dem Smartphone).

---

## 1. Einmalige Einrichtung

### 1.1 Firebase (WJ-Google-Konto)

Im Projekt **`vorstandsportal-wj-offenbach`** fehlen bisher Authentication und die Datenbank – das ist der
Grund, warum die Echtzeit-Synchronisation nicht funktioniert hat.

1. <https://console.firebase.google.com> mit dem **WJ-Google-Konto** öffnen,
   Projekt `vorstandsportal-wj-offenbach` auswählen.
2. **Firestore Database → Datenbank erstellen**
   · Modus: *Produktion* · Region: **eur3 (europe-west)**.
3. **Firestore Database → Regeln**: Inhalt der Datei `firestore.rules`
   einfügen und veröffentlichen.
4. **Firestore Database → Daten**: Sammlung **`allowlist`** anlegen und ein
   Dokument mit der **eigenen E-Mail-Adresse als Dokument-ID** erstellen
   (ein Feld genügt, z. B. `aktiv` = `true`).
   Ohne diesen einen Eintrag kommt niemand in die Datenbank.
5. **Authentication → Sign-in method → Google** aktivieren.
6. **Authentication → Settings → Authorized domains**: die Netlify-Adresse
   eintragen (z. B. `wjof-vorstand.netlify.app` und eine spätere eigene Domain).

Alle weiteren Vorstandsmitglieder werden danach bequem in der App unter
*Portal → Vorstand* gepflegt; die Freigabeliste wird automatisch mitgeführt.

### 1.2 Resend (E-Mail-Versand)

Zu verifizieren ist die Vereinsdomain **`wj-offenbach.de`** (dort laeuft die
Website). Das DNS liegt bei **IONOS** - dort werden die Eintraege hinterlegt.

> **Achtung, bestehende Vereins-Mails nicht zerstoeren.**
> Die Domain hat bereits einen SPF-Eintrag, der den IONOS-Mailserver und
> `vereinonline.org` (Mitgliederverwaltung) abdeckt:
> `v=spf1 mx a:vereinonline.org include:vereinonline.org include:_spf.perfora.net
> include:_spf-eu.ionos.com include:mx.kundenserver.de include:_spf.kundenserver.de ~all`
>
> Eine Domain darf nur EINEN SPF-Eintrag haben. Ein zweiter macht SPF ungueltig -
> dann landen auch die bestehenden Mitglieder-Mails im Spam.

**Empfohlener Weg: Subdomain verwenden.**
Bei Resend unter *Domains -> Add Domain* nicht `wj-offenbach.de` eintragen,
sondern **`send.wj-offenbach.de`**. Vorteile:

- Die Eintraege betreffen ausschliesslich die Subdomain; der bestehende
  Mailbetrieb des Vereins kann dadurch nicht kaputtgehen.
- Resend liefert DKIM- und SPF-Eintraege, die bei IONOS unter
  *Domains -> wj-offenbach.de -> DNS* als neue Eintraege angelegt werden.

Absender ist danach z. B. `vorstand@send.wj-offenbach.de`
(in Netlify als `RESEND_FROM` hinterlegen).

**Alternative: Hauptdomain `wj-offenbach.de`.**
Sieht mit `vorstand@wj-offenbach.de` schoener aus, erfordert aber, dass
`include:_spf.resend.com` in den **bestehenden** SPF-Eintrag hineingeschrieben
wird (vor dem abschliessenden `~all`) - kein zweiter Eintrag. Wer die
IONOS-DNS-Verwaltung nicht sicher bedient, sollte den Subdomain-Weg nehmen.

**Bis zur Verifizierung** funktioniert ausschliesslich `onboarding@resend.dev`
als Absender, und Resend nimmt als Empfaenger nur die beim Konto registrierte
Adresse an. Ein echter Rundversand an den Vorstand ist erst nach der
Verifizierung moeglich.

### 1.3 Netlify

**Site configuration → Environment variables** (Werte ohne Anführungszeichen):

| Variable | Wert |
|---|---|
| `RESEND_API_KEY` | der neue Resend-Schlüssel (`re_…`) |
| `RESEND_FROM` | `WJ Offenbach Vorstand <onboarding@resend.dev>` – später die eigene Domain |
| `VAPID_PUBLIC_KEY` | `BARgUjgWCDkONgCMjD3qFOshYrFt_8oD61_sdcnX2ZbdwbM83uH0p_jbliHqRwXO2vY8Pd77FVOy26Ik4J3Xdy0` |
| `VAPID_PRIVATE_KEY` | *(privater Schlüssel – wird separat übergeben, gehört nicht ins Repository)* |
| `VAPID_SUBJECT` | `mailto:vorstand@wj-offenbach.de` |

Build-Einstellungen stehen in `netlify.toml` und müssen nicht angeklickt werden:
Build-Befehl `npm run build`, Verzeichnis `dist`, Functions in `netlify/functions`.

---

## 2. Änderungen veröffentlichen

Netlify baut bei **jedem Push** automatisch neu:

```bash
git add -A
git commit -m "Beschreibung der Änderung"
git push
```

Nach ca. 1–2 Minuten ist die neue Version online. Damit alle Geräte sie auch
wirklich laden: in der App unter **Portal → System → „Aktualisierung für alle
erzwingen"**. Dann erscheint auf jedem Gerät der Hinweis „Bitte aktualisieren".

Erstmalige Verbindung GitHub ↔ Netlify:
Netlify → *Add new site* → *Import an existing project* → GitHub → Repository
auswählen → Deploy.

---

## 3. Lokal entwickeln

```bash
npm install
cp .env.example .env   # Werte eintragen
npm run dev            # http://localhost:3007
```

`npm run lint` prüft die Typen, `npm run build` erzeugt den Produktionsstand.

---

## 4. Wie E-Mail und Push funktionieren

Beides braucht einen Server – im Browser allein geht es nicht. Auf Netlify
übernimmt das die Function unter `netlify/functions/api.mts`, die unter
`/api/*` erreichbar ist:

| Endpunkt | Zweck |
|---|---|
| `POST /api/email/send` | Versand über Resend (Schlüssel bleibt serverseitig) |
| `POST /api/push/send` | Push an alle registrierten Geräte |
| `GET /api/push/vapid-public-key` | öffentlicher Schlüssel für die Anmeldung |
| `GET /api/health` | Statusprüfung |

Ob alles läuft, zeigt die App unter **Portal → System → Funktionsprüfung**
(inklusive Test-E-Mail).

**Push auf dem iPhone:** funktioniert nur, wenn die Seite in Safari über
*Teilen → Zum Home-Bildschirm* installiert und von dort gestartet wird
(ab iOS 16.4). Danach unter *Portal → Benachrichtigungen* das Gerät anmelden.
Jedes Gerät meldet sich einmal selbst an; danach kommen Mitteilungen auch bei
geschlossener App an.

---

## 5. Was beim Anlegen eines Beschlusses passiert

1. Der Beschluss wird gespeichert und über Firestore sofort auf allen Geräten
   sichtbar.
2. Alle Stimmberechtigten erhalten automatisch eine E-Mail mit den Schaltflächen
   **Ja / Nein / Enthaltung**.
3. Parallel geht eine Push-Nachricht an alle angemeldeten Geräte.
4. Ein Klick in der E-Mail öffnet das Portal und verbucht die Stimme – sie wird
   immer für das *angemeldete* Konto gezählt.
