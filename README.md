# WJOF Vorstandsportal

Digitales Vorstandsportal der Wirtschaftsjunioren Offenbach am Main e. V. –
Umlaufbeschlüsse mit Abstimmung, Belegverwaltung und Vorstandssitzungen.

React + Vite (Frontend) · Firebase Firestore (Echtzeit-Daten) ·
Netlify Functions (E-Mail & Push) · PWA (Installation auf dem Smartphone).

---

## 1. Einmalige Einrichtung

### 1.1 Firebase (WJ-Google-Konto)

Im Projekt **`wj-vorstandsportal`** fehlt bisher die Datenbank – das ist der
Grund, warum die Echtzeit-Synchronisation nicht funktioniert hat.

1. <https://console.firebase.google.com> mit dem **WJ-Google-Konto** öffnen,
   Projekt `wj-vorstandsportal` auswählen.
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

> Der bisher verwendete Schlüssel `re_LiEXBD84…` wird von Resend als **ungültig**
> zurückgewiesen und stand zusätzlich im Browser-Code. Bitte einen **neuen
> Schlüssel** erzeugen und den alten löschen.

1. <https://resend.com> → **API Keys** → neuen Key erstellen.
2. Optional, aber empfohlen: **Domains → Add Domain** mit der Vereinsdomain
   (z. B. `wj-offenbach.de`). Resend zeigt DNS-Einträge (DKIM/SPF), die beim
   Domain-Anbieter hinterlegt werden. Erst danach darf als Absender
   `vorstand@wj-offenbach.de` verwendet werden.
   Bis dahin funktioniert ausschließlich `onboarding@resend.dev`, und
   Empfänger darf nur die bei Resend registrierte Adresse sein.

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
