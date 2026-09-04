/**
 * Die Vorstandsrollen/Posten sind KEINE feste, im Code verdrahtete Liste
 * (mehr) - durch die jaehrlichen Neuwahlen aendert sich sowohl die Liste
 * der Posten als auch, wer sie innehat. Admin-editierbar (Settings-
 * Dokument `settings/roleCatalogue`, siehe
 * FirebaseSync.subscribeRoleCatalogue), gleiches Muster wie
 * `SubsidyCatalogueSettings` in `subsidyCatalogue.ts`.
 *
 * `role` auf `BoardMember` ist rein ein Anzeige-Feld - keine
 * Berechtigungslogik haengt an konkreten Werten (das steuern die
 * separaten Felder `isVotingMember`/`isPermanentStaff`).
 */
export interface RoleCatalogueSettings {
  roles: string[];
}

export const DEFAULT_ROLE_CATALOGUE: RoleCatalogueSettings = {
  roles: ['President', 'Vize President', 'Schatzmeister', 'Past Year President'],
};
