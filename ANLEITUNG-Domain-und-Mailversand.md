# Anleitung: Eigene Domain und seriöser Mailversand

Diese Anleitung beschreibt, wie das Vorstandsportal von der vorläufigen
Netlify-Adresse auf eine eigene Adresse unter `wj-offenbach.de` umgestellt wird
und wie die E-Mails künftig von einer Vereinsadresse versendet werden.

**Wann machen?** Erst **nach der Vorstellung im Vorstand.** Bis dahin läuft alles
auf der Netlify-Adresse weiter – das genügt für die Testphase mit wenigen
Personen vollkommen.

**Kosten:** keine. Subdomains sind bei einer vorhandenen Domain enthalten,
Resend ist bis 3.000 Mails/Monat kostenlos.

---

## Die beiden Adressen

| Zweck | Subdomain | Sichtbar als |
|---|---|---|
| Das Portal | `vorstandsportal.wj-offenbach.de` | Adresse im Browser und in allen Links |
| Der Mailversand | `vorstand.wj-offenbach.de` | Absender `portal@vorstand.wj-offenbach.de` |

Wichtig: **Punkt, nicht Bindestrich.** `vorstandsportal.wj-offenbach.de` ist eine
kostenlose Subdomain eurer Domain. `vorstandsportal-wj-offenbach.de` wäre
dagegen eine neue Domain, die extra gekauft werden müsste.

Beide Subdomains sind völlig unabhängig von der Vereinswebsite. An
`wj-offenbach.de` selbst wird nichts geändert – die Website läuft unberührt
weiter, es wird lediglich je ein zusätzlicher Wegweiser eingetragen.

---

## Schritt 1: Das Portal unter eigener Adresse

### 1a. Netlify-Adresse nachschauen

In Netlify oben steht die aktuelle Adresse der Seite, etwas wie
`vorstandsportal.netlify.app`. Diesen Wert brauchst du gleich – notiere ihn
genau, inklusive `.netlify.app`.

### 1b. Eintrag bei IONOS

IONOS → **Domains & SSL** → `wj-offenbach.de` → **DNS** → Eintrag hinzufügen:

```
Typ:      CNAME
Hostname: vorstandsportal
Ziel:     <die Adresse aus 1a>
```

Speichern. Die Änderung kann bis zu 24 Stunden brauchen, meistens geht es
deutlich schneller.

### 1c. Domain in Netlify eintragen

Netlify → **Domain management** → **Add a domain** →
`vorstandsportal.wj-offenbach.de` eintragen.

Netlify stellt das Sicherheitszertifikat (HTTPS) automatisch aus, dafür ist
nichts zu tun.

### 1d. Als Hauptadresse setzen

In Netlify bei `vorstandsportal.wj-offenbach.de` auf **„Set as primary domain"**.

Danach zeigt der alte `netlify.app`-Link automatisch auf die neue Adresse, und
alle Links in den E-Mails verwenden ab sofort die neue Adresse. **Am Portal
selbst muss nichts geändert werden** – die App bildet ihre Links immer aus der
Adresse, unter der sie gerade aufgerufen wird.

### Ergebnis nach Schritt 1

Das Portal ist unter `vorstandsportal.wj-offenbach.de` erreichbar. Niemand
bekommt die Netlify-Adresse noch zu sehen. Der Mailversand läuft noch
unverändert über das Gmail-Postfach.

---

## Schritt 2: Mailversand über die Vereinsdomain

### 2a. Konto bei Resend anlegen

Auf [resend.com](https://resend.com) registrieren. Der kostenlose Tarif reicht
(3.000 Mails pro Monat, 100 pro Tag) – das Portal verschickt deutlich weniger.

**Wichtig:** Für die Anmeldung das eigens angelegte Portal-Postfach verwenden,
nicht das private – damit der Zugang später übergeben werden kann.

### 2b. Versand-Subdomain eintragen

In Resend → **Domains** → **Add Domain** → `vorstand.wj-offenbach.de` eintragen.
Ausdrücklich die Subdomain, **nicht** `wj-offenbach.de` (Begründung unten).

Resend zeigt daraufhin eine Liste von DNS-Einträgen an (TXT, teils MX oder
CNAME). Diese Werte sind für jedes Konto anders.

### 2c. Die Einträge bei IONOS setzen

Dieselbe Stelle wie in Schritt 1b: IONOS → **Domains & SSL** →
`wj-offenbach.de` → **DNS**.

Für jeden Eintrag aus Resend einen neuen Eintrag anlegen. Achte darauf, beim
Hostnamen nur den Teil **vor** `wj-offenbach.de` einzutragen – zeigt Resend
z. B. `resend._domainkey.vorstand.wj-offenbach.de` an, gehört bei IONOS in das
Hostname-Feld `resend._domainkey.vorstand`.

Nach dem Speichern in Resend auf **Verify** klicken. Bis alle Einträge erkannt
werden, kann es einige Minuten bis Stunden dauern.

### 2d. In Netlify hinterlegen

Netlify → **Site configuration** → **Environment variables**:

| Variable | Wert |
|---|---|
| `RESEND_API_KEY` | der Schlüssel aus Resend (dort unter *API Keys*) |
| `RESEND_FROM` | `WJ Offenbach Vorstandsportal <portal@vorstand.wj-offenbach.de>` |
| `MAIL_REPLY_TO` | eine echte Adresse, an die Antworten gehen sollen |

Die vorhandenen SMTP-Variablen können stehen bleiben – sie dienen dann als
Rückfallebene. Sobald Resend vollständig eingerichtet ist, nutzt das Portal
automatisch Resend.

Anschließend in Netlify einmal **Deploy** auslösen (oder eine beliebige
Änderung pushen), damit die neuen Werte greifen.

### 2e. Antworten auffangen

Zum reinen **Versenden** wird kein Postfach benötigt – Resend darf senden,
sobald die Domain verifiziert ist. Antwortet aber jemand auf die Mail, muss die
Antwort irgendwo ankommen. Zwei Möglichkeiten:

* `MAIL_REPLY_TO` auf eine bestehende Adresse setzen (einfachster Weg), **oder**
* bei IONOS eine Weiterleitung für `portal@vorstand.wj-offenbach.de` einrichten.

---

## Warum eine Subdomain und nicht `wj-offenbach.de` direkt?

Für den Mailversand gibt es einen DNS-Eintrag namens **SPF**, und davon darf es
pro Domain nur **einen einzigen** geben. Der Verein hat mit Sicherheit bereits
einen, sonst würden die regulären Vereinsmails nicht funktionieren.

Würde man Resend auf der Hauptdomain einrichten, müsste dieser bestehende
Eintrag **erweitert** werden. Macht man das falsch – etwa indem man ihn
überschreibt – landen ab diesem Moment die normalen Vereinsmails im Spam oder
kommen gar nicht mehr an.

Mit einer eigenen Subdomain entsteht dieses Risiko nicht: Sie hat ihre eigenen
Einträge, die Hauptdomain wird nicht angefasst. Resend empfiehlt dieses Vorgehen
ausdrücklich, auch weil der Ruf des Versands damit sauber getrennt bleibt.

---

## Ist das Spam-Problem damit gelöst?

**Weitgehend ja – aber es ist keine Garantie.** Im Einzelnen:

### Was die beiden Schritte beheben

| Ursache | Status |
|---|---|
| Links zeigen auf eine fremde Sammeldomain (`netlify.app`) | mit Schritt 1 behoben |
| Absender `@gmail.com` lässt sich nicht für den Verein signieren | mit Schritt 2 behoben |
| Keine SPF-/DKIM-Signatur für die Vereinsdomain | mit Schritt 2 behoben |
| Mails ohne Nur-Text-Fassung | bereits im Portal behoben (v3.15.3) |
| Keine Antwortadresse, kein Abmeldelink | bereits im Portal behoben (v3.15.3) |

Damit sind alle bekannten technischen Negativsignale ausgeräumt. Das ist der
entscheidende Unterschied: Aus „unbekannter Absender von einer Freemail-Adresse
mit Links auf eine fremde Domain" wird „Absender, der sich nachweislich als
`wj-offenbach.de` ausweist und auf `wj-offenbach.de` verlinkt".

### Was trotzdem passieren kann

* **Die neue Versand-Subdomain hat anfangs noch keinen Ruf.** In den ersten
  Wochen kann es vereinzelt weiter vorkommen, dass eine Mail im Spam landet.
  Das legt sich, sobald ein paar Mails erfolgreich zugestellt und gelesen
  wurden. Nicht mit einer großen Rundmail starten, sondern normal loslaufen
  lassen.
* **Einzelne strenge Filter** (manche Firmen-Postfächer) sortieren unabhängig
  von allem aus. Dagegen hilft keine Einstellung.
* **DMARC:** Für die volle Wirkung sollte die Domain zusätzlich einen
  DMARC-Eintrag haben. Falls `wj-offenbach.de` noch keinen hat, ist das ein
  eigener Schritt – und einer, der die Vereinsmails betrifft. Nur gemeinsam mit
  jemandem machen, der die Mail-Einstellungen des Vereins kennt.

### Was beim Rollout zusätzlich hilft

Wenn das Portal den Mitgliedern vorgestellt wird, ein Satz in die Ankündigung:

> Falls die Bestätigungsmail im Spam-Ordner landet, bitte einmal auf
> „Kein Spam" tippen – danach kommt sie zuverlässig an.

Das ist unspektakulär, aber wirksamer als jede technische Einstellung, weil es
dem Postfach jedes Mitglieds direkt sagt, dass der Absender erwünscht ist.

### Realistische Erwartung

Nach beiden Schritten sollte der Regelfall die Zustellung in den Posteingang
sein. Einzelfälle bleiben möglich – Zustellbarkeit ist immer eine
Wahrscheinlichkeit, keine Zusage. Wichtig ist: Die Ursachen, die man
beeinflussen kann, sind dann beseitigt.

---

## Kurzfassung zum Abhaken

- [ ] **Nach der Vorstellung im Vorstand**
- [ ] Netlify-Adresse notieren
- [ ] IONOS: CNAME `vorstandsportal` → Netlify-Adresse
- [ ] Netlify: Domain hinzufügen und als Hauptadresse setzen
- [ ] *Portal läuft jetzt unter der eigenen Adresse*
- [ ] Resend-Konto mit dem Portal-Postfach anlegen
- [ ] Resend: `vorstand.wj-offenbach.de` als Domain eintragen
- [ ] IONOS: die von Resend angezeigten Einträge setzen, in Resend verifizieren
- [ ] Netlify: `RESEND_API_KEY`, `RESEND_FROM`, `MAIL_REPLY_TO` eintragen
- [ ] Deploy auslösen
- [ ] Testmail an eine eigene Adresse schicken und prüfen, wo sie landet
- [ ] *Mails kommen jetzt von `portal@vorstand.wj-offenbach.de`*
