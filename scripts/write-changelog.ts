import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CHANGELOG } from '../src/data/changelog';

/**
 * Erzeugt CHANGELOG.md aus src/data/changelog.ts (`npm run changelog`).
 * Die TypeScript-Datei ist die einzige Quelle - sie speist auch die Anzeige
 * im Portal (Einstellungen → System und die Fußzeile).
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const lines: string[] = [
  '# Versionsverlauf – WJOF Vorstandsportal',
  '',
  'Diese Datei wird erzeugt: Inhalte bitte in `src/data/changelog.ts` pflegen',
  'und danach `npm run changelog` ausführen. Dieselben Einträge zeigt die App',
  'unter Einstellungen → System und beim Klick auf die Versionsnummer.',
  '',
];

for (const entry of CHANGELOG) {
  lines.push(`## v${entry.version}${entry.date ? ` – ${entry.date}` : ''}`, '', `**${entry.title}**`, '');
  for (const change of entry.changes) lines.push(`- ${change}`);
  lines.push('');
}

writeFileSync(join(root, 'CHANGELOG.md'), lines.join('\n'), 'utf8');
console.log(`CHANGELOG.md geschrieben: ${CHANGELOG.length} Versionen, neueste v${CHANGELOG[0]?.version}`);
