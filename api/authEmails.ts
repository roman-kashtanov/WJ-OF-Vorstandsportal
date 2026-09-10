/**
 * E-Mails rund um die Anmeldung: Einladung und Passwort vergessen.
 *
 * Die Einladung stellt die Installation als App bewusst gross und als
 * eigenen, farbig hervorgehobenen Schritt dar - in der frueheren Fassung
 * stand sie klein am Ende und wurde schlicht uebersehen.
 */

export function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function layout(inner: string): string {
  return `
<div style="font-family: ${FONT}; color: #0f172a; max-width: 560px; margin: 0 auto; background: #f1f5f9; padding: 16px;">
  <div style="background: #003594; color: #ffffff; padding: 20px 24px; border-radius: 16px 16px 0 0;">
    <div style="font-weight: 800; font-size: 18px; letter-spacing: -0.5px;">WJOF.</div>
    <div style="font-size: 12px; color: #bfdbfe; margin-top: 2px;">Vorstandsportal · Wirtschaftsjunioren Offenbach am Main e.V.</div>
  </div>
  <div style="background: #ffffff; border-radius: 0 0 16px 16px; padding: 24px;">
    ${inner}
    <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0;">
      Diese E-Mail kam automatisch aus dem WJOF Vorstandsportal.
    </p>
  </div>
</div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; padding: 14px 28px; background: #003594; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 15px;">${label}</a>`;
}

function stepHeading(number: number, title: string, color = '#003594'): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 10px;"><tr>
      <td style="width: 28px; height: 28px; border-radius: 14px; background: ${color}; color: #ffffff; font-weight: 800; font-size: 14px; text-align: center; vertical-align: middle;">${number}</td>
      <td style="padding-left: 10px; font-weight: 800; font-size: 16px; color: #0f172a;">${title}</td>
    </tr></table>`;
}

function list(items: string[]): string {
  return `<ol style="margin: 6px 0 0; padding-left: 20px; font-size: 14px; line-height: 1.6; color: #334155;">${items
    .map((i) => `<li style="margin-bottom: 4px;">${i}</li>`)
    .join('')}</ol>`;
}

export function inviteEmail(input: {
  name: string;
  email: string;
  link: string;
  portalUrl: string;
  validDays: number;
}): { subject: string; html: string; text: string } {
  const name = escapeHtml(input.name);
  const email = escapeHtml(input.email);
  const portal = escapeHtml(input.portalUrl);

  const html = layout(`
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 8px;">Hallo ${name},</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      du wurdest für das Vorstandsportal der Wirtschaftsjunioren Offenbach freigeschaltet.
      In drei Schritten bist du startklar – das dauert etwa zwei Minuten.
    </p>

    <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 14px;">
      ${stepHeading(1, 'Passwort festlegen')}
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 14px;">
        Tippe auf den Knopf und wähle dein persönliches Passwort.
        Der Link gilt ${input.validDays} Tage.
      </p>
      <p style="text-align: center; margin: 0;">${button(input.link, 'Passwort festlegen')}</p>
    </div>

    <div style="border: 2px solid #f59e0b; background: #fffbeb; border-radius: 14px; padding: 16px; margin-bottom: 14px;">
      ${stepHeading(2, 'Als App auf den Home-Bildschirm legen', '#d97706')}
      <p style="font-size: 14px; line-height: 1.6; color: #78350f; margin: 0 0 12px;">
        <strong>Bitte nicht überspringen:</strong> Das Portal gibt es nicht im App Store. Du legst es
        direkt aus dem Browser auf deinen Home-Bildschirm. Nur so bekommst du Benachrichtigungen bei
        neuen Beschlüssen und kannst mit Face ID entsperren.
      </p>

      <div style="background: #ffffff; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;">
        <div style="font-weight: 700; font-size: 14px;">📱 iPhone / iPad</div>
        ${list([
          `<a href="${portal}" style="color: #003594; font-weight: 700;">${portal}</a> in <strong>Safari</strong> öffnen. Kommst du aus der Gmail- oder Outlook-App, zuerst „In Safari öffnen" wählen.`,
          'Unten auf das <strong>Teilen-Symbol</strong> tippen (Quadrat mit Pfeil nach oben).',
          'Nach unten wischen und <strong>„Zum Home-Bildschirm"</strong> wählen.',
          'Oben rechts <strong>„Hinzufügen"</strong> tippen – fertig.',
        ])}
      </div>

      <div style="background: #ffffff; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px;">
        <div style="font-weight: 700; font-size: 14px;">🤖 Android</div>
        ${list([
          `<a href="${portal}" style="color: #003594; font-weight: 700;">${portal}</a> in <strong>Chrome</strong> öffnen.`,
          'Oben rechts auf das <strong>Menü ⋮</strong> tippen.',
          '<strong>„App installieren"</strong> bzw. „Zum Startbildschirm hinzufügen" wählen.',
        ])}
      </div>

      <div style="background: #ffffff; border-radius: 10px; padding: 12px 14px;">
        <div style="font-weight: 700; font-size: 14px;">💻 Computer</div>
        <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 6px 0 0;">
          Nichts zu installieren – <a href="${portal}" style="color: #003594; font-weight: 700;">${portal}</a>
          im Browser öffnen, am besten als Lesezeichen speichern.
        </p>
      </div>
    </div>

    <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px;">
      ${stepHeading(3, 'Anmelden')}
      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
        App öffnen und mit <strong>${email}</strong> und deinem Passwort anmelden. Beim ersten Mal
        fragt das Portal gegebenenfalls den 5-stelligen Vorstandscode ab – den bekommst du vom
        Vorstand, er steht aus Sicherheitsgründen nicht in dieser E-Mail.
      </p>
      <p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 10px 0 0;">
        „Mit Google anmelden" funktioniert nur, wenn ${email} selbst ein Google-Konto ist – ein
        anderes (z.&nbsp;B. privates) Google-Konto wird nicht erkannt.
      </p>
    </div>

    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Der Knopf funktioniert nicht? Diese Adresse in den Browser kopieren:<br>
      <span style="word-break: break-all;">${escapeHtml(input.link)}</span>
    </p>
  `);

  const text = [
    `Hallo ${input.name},`,
    '',
    'du wurdest für das Vorstandsportal der Wirtschaftsjunioren Offenbach freigeschaltet.',
    '',
    `1) PASSWORT FESTLEGEN (Link gilt ${input.validDays} Tage):`,
    input.link,
    '',
    '2) ALS APP AUF DEN HOME-BILDSCHIRM LEGEN – bitte nicht überspringen:',
    `iPhone/iPad: ${input.portalUrl} in Safari öffnen → Teilen-Symbol → „Zum Home-Bildschirm" → „Hinzufügen".`,
    `Android: ${input.portalUrl} in Chrome öffnen → Menü ⋮ → „App installieren".`,
    `Computer: ${input.portalUrl} im Browser öffnen, nichts zu installieren.`,
    '',
    `3) ANMELDEN mit ${input.email} und deinem Passwort. Den Vorstandscode bekommst du vom Vorstand.`,
    `„Mit Google anmelden" geht nur, wenn ${input.email} selbst ein Google-Konto ist.`,
  ].join('\n');

  return { subject: 'Einladung zum WJOF Vorstandsportal – bitte Passwort festlegen', html, text };
}

export function passwordResetEmail(input: { link: string }): { subject: string; html: string; text: string } {
  const html = layout(`
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 16px;">Hallo,</p>
    <p style="font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
      für dein Konto im Vorstandsportal wurde ein neues Passwort angefordert.
      Tippe auf den Knopf, um es festzulegen. Der Link gilt <strong>1 Stunde</strong>.
    </p>
    <p style="text-align: center; margin: 0 0 20px;">${button(input.link, 'Neues Passwort festlegen')}</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0;">
      Du hast das nicht angefordert? Dann ignoriere diese E-Mail einfach – dein bisheriges Passwort
      bleibt gültig.
    </p>
    <p style="font-size: 12px; line-height: 1.6; color: #64748b; margin: 20px 0 0;">
      Der Knopf funktioniert nicht? Diese Adresse in den Browser kopieren:<br>
      <span style="word-break: break-all;">${escapeHtml(input.link)}</span>
    </p>
  `);

  const text = [
    'Hallo,',
    '',
    'für dein Konto im Vorstandsportal wurde ein neues Passwort angefordert.',
    'Neues Passwort festlegen (Link gilt 1 Stunde):',
    input.link,
    '',
    'Du hast das nicht angefordert? Dann ignoriere diese E-Mail – dein bisheriges Passwort bleibt gültig.',
  ].join('\n');

  return { subject: 'Neues Passwort für das WJOF Vorstandsportal', html, text };
}
