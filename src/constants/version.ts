import { AppVersionConfig } from '../types';

export const CURRENT_APP_VERSION = '3.0.0';
export const APP_BUILD_DATE = '02.09.2026';

export const DEFAULT_VERSION_CONFIG: AppVersionConfig = {
  latestVersion: CURRENT_APP_VERSION,
  minRequiredVersion: CURRENT_APP_VERSION,
  forceUpdateEnabled: false,
  releaseNotes: 'Version 3.0.0: E-Mail-Versand und Push-Benachrichtigungen laufen jetzt serverseitig ueber Netlify Functions. Firebase auf das WJ-Konto umgestellt, Anmeldung ausschliesslich ueber Google.',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
};

/**
 * Compares two semantic version strings (e.g. "2.5.0" vs "2.4.1").
 * Returns:
 *   1 if v1 > v2
 *  -1 if v1 < v2
 *   0 if v1 === v2
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;
  const parse = (v: string) =>
    v
      .replace(/^[vV]/, '')
      .split('.')
      .map((part) => parseInt(part, 10) || 0);

  const p1 = parse(v1);
  const p2 = parse(v2);
  const len = Math.max(p1.length, p2.length);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] ?? 0;
    const num2 = p2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Checks if the current client is outdated compared to latestVersion.
 */
export function isVersionOutdated(currentVersion: string, latestVersion: string): boolean {
  return compareVersions(currentVersion, latestVersion) < 0;
}

/**
 * Checks if the current client is below the required minimum version.
 */
export function isVersionBelowMinimum(currentVersion: string, minRequiredVersion: string): boolean {
  return compareVersions(currentVersion, minRequiredVersion) < 0;
}

/**
 * Forces a hard reload of the application, clearing Service Worker and caches if possible.
 */
export async function forceAppReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
      }
    }
  } catch (e) {
    console.warn('Cache clear error:', e);
  } finally {
    // Append timestamp query to bypass any aggressive browser cache
    const url = new URL(window.location.href);
    url.searchParams.set('_v', Date.now().toString());
    window.location.href = url.toString();
  }
}
