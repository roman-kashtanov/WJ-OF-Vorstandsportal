/**
 * Entsperren per Face ID / Touch ID (WebAuthn Platform Authenticator).
 *
 * Zweck: Jedes Vorstandsmitglied nutzt sein eigenes Geraet. Nach der
 * einmaligen Anmeldung (Google + Vorstandscode) bleibt die Sitzung bestehen;
 * beim Oeffnen der App genuegt dann das Gesicht bzw. der Fingerabdruck,
 * statt jedes Mal den Code einzutippen.
 *
 * Wichtige Einordnung: Es gibt hier bewusst keine serverseitige Pruefung der
 * WebAuthn-Signatur. Das ist eine geraetelokale Bildschirmsperre fuer die App -
 * vergleichbar mit der Code-Sperre des Telefons. Der eigentliche Zugriffs-
 * schutz auf die Daten bleibt die Google-Anmeldung plus die Firestore-Regeln.
 */

const CREDENTIAL_KEY = 'wjof_biometric_credential_v1';

interface StoredCredential {
  /** Base64url-kodierte Credential-ID des Geraets */
  id: string;
  memberId: string;
  memberName: string;
  createdAt: string;
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function randomChallenge(): Uint8Array {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes;
}

function readStored(): StoredCredential | null {
  try {
    const raw = localStorage.getItem(CREDENTIAL_KEY);
    return raw ? (JSON.parse(raw) as StoredCredential) : null;
  } catch {
    return null;
  }
}

export const Biometric = {
  /** Unterstuetzt das Geraet Face ID / Touch ID im Browser? */
  async isSupported(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  },

  /** Ist auf diesem Geraet bereits eine Entsperrung eingerichtet? */
  isEnabled(): boolean {
    return readStored() !== null;
  },

  /** Fuer wen wurde die Entsperrung eingerichtet? */
  enabledFor(): StoredCredential | null {
    return readStored();
  },

  /**
   * Richtet die Entsperrung fuer das aktuelle Geraet ein.
   * Loest die Face-ID-/Touch-ID-Abfrage des Betriebssystems aus.
   */
  async enable(member: {
    id: string;
    name: string;
    email: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!(await this.isSupported())) {
      return {
        ok: false,
        error:
          'Dieses Gerät unterstützt keine biometrische Entsperrung. Auf dem iPhone muss die App über „Teilen → Zum Home-Bildschirm" installiert und von dort gestartet werden.',
      };
    }

    try {
      const userId = new TextEncoder().encode(member.id);

      const credential = (await navigator.credentials.create({
        publicKey: {
          challenge: randomChallenge(),
          rp: { name: 'WJOF Vorstandsportal', id: window.location.hostname },
          user: {
            id: userId,
            name: member.email || member.name,
            displayName: member.name,
          },
          // ES256 und RS256 - deckt Apple, Android und Windows Hello ab
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            // "platform" = fest eingebauter Sensor (Face ID / Touch ID),
            // kein externer Sicherheitsschluessel
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred',
          },
          timeout: 60000,
          attestation: 'none',
        },
      })) as PublicKeyCredential | null;

      if (!credential) {
        return { ok: false, error: 'Einrichtung wurde abgebrochen.' };
      }

      const stored: StoredCredential = {
        id: toBase64Url(credential.rawId),
        memberId: member.id,
        memberName: member.name,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(CREDENTIAL_KEY, JSON.stringify(stored));
      return { ok: true };
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        return { ok: false, error: 'Die Abfrage wurde abgebrochen oder ist abgelaufen.' };
      }
      return { ok: false, error: err?.message || 'Einrichtung fehlgeschlagen.' };
    }
  },

  /** Fragt Face ID / Touch ID ab, um die App zu entsperren. */
  async verify(): Promise<{ ok: boolean; error?: string }> {
    const stored = readStored();
    if (!stored) return { ok: false, error: 'Für dieses Gerät ist keine Entsperrung eingerichtet.' };

    try {
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: randomChallenge(),
          rpId: window.location.hostname,
          allowCredentials: [
            {
              type: 'public-key',
              id: fromBase64Url(stored.id),
            },
          ],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      return assertion ? { ok: true } : { ok: false, error: 'Entsperrung abgebrochen.' };
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        return { ok: false, error: 'Entsperrung abgebrochen.' };
      }
      return { ok: false, error: err?.message || 'Entsperrung fehlgeschlagen.' };
    }
  },

  /** Entfernt die Entsperrung von diesem Geraet. */
  disable(): void {
    localStorage.removeItem(CREDENTIAL_KEY);
  },
};
