import { FirebaseSync } from './firebaseSync';
import { BoardMember } from '../types';
import { urlBase64ToUint8Array } from './webPushHelper';
/**
 * PWA & Push Notification Management Utility
 * Supports Service Worker registration, Web Push API, Home Screen Installation prompts.
 */

let deferredInstallPrompt: any = null;

export const PwaNotificationService = {
  /**
   * Register Service Worker
   */
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      console.log('PWA: Service Worker registered successfully', registration.scope);
      return registration;
    } catch (error) {
      console.warn('PWA: Service Worker registration failed:', error);
      return null;
    }
  },

  /**
   * Initialize PWA install listener
   */
  initInstallPromptListener(callback?: (canInstall: boolean) => void) {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      if (callback) callback(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      if (callback) callback(false);
      console.log('PWA: App successfully installed to home screen.');
    });
  },

  /**
   * Prompt user to install PWA on device
   */
  async promptInstall(): Promise<'accepted' | 'dismissed' | 'unsupported'> {
    if (!deferredInstallPrompt) {
      return 'unsupported';
    }

    try {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        deferredInstallPrompt = null;
        return 'accepted';
      }
      return 'dismissed';
    } catch (e) {
      console.error('PWA install error', e);
      return 'unsupported';
    }
  },

  /**
   * Check if app is running in standalone PWA mode
   */
  isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  },

  /**
   * Detect iOS device
   */
  isIos(): boolean {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  },

  /**
   * Check current Push Notification permission
   */
  getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  },

  /**
   * Request push permission from user
   */
  async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.error('Error requesting notification permission', err);
      return 'denied';
    }
  },

  /**
   * Trigger a native device/browser push notification
   * Handles both active foreground and background via Service Worker
   */
  async showPushNotification(options: {
    title: string;
    body: string;
    url?: string;
    tag?: string;
  }): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission !== 'granted') {
      return false;
    }

    const { title, body, url = '/', tag } = options;

    try {
      // Prefer Service Worker registration to show native push notification (works even if minimized)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && 'showNotification' in registration) {
          await (registration as any).showNotification(title, {
            body,
            icon: '/icon-192.svg',
            badge: '/icon-192.svg',
            tag: tag || `wj-notice-${Date.now()}`,
            data: { url },
            vibrate: [200, 100, 200],
          });
          return true;
        }
      }

      // Fallback: Standard browser Notification
      const notification = new Notification(title, {
        body,
        icon: '/icon-192.svg',
        tag: tag || `wj-notice-${Date.now()}`,
      } as any);

      notification.onclick = () => {
        window.focus();
        if (url && url !== '/') {
          window.location.href = url;
        }
        notification.close();
      };

      return true;
    } catch (err) {
      console.warn('Native notification failed:', err);
      return false;
    }
  },
};


const DEVICE_ID_KEY = 'wjof_device_id';

/** Stabile, geraetebezogene ID, damit ein Geraet nur ein Push-Abo besitzt. */
function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `dev_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Meldet dieses Geraet fuer echte Push-Benachrichtigungen an.
 * Danach erreichen Mitteilungen das Geraet auch bei geschlossener App.
 */
export const subscribeToPushServer = async (
  currentMember: BoardMember
): Promise<{ ok: boolean; error?: string }> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return {
        ok: false,
        error:
          'Dieser Browser unterstuetzt keine Push-Benachrichtigungen. Auf dem iPhone muss die App ueber "Teilen -> Zum Home-Bildschirm" installiert und von dort gestartet werden.',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: 'Die Benachrichtigungs-Berechtigung wurde nicht erteilt.' };
    }

    await PwaNotificationService.registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;

    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) {
      return {
        ok: false,
        error:
          'Der Push-Dienst ist auf dem Server nicht eingerichtet (VAPID-Schluessel fehlen).',
      };
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      return { ok: false, error: 'Der Server liefert keinen VAPID-Schluessel.' };
    }

    let subscription = await registration.pushManager.getSubscription();

    // Bestehendes Abo verwerfen, falls es zu einem alten Schluessel gehoert
    if (subscription) {
      const existingKey = subscription.options?.applicationServerKey;
      const wanted = urlBase64ToUint8Array(publicKey);
      const matches =
        existingKey && new Uint8Array(existingKey).every((b, i) => b === wanted[i]);
      if (!matches) {
        await subscription.unsubscribe().catch(() => {});
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await FirebaseSync.savePushSubscription({
      id: getDeviceId(),
      memberId: currentMember.id,
      memberName: currentMember.name,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    });

    return { ok: true };
  } catch (err: any) {
    console.error('Push-Anmeldung fehlgeschlagen:', err);
    return { ok: false, error: err?.message || 'Unbekannter Fehler bei der Push-Anmeldung.' };
  }
};

/** Meldet dieses Geraet wieder ab. */
export const unsubscribeFromPushServer = async (): Promise<void> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await subscription.unsubscribe().catch(() => {});
  } catch {
    /* ignorieren */
  }
  await FirebaseSync.deletePushSubscription(getDeviceId());
};

/** Ist dieses Geraet aktuell fuer Push angemeldet? */
export const isDeviceSubscribed = async (): Promise<boolean> => {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
};
