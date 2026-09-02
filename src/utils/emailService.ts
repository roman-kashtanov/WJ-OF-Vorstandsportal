import { BoardMember, Resolution, InvoiceRequest, VoteType } from '../types';
import { formatCurrency, formatDate } from './formatters';

export const EmailService = {
  /**
   * Generates the app URL based on window.location
   */
  getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}${window.location.pathname}`;
    }
    return 'https://vorstand.wj-offenbach.de';
  },

  /**
   * Build 1-Click Vote link
   */
  buildVoteUrl(resolutionId: string, memberId: string, vote: VoteType, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    const token = btoa(`${resolutionId}:${memberId}:${vote}:${Date.now()}`).substring(0, 16);
    return `${base}?action=vote&res=${encodeURIComponent(resolutionId)}&member=${encodeURIComponent(memberId)}&vote=${encodeURIComponent(vote)}&token=${token}`;
  },

  /**
   * Build Direct Upload Invoice Link
   */
  buildInvoiceUploadUrl(projectTitle: string, resolutionId?: string, recipientEmail?: string, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    let url = `${base}?action=upload_invoice&project=${encodeURIComponent(projectTitle)}`;
    if (resolutionId) url += `&res=${encodeURIComponent(resolutionId)}`;
    if (recipientEmail) url += `&email=${encodeURIComponent(recipientEmail)}`;
    return url;
  },

  /**
   * Generates formatted HTML email for a resolution vote request
   */
  generateResolutionEmailHtml(resolution: Resolution, member: BoardMember, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    const yesUrl = this.buildVoteUrl(resolution.id, member.id, 'yes', base);
    const noUrl = this.buildVoteUrl(resolution.id, member.id, 'no', base);
    const abstainUrl = this.buildVoteUrl(resolution.id, member.id, 'abstain', base);
    const detailUrl = `${base}?action=view_resolution&res=${encodeURIComponent(resolution.id)}`;

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Umlaufbeschluss ${resolution.number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #003594; padding: 24px 28px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 4px;">
                      Wirtschaftsjunioren Offenbach am Main e.V.
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Digitales Umlaufverfahren
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); color: #ffffff; padding: 4px 10px; border-radius: 6px; font-family: monospace; font-size: 12px; font-weight: 700;">
                      ${resolution.number}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">
                Hallo <strong>${member.name}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 20px 0; color: #475569; line-height: 1.6;">
                es liegt ein neuer Beschlussentwurf zur Abstimmung im Vorstand vor. Du kannst deine Stimme direkt mit <strong>1 Klick</strong> aus dieser E-Mail abgeben:
              </p>

              <!-- Resolution Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 16px;">
                <tr>
                  <td>
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                      ${resolution.title}
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">
                      Antragsteller: <strong>${resolution.applicant.name}</strong> (${resolution.applicant.role})
                    </div>
                    ${resolution.requestedBudget ? `
                    <div style="display: inline-block; background-color: #dbeafe; color: #1e40af; font-size: 12px; font-weight: 700; padding: 4px 8px; border-radius: 6px; margin-bottom: 12px;">
                      Beantragtes Budget: ${formatCurrency(resolution.requestedBudget)}
                    </div>
                    ` : ''}

                    <!-- Motion Text -->
                    <div style="background-color: #ffffff; border-left: 4px solid #003594; padding: 12px 14px; border-radius: 4px; font-size: 13px; font-style: italic; color: #1e293b; line-height: 1.5;">
                      "${resolution.motionText}"
                    </div>
                  </td>
                </tr>
              </table>

              <!-- 1-CLICK VOTE BUTTONS SECTION -->
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 14px;">
                  ⚡ Deine Stimmabgabe (1-Klick Antwort):
                </div>

                <!-- Primary Action Buttons -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                  <tr>
                    <!-- JA -->
                    <td width="32%" align="center" style="padding-right: 2%;">
                      <a href="${yesUrl}" target="_blank" style="display: block; width: 100%; background-color: #059669; color: #ffffff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                        ✓ ZUSTIMMEN (JA)
                      </a>
                    </td>

                    <!-- NEIN -->
                    <td width="32%" align="center" style="padding-right: 2%;">
                      <a href="${noUrl}" target="_blank" style="display: block; width: 100%; background-color: #dc2626; color: #ffffff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 0; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
                        ✕ ABLEHNEN (NEIN)
                      </a>
                    </td>

                    <!-- ENTHALTUNG -->
                    <td width="32%" align="center">
                      <a href="${abstainUrl}" target="_blank" style="display: block; width: 100%; background-color: #64748b; color: #ffffff; font-weight: 700; font-size: 13px; text-decoration: none; padding: 12px 0; border-radius: 8px; text-align: center;">
                        – ENTHALTUNG
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size: 11px; color: #94a3b8; margin: 8px 0 0 0;">
                  Hinweis: Durch Klick auf einen der Buttons wird deine Stimme unmittelbar und verbindlich im Portal erfasst.
                </p>
              </div>

              <!-- Link to view full details -->
              <div style="border-top: 1px solid #e2e8f0; padding-top: 18px; margin-top: 24px; text-align: center;">
                <a href="${detailUrl}" target="_blank" style="color: #003594; font-size: 13px; font-weight: 600; text-decoration: underline;">
                  📋 Beschluss im Vorstandsportal öffnen & Kommentare lesen →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
              Wirtschaftsjunioren Offenbach am Main e.V. • Digitales Vorstandsportal<br>
              Diese E-Mail wurde automatisiert im Auftrag des Vorstands versendet.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /**
   * Generates plain text email for resolution vote
   */
  generateResolutionEmailText(resolution: Resolution, member: BoardMember, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    const yesUrl = this.buildVoteUrl(resolution.id, member.id, 'yes', base);
    const noUrl = this.buildVoteUrl(resolution.id, member.id, 'no', base);
    const abstainUrl = this.buildVoteUrl(resolution.id, member.id, 'abstain', base);
    const detailUrl = `${base}?action=view_resolution&res=${encodeURIComponent(resolution.id)}`;

    return `WIRTSCHAFTSJUNIOREN OFFENBACH AM MAIN E.V.
Digitales Umlaufverfahren - Beschluss ${resolution.number}
------------------------------------------------------------

Hallo ${member.name},

es liegt ein neuer Beschlussentwurf zur Abstimmung im Vorstand vor.

Titel: ${resolution.title}
Nummer: ${resolution.number}
Antragsteller: ${resolution.applicant.name} (${resolution.applicant.role})

ANTRAGSWORTLAUT:
"${resolution.motionText}"

------------------------------------------------------------
DIREKTE 1-KLICK-STIMMABGABE:
------------------------------------------------------------

[+] JA / ZUSTIMMEN:
${yesUrl}

[-] NEIN / ABLEHNEN:
${noUrl}

[o] ENTHALTUNG:
${abstainUrl}

------------------------------------------------------------
Vollständigen Beschluss & Kommentare im Portal ansehen:
${detailUrl}

--
Wirtschaftsjunioren Offenbach am Main e.V.
Digitales Vorstandsportal`;
  },

  /**
   * Generates formatted HTML email for an Invoice Request
   */
  generateInvoiceRequestEmailHtml(request: InvoiceRequest, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    const uploadUrl = this.buildInvoiceUploadUrl(request.projectTitle, request.resolutionId, request.recipientEmail, base);

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Beleg-Anforderung</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #047857; padding: 24px 28px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #a7f3d0; margin-bottom: 4px;">
                Wirtschaftsjunioren Offenbach am Main e.V.
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                Beleg- & Rechnungsanforderung
              </div>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">
                Hallo <strong>${request.recipientName}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 20px 0; color: #475569; line-height: 1.6;">
                für die ordnungsgemäße Buchhaltung und Kassenprüfung der Wirtschaftsjunioren Offenbach am Main e.V. benötigen wir die Rechnung bzw. den Zahlungsbeleg für folgendes Projekt:
              </p>

              <!-- Project Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td>
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                      📁 ${request.projectTitle}
                    </div>
                    ${request.expectedAmount ? `
                    <div style="font-size: 13px; color: #047857; font-weight: 700; margin-bottom: 6px;">
                      Erwarteter Betrag: ca. ${formatCurrency(request.expectedAmount)}
                    </div>
                    ` : ''}
                    ${request.resolutionNumber ? `
                    <div style="font-size: 12px; color: #4338ca; font-weight: 600; margin-bottom: 6px;">
                      Zugehöriger Vorstandsbeschluss: ${request.resolutionNumber}
                    </div>
                    ` : ''}
                    <div style="font-size: 12px; color: #b91c1c; font-weight: 600; margin-bottom: 12px;">
                      ⏱️ Bitte hochladen bis: ${formatDate(request.deadline)}
                    </div>
                    ${request.notes ? `
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 6px; font-size: 12px; color: #334155;">
                      <strong>Hinweis des Schatzmeisters:</strong> ${request.notes}
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- CTA UPLOAD BUTTON -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${uploadUrl}" target="_blank" style="display: inline-block; background-color: #047857; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(4, 120, 87, 0.3);">
                  📥 Rechnung jetzt direkt im Portal hochladen →
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin: 10px 0 0 0;">
                  PDF oder Foto/Scan des Belegs genügen.
                </p>
              </div>

              <p style="font-size: 12px; color: #64748b; margin: 20px 0 0 0;">
                Angefordert von: <strong>${request.requestedBy.name}</strong> (${request.requestedBy.role})
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
              Wirtschaftsjunioren Offenbach am Main e.V. • Finanzen & Rechnungsverwaltung
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /**
   * Generates plain text email for invoice request
   */
  generateInvoiceRequestEmailText(request: InvoiceRequest, baseUrl?: string): string {
    const base = baseUrl || this.getBaseUrl();
    const uploadUrl = this.buildInvoiceUploadUrl(request.projectTitle, request.resolutionId, request.recipientEmail, base);

    return `WIRTSCHAFTSJUNIOREN OFFENBACH AM MAIN E.V.
Beleg- & Rechnungsanforderung
------------------------------------------------------------

Hallo ${request.recipientName},

für die ordnungsgemäße Buchhaltung benötigen wir den Beleg für folgendes Projekt:

Projekt/Veranstaltung: ${request.projectTitle}
${request.expectedAmount ? `Erwarteter Betrag: ${formatCurrency(request.expectedAmount)}\n` : ''}${request.resolutionNumber ? `Vorstandsbeschluss: ${request.resolutionNumber}\n` : ''}Frist: bis ${formatDate(request.deadline)}
${request.notes ? `Hinweis: ${request.notes}\n` : ''}
Angefordert von: ${request.requestedBy.name} (${request.requestedBy.role})

------------------------------------------------------------
RECHNUNG DIREKT HOCHLADEN:
------------------------------------------------------------
${uploadUrl}

(PDF oder Foto des Belegs einfach im Formular ablegen)

--
Wirtschaftsjunioren Offenbach am Main e.V.
Finanzen & Schatzmeister`;
  },

  /**
   * Generates a random secure initial password
   */
  generateRandomPassword(length: number = 10): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let suffix = '';
    const targetLen = Math.max(4, length - 8);
    for (let i = 0; i < targetLen; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const currentYear = new Date().getFullYear();
    return `WJ-${currentYear}-${suffix}`;
  },

  /**
   * Generates formatted HTML email with login credentials for a new or updated user
   */
  generateUserCredentialsEmailHtml(params: {
    member: BoardMember;
    password?: string;
    passcode?: string;
    isAdmin?: boolean;
    isStaff?: boolean;
    createdByName?: string;
    adminName?: string;
    portalUrl?: string;
  }): string {
    const { member, password, passcode, isAdmin, isStaff, createdByName, adminName, portalUrl } = params;
    const authorName = createdByName || adminName;
    const base = portalUrl || this.getBaseUrl();
    const loginUrl = `${base}?action=login&email=${encodeURIComponent(member.email)}`;

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deine Zugangsdaten zum WJ Vorstandsportal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #003594; padding: 24px 28px; text-align: left;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 4px;">
                      Wirtschaftsjunioren Offenbach am Main e.V.
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      Dein Zugang zum Vorstandsportal
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <span style="display: inline-block; background-color: ${isAdmin ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)'}; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700;">
                      ${isAdmin ? '👑 Administrator' : 'Vorstand'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">
                Hallo <strong>${member.name}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 20px 0; color: #475569; line-height: 1.6;">
                für dich wurde ein Benutzerkonto im <strong>WJ Vorstandsportal</strong> eingerichtet${authorName ? ` (durch <strong>${authorName}</strong>)` : ''}.
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px; padding: 18px;">
                <tr>
                  <td>
                    <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #003594; margin-bottom: 12px;">
                      🔑 Deine persönlichen Zugangsdaten:
                    </div>

                    <table width="100%" cellpadding="6" cellspacing="0" border="0" style="font-size: 13px;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Benutzer / E-Mail:</td>
                        <td style="font-weight: 700; color: #0f172a; border-bottom: 1px solid #f1f5f9;">
                          <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${member.email}</code>
                        </td>
                      </tr>
                      ${password ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Passwort:</td>
                        <td style="font-weight: 700; color: #003594; border-bottom: 1px solid #f1f5f9;">
                          <code style="background-color: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; letter-spacing: 0.5px;">${password}</code>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Vorstandsfunktion:</td>
                        <td style="font-weight: 700; color: #334155; border-bottom: 1px solid #f1f5f9;">
                          ${member.role}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600; border-bottom: 1px solid #f1f5f9;">Berechtigung:</td>
                        <td style="font-weight: 700; color: ${isAdmin ? '#d97706' : '#059669'}; border-bottom: 1px solid #f1f5f9;">
                          ${isAdmin ? '🌟 Administrator (Voller Systemzugriff)' : '✓ Vorstandsmitglied'}
                        </td>
                      </tr>
                      ${passcode && !isStaff ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">5-stelliger Vorstandscode:</td>
                        <td style="font-weight: 700; color: #475569;">
                          <code style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${passcode}</code>
                        </td>
                      </tr>
                      ` : ''}
                      ${isStaff ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Vorstandscode:</td>
                        <td style="font-weight: 600; color: #059669;">
                          ✓ Befreit (Festangestellt / IHK)
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA LOGIN BUTTON -->
              <div style="text-align: center; margin: 28px 0 20px 0;">
                <a href="${loginUrl}" target="_blank" style="display: inline-block; background-color: #003594; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(0, 53, 148, 0.3);">
                  🚀 Direkt zum Vorstandsportal anmelden →
                </a>
                <p style="font-size: 11px; color: #94a3b8; margin: 10px 0 0 0;">
                  Portal-URL: <a href="${base}" style="color: #003594; text-decoration: underline;">${base}</a>
                </p>
              </div>

              <!-- Info Box -->
              <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 14px; border-radius: 6px; font-size: 12px; color: #1e3a8a; line-height: 1.5; margin-top: 20px;">
                💡 <strong>Sicherheitshinweis:</strong> Du kannst deine Login-Daten nach dem ersten Anmelden in den Portaleinstellungen jederzeit anpassen. Bitte behandle deine Zugangsdaten vertraulich.
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
              Wirtschaftsjunioren Offenbach am Main e.V. • Digitales Vorstandsportal
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /**
   * Generates plain text email with user credentials
   */
  generateUserCredentialsEmailText(params: {
    member: BoardMember;
    password?: string;
    passcode?: string;
    isAdmin?: boolean;
    isStaff?: boolean;
    createdByName?: string;
    adminName?: string;
    portalUrl?: string;
  }): string {
    const { member, password, passcode, isAdmin, isStaff, createdByName, adminName, portalUrl } = params;
    const authorName = createdByName || adminName;
    const base = portalUrl || this.getBaseUrl();
    const loginUrl = `${base}?action=login&email=${encodeURIComponent(member.email)}`;

    return `WIRTSCHAFTSJUNIOREN OFFENBACH AM MAIN E.V.
Deine Zugangsdaten zum Vorstandsportal
------------------------------------------------------------

Hallo ${member.name},

für dich wurde ein Benutzerkonto im WJ Vorstandsportal eingerichtet${authorName ? ` (durch ${authorName})` : ''}.

------------------------------------------------------------
DEINE PERSÖNLICHEN ZUGANGSDATEN:
------------------------------------------------------------
E-Mail / Benutzername: ${member.email}
${password ? `Passwort: ${password}\n` : ''}Vorstandsfunktion: ${member.role}
Rolle: ${isAdmin ? 'Administrator (Voller Systemzugriff)' : 'Vorstandsmitglied'}
${passcode && !isStaff ? `5-stelliger Vorstandscode: ${passcode}\n` : ''}${isStaff ? `Vorstandscode: Befreit (Festangestellt / IHK)\n` : ''}
------------------------------------------------------------
DIREKT ZUM PORTAL ANMELDEN:
------------------------------------------------------------
${loginUrl}

Portal-Adresse: ${base}

Sicherheitshinweis: Bitte behandle deine Zugangsdaten vertraulich. Du kannst dein Passwort nach dem ersten Anmelden in den Portaleinstellungen anpassen.

--
Wirtschaftsjunioren Offenbach am Main e.V.
Digitales Vorstandsportal`;
  },

  /**
   * Generates HTML email when Admin rights are transferred to another member
   */
  generateAdminTransferredEmailHtml(params: {
    newAdmin: BoardMember;
    oldAdmin: BoardMember;
    portalUrl?: string;
  }): string {
    const { newAdmin, oldAdmin, portalUrl } = params;
    const base = portalUrl || this.getBaseUrl();

    return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin-Rechte übertragen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="background-color: #003594; padding: 24px 28px; text-align: left;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #93c5fd; margin-bottom: 4px;">
                Wirtschaftsjunioren Offenbach am Main e.V.
              </div>
              <div style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                👑 Administrator-Rolle übertragen
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="font-size: 15px; margin: 0 0 16px 0; color: #334155;">
                Hallo <strong>${newAdmin.name}</strong>,
              </p>
              <p style="font-size: 14px; margin: 0 0 20px 0; color: #475569; line-height: 1.6;">
                die Haupt-Administrator-Rechte für das <strong>WJ Vorstandsportal</strong> wurden soeben erfolgreich von <strong>${oldAdmin.name}</strong> an dich übertragen.
              </p>
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #92400e; margin-bottom: 24px;">
                <strong>Deine neuen Befugnisse als Administrator:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  <li>Neue Benutzer & Vorstandsmitglieder anlegen & Zugangsdaten versenden</li>
                  <li>Vorstandscode & Berechtigungen verwalten</li>
                  <li>Admin-Rechte bei Bedarf an Nachfolger übergeben</li>
                  <li>Cloud-Synchronisation & Versionsfreigaben steuern</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${base}" target="_blank" style="display: inline-block; background-color: #003594; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
                  Zum Vorstandsportal →
                </a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  },

  /**
   * Generates plain text email when Admin rights are transferred
   */
  generateAdminTransferredEmailText(params: {
    newAdmin: BoardMember;
    oldAdmin: BoardMember;
    portalUrl?: string;
  }): string {
    const { newAdmin, oldAdmin, portalUrl } = params;
    const base = portalUrl || this.getBaseUrl();

    return `WIRTSCHAFTSJUNIOREN OFFENBACH AM MAIN E.V.
Administrator-Rolle übertragen
------------------------------------------------------------

Hallo ${newAdmin.name},

die Haupt-Administrator-Rechte für das WJ Vorstandsportal wurden soeben erfolgreich von ${oldAdmin.name} an dich übertragen.

Deine Befugnisse als Administrator:
- Neue Benutzer anlegen & Zugangsdaten versenden
- Vorstandscode & Sicherheitsberechtigungen verwalten
- Admin-Rechte bei Bedarf weitergeben
- Cloud-Synchronisation steuern

Zum Portal:
${base}

--
Wirtschaftsjunioren Offenbach am Main e.V.`;
  },

  /**
   * Opens native email client with mailto
   */
  openMailto(recipients: string[], subject: string, body: string) {
    const to = recipients.join(',');
    const mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  },

  /**
   * Copies text to clipboard safely
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  }
};

// ---------------------------------------------------------------------------
// Tatsaechlicher Versand ueber den Server (/api/email/send -> Resend)
// Der API-Key liegt ausschliesslich serverseitig in den Netlify-Umgebungs-
// variablen und ist im Browser nicht sichtbar.
// ---------------------------------------------------------------------------

export interface MailSendResult {
  sent: number;
  failed: number;
  errors: string[];
}

/** Versendet eine einzelne E-Mail. Wirft bei Fehlern eine Exception. */
export async function sendMail(params: {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
}): Promise<void> {
  const res = await fetch('/api/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    let message = `Server antwortete mit Status ${res.status}`;
    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      /* HTML-Antwort statt JSON: Endpunkt nicht erreichbar */
      message =
        'Der E-Mail-Endpunkt ist nicht erreichbar. Auf Netlify muss die Function unter /api/* eingerichtet sein.';
    }
    throw new Error(message);
  }
}

/**
 * Verschickt die Abstimmungs-E-Mail mit 1-Klick-Links an mehrere Vorstaende.
 * Sammelt Fehler ein, statt beim ersten Problem abzubrechen.
 */
export async function sendResolutionVoteMails(
  resolution: Resolution,
  recipients: BoardMember[]
): Promise<MailSendResult> {
  const result: MailSendResult = { sent: 0, failed: 0, errors: [] };

  for (const member of recipients) {
    if (!member.email) continue;
    try {
      await sendMail({
        to: [member.email],
        subject: `[Umlaufbeschluss ${resolution.number}] ${resolution.title}`,
        html: EmailService.generateResolutionEmailHtml(resolution, member),
        text: EmailService.generateResolutionEmailText(resolution, member),
      });
      result.sent++;
    } catch (err: any) {
      result.failed++;
      const msg = err?.message || 'Unbekannter Fehler';
      if (!result.errors.includes(msg)) result.errors.push(msg);
    }
  }

  return result;
}
