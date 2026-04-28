/**
 * Dumps every character of config/welcomeMessage.text with its codepoint
 * so we can prove exactly what whitespace was stored.
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(
    require(path.resolve(
      __dirname,
      '../../landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json'
    ))
  ),
});

const db = admin.firestore();

(async () => {
  const snap = await db.doc('config/welcomeMessage').get();
  const text = snap.data().text || '';

  console.log(`Total length: ${text.length} chars`);
  console.log('');

  // Whitespace stats
  const newlines = (text.match(/\n/g) || []).length;
  const tabs = (text.match(/\t/g) || []).length;
  const carriageReturns = (text.match(/\r/g) || []).length;
  const blankLineRuns = (text.match(/\n\n+/g) || []);

  console.log('Whitespace summary:');
  console.log(`  \\n  newlines:        ${newlines}`);
  console.log(`  \\t  tabs:            ${tabs}`);
  console.log(`  \\r  carriage returns:${carriageReturns}`);
  console.log(`  blank-line runs:    ${blankLineRuns.length}`);
  if (blankLineRuns.length > 0) {
    console.log(`    longest run:      ${Math.max(...blankLineRuns.map(r => r.length))} consecutive \\n`);
  }
  console.log('');

  // Print line by line so you can see exactly what's stored.
  console.log('Line-by-line dump (each \\n breaks a line, blanks shown as ⏎):');
  console.log('─────────────────────────────────────────────────────────────');
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line === '') {
      console.log(`L${String(i + 1).padStart(3, ' ')}: ⏎  (blank line)`);
    } else {
      // Show any leading whitespace explicitly
      const lead = line.match(/^[ \t]+/);
      const leadDesc = lead ? `[${lead[0].length} leading whitespace] ` : '';
      console.log(`L${String(i + 1).padStart(3, ' ')}: ${leadDesc}${line}`);
    }
  });
  console.log('─────────────────────────────────────────────────────────────');

  console.log('');
  console.log('JSON-escaped (proves \\n / \\t are real, not just rendered):');
  console.log(JSON.stringify(text.slice(0, 600)) + (text.length > 600 ? '…' : ''));

  process.exit(0);
})();
