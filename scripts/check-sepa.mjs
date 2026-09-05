/**
 * Prueft die erzeugte SEPA-Datei gegen das offizielle ISO-20022-Schema
 * (schemas/pain.001.001.09.xsd).
 *
 * Hintergrund: zweimal hintereinander hat die Sparkasse eine erzeugte Datei
 * als "ungueltig" abgelehnt - einmal wegen der alten Schema-Version, einmal
 * wegen eines fehlenden Pflichtelements (DbtrAgt). Beides waere hier sofort
 * aufgefallen. Aufruf: npm run check:sepa (braucht xmllint, auf macOS dabei).
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSepaCreditTransfer } from '../src/utils/sepa.ts';

const debtor = {
  name: 'Wirtschaftsjunioren Offenbach am Main e.V.',
  iban: 'DE67505500200000001759',
};
const payments = [
  {
    name: 'Beispiel Empfaenger',
    iban: 'DE55500240240557687501',
    amount: 50,
    reference: 'Zuschuss Beispielveranstaltung',
    endToEndId: 'WJOF-TEST-1',
  },
  {
    name: 'Zweiter Empfaenger',
    iban: 'DE75500240246370546001',
    amount: 100.5,
    reference: 'Auslagenerstattung Beispiel',
    endToEndId: 'WJOF-TEST-2',
  },
];

// Beide Varianten pruefen: mit und ohne hinterlegte BIC des Vereinskontos -
// genau an dieser Unterscheidung hing der letzte Fehler.
const cases = [
  { label: 'ohne Vereins-BIC', debtor },
  { label: 'mit Vereins-BIC', debtor: { ...debtor, bic: 'HELADEF1OFF' } },
];

const dir = mkdtempSync(join(tmpdir(), 'wjof-sepa-'));
let failed = false;

for (const testCase of cases) {
  const result = buildSepaCreditTransfer(testCase.debtor, payments, '2026-01-02', 'Pruefung');
  const file = join(dir, `${testCase.label.replace(/\s+/g, '-')}.xml`);
  writeFileSync(file, result.xml);
  try {
    execFileSync('xmllint', ['--noout', '--schema', 'schemas/pain.001.001.09.xsd', file], {
      stdio: 'pipe',
    });
    console.log(`OK   ${testCase.label} - ${result.fileName}`);
  } catch (err) {
    failed = true;
    console.error(`FEHLER ${testCase.label}:`);
    console.error(String(err.stderr || err.message));
  }
}

rmSync(dir, { recursive: true, force: true });

if (failed) {
  console.error('\nDie SEPA-Datei ist nicht schemakonform - die Bank wird sie ablehnen.');
  process.exit(1);
}
console.log('\nAlle SEPA-Dateien sind schemakonform (pain.001.001.09).');
