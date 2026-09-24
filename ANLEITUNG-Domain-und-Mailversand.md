# Anleitung: Mailversand über Resend mit eigener Domain

Stand: 24.09.2026. Das Portal läuft unter **`https://app.vorstandsportal.cloud`**
(Domain `vorstandsportal.cloud` bei IONOS, Unteradresse `app` zeigt auf
Netlify – siehe CLAUDE.md, Abschnitt v4.1.1/v4.2.0).

Diese Anleitung stellt den **Mailversand** um: weg vom Gmail-Postfach
`offenbachwj@gmail.com`, hin zu **Resend** mit Absender auf der eigenen Domain,
z. B. `portal@vorstandsportal.cloud`.

**Am Programm muss dafür nichts geändert werden** – der Server kann Resend
bereits. Es sind nur Einstellungen bei Resend, IONOS und Netlify.

---

## Warum überhaupt umstellen?

| Heute (Gmail) | Mit Resend |
|---|---|
| Absender ist eine `@gmail.com`-Adresse – wirkt privat, landet öfter im Spam | Absender auf der eigenen Domain, per DKIM unterschrieben |
| Gmail begrenzt auf ca. 500 Empfänger pro Tag | kostenloser Tarif: 3.000 Mails im Monat, 100 pro Tag – reicht deutlich |
| Versand hängt am Passwort eines Google-Kontos | Versand über einen eigenen Schlüssel, jederzeit austauschbar |

Früher war Resend bewusst **nicht** gewählt, weil die Einrichtung den
SPF-Eintrag von `wj-offenbach.de` (IONOS + vereinonline.org) berührt hätte.
Mit der eigenen Domain `vorstandsportal.cloud` gibt es dieses Risiko nicht
mehr – sie wird von nichts anderem genutzt.

---

## Schritt 1: Konto bei Resend

1. Auf [resend.com](https://resend.com) registrieren.
   **Mit dem Vereins-Postfach `offenbachwj@gmail.com`**, nicht privat – dann
   lässt sich der Zugang später übergeben.
2. Der kostenlose Tarif genügt.

## Schritt 2: Domain bei Resend eintragen

1. Resend → **Domains** → **Add Domain**.
2. Domain: **`vorstandsportal.cloud`**
3. Region: **Ireland (eu-west-1)** – Daten bleiben in der EU.
4. Resend zeigt danach eine Liste von DNS-Einträgen. Die Werte sind für jedes
   Konto anders, also **genau so übernehmen, wie Resend sie anzeigt**. Typisch
   sind:

| Typ | Hostname (bei IONOS eintragen) | Wert (aus Resend kopieren) |
|---|---|---|
| TXT | `resend._domainkey` | langer Schlüssel, beginnt mit `p=…` |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com`, Priorität 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` |
| TXT *(empfohlen)* | `_dmarc` | `v=DMARC1; p=none;` |

## Schritt 3: Einträge bei IONOS setzen

IONOS → **Domains & SSL** → `vorstandsportal.cloud` → **DNS** →
**Record hinzufügen**.

- Beim Hostnamen nur den Teil **vor** `vorstandsportal.cloud` eintragen.
  Zeigt Resend `resend._domainkey.vorstandsportal.cloud`, gehört in das Feld
  nur `resend._domainkey`.
- TTL: kleinster Wert (5 Minuten).
- **Nichts löschen oder ändern**, was schon da ist – insbesondere nicht:
  - den CNAME `app` (das Portal),
  - die MX-Einträge `mx00/mx01.ionos.de` und den SPF-Eintrag der Hauptdomain
    (E-Mail-Empfang bei IONOS),
  - die DKIM-Einträge `s1-ionos._domainkey` / `s2-ionos._domainkey`.

  Die Resend-Einträge liegen unter anderen Namen (`send`,
  `resend._domainkey`, `_dmarc`) und vertragen sich damit.
- Meldet IONOS wie beim `app`-Eintrag einen Konflikt mit einem „Service", die
  Liste genau lesen: Abgeschaltet werden darf nur etwas, das zu `send` gehört,
  **nie** Einträge der Hauptdomain.

Danach in Resend auf **Verify DNS Records** klicken. Das dauert Minuten bis
wenige Stunden, bis alle Einträge grün sind.

## Schritt 4: Schlüssel anlegen

Resend → **API Keys** → **Create API Key**:

- Name: `Vorstandsportal`
- Berechtigung: **Sending access**
- Domain: `vorstandsportal.cloud`

Den Schlüssel (beginnt mit `re_`) sofort kopieren – Resend zeigt ihn nur
einmal. **Nirgends in den Code oder in Nachrichten schreiben**, nur in Netlify.

## Schritt 5: In Netlify hinterlegen

Netlify → **Site configuration** → **Environment variables** → hinzufügen:

| Variable | Wert |
|---|---|
| `RESEND_API_KEY` | der Schlüssel aus Schritt 4 |
| `RESEND_FROM` | `WJOF Vorstandsportal <portal@vorstandsportal.cloud>` |
| `MAIL_REPLY_TO` | eine Adresse, die gelesen wird – vorerst `offenbachwj@gmail.com` |
| `MAIL_PROVIDER` | `resend` |

- Der Wechsel passiert **erst durch `MAIL_PROVIDER=resend`**. Solange diese
  Variable fehlt, verschickt das Portal weiter über Gmail – auch wenn die
  Resend-Werte schon eingetragen sind.
- Die vorhandenen Gmail-Variablen (`SMTP_USER`, `SMTP_PASSWORD`) **stehen
  lassen**. Klappt mit Resend etwas nicht, genügt es, `MAIL_PROVIDER` zu
  entfernen – dann läuft sofort wieder alles über Gmail.
- `portal@` muss kein echtes Postfach sein; Resend darf mit jeder Adresse der
  verifizierten Domain senden. Antworten gehen an `MAIL_REPLY_TO`.

Danach **Deploys → Trigger deploy → Deploy site**, damit die neuen Werte greifen.

## Schritt 6: Testen

1. Im Portal **Einstellungen → System → Funktionsprüfung** → eigene Adresse
   eintragen → **Test-E-Mail**.
2. Die Mail muss von `portal@vorstandsportal.cloud` kommen.
3. In Gmail bei der Test-Mail **⋮ → Original anzeigen**: bei **SPF**, **DKIM**
   und **DMARC** sollte jeweils `PASS` stehen.

Kommt eine Fehlermeldung von Resend (z. B. „domain is not verified"), ist
Schritt 3 noch nicht durch – etwas warten, in Resend erneut prüfen.

---

## Kurzfassung zum Abhaken

- [ ] Resend-Konto mit `offenbachwj@gmail.com`
- [ ] Domain `vorstandsportal.cloud` bei Resend, Region Irland
- [ ] DNS-Einträge aus Resend bei IONOS gesetzt (nichts Bestehendes gelöscht)
- [ ] Resend zeigt alle Einträge als verifiziert
- [ ] API-Schlüssel (Sending access) angelegt
- [ ] Netlify: `RESEND_API_KEY`, `RESEND_FROM`, `MAIL_REPLY_TO`, `MAIL_PROVIDER=resend`
- [ ] Neu veröffentlicht (Trigger deploy)
- [ ] Test-E-Mail angekommen, SPF/DKIM/DMARC = PASS
