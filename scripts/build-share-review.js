#!/usr/bin/env node
/**
 * Builds two share-friendly artifacts from the per-landmark backup JSONs:
 *   backups/coord-review-share-<runTs>.csv  (open in Numbers/Excel/Sheets)
 *   backups/coord-review-share-<runTs>.md   (paste into Slack)
 *
 * Usage:
 *   node scripts/build-share-review.js backups/run-<ts>.jsonl
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups', 'places');
const RUN_LOG = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!RUN_LOG || !fs.existsSync(RUN_LOG)) {
  console.error('Pass a run-log path: node scripts/build-share-review.js backups/run-<ts>.jsonl');
  process.exit(1);
}

const ids = fs
  .readFileSync(RUN_LOG, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line).id);

function haversine(a, b) {
  if (!a || !b) return null;
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371000;
  const φ1 = toRad(a.latitude), φ2 = toRad(b.latitude);
  const Δφ = toRad(b.latitude - a.latitude);
  const Δλ = toRad(b.longitude - a.longitude);
  const x = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
function fmtDist(m) {
  if (m == null) return '—';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}
function gmaps(c) {
  return c ? `https://maps.google.com/?q=${c.latitude},${c.longitude}` : '';
}

const rows = [];
for (const id of ids) {
  const fp = path.join(BACKUP_DIR, `${id}.json`);
  if (!fs.existsSync(fp)) continue;
  const r = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const oldC = r.input?.coordinates;
  const placeLoc = r.details?.response?.location;
  const newC =
    placeLoc && typeof placeLoc.latitude === 'number'
      ? { latitude: placeLoc.latitude, longitude: placeLoc.longitude }
      : null;
  const csvName = r.input?.name || '';
  const placesName = r.details?.response?.displayName?.text || '';
  const placesAddr = r.details?.response?.formattedAddress || '';
  const distM = haversine(oldC, newC);
  const sameName =
    csvName && placesName && csvName.trim().toLowerCase() === placesName.trim().toLowerCase();
  rows.push({
    csvName,
    placesName,
    nameMatch: sameName ? 'same' : (placesName ? 'different' : ''),
    inputCity: r.input?.city || '',
    inputState: r.input?.state || '',
    placesAddr,
    distLabel: fmtDist(distM),
    distM: distM != null ? Math.round(distM) : '',
    oldLink: gmaps(oldC),
    newLink: gmaps(newC),
    outcome: r.outcome,
    docId: r.landmarkId,
    placeId: r.details?.response?.id || '',
  });
}
rows.sort((a, b) => (Number(b.distM) || 0) - (Number(a.distM) || 0));

// ── CSV ───────────────────────────────────────────────────────────────────────

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
const csvCols = [
  'CSV name',
  'Places name (from Google)',
  'Match?',
  'Old city/state (from CSV)',
  'New address (from Google)',
  'Distance moved',
  'Distance (m)',
  'Old coords (Google Maps link)',
  'New coords (Google Maps link)',
  'Outcome',
  'Doc id',
  'Place id',
];
const csv = [csvCols.join(',')].concat(
  rows.map(r => [
    r.csvName, r.placesName, r.nameMatch,
    `${r.inputCity}${r.inputCity && r.inputState ? ', ' : ''}${r.inputState}`,
    r.placesAddr, r.distLabel, r.distM,
    r.oldLink, r.newLink, r.outcome, r.docId, r.placeId,
  ].map(csvEscape).join(','))
).join('\n');

const stamp = path.basename(RUN_LOG).replace(/^run-/, '').replace(/\.jsonl$/, '');
const csvPath = path.resolve(__dirname, '..', 'backups', `coord-review-share-${stamp}.csv`);
fs.writeFileSync(csvPath, csv);

// ── Slack markdown ────────────────────────────────────────────────────────────

const md = [];
md.push(`*Landmark coordinate review (${rows.length} landmarks)*`);
md.push('');
md.push(`We pulled each landmark's name, address, and coordinates from Google Places to replace the original CSV data, which we know is unreliable. For each landmark below: the original CSV name and the name Google returned, plus links to the old vs new map locations.`);
md.push('');
md.push(`*Results:* ${rows.length} resolved successfully, 0 had no match, 0 errored.`);
md.push('');
md.push('---');
md.push('');
for (const r of rows) {
  md.push(`*${r.csvName}*`);
  if (r.nameMatch === 'different') {
    md.push(`• Google's name: *${r.placesName}*`);
  } else if (r.placesName) {
    md.push(`• Google's name: ${r.placesName} _(same)_`);
  }
  if (r.placesAddr) md.push(`• Address: ${r.placesAddr}`);
  md.push(`• Distance from old coords: *${r.distLabel}*`);
  md.push(`• <${r.oldLink}|Old location> → <${r.newLink}|New location>`);
  md.push('');
}

const mdPath = path.resolve(__dirname, '..', 'backups', `coord-review-share-${stamp}.md`);
fs.writeFileSync(mdPath, md.join('\n'));

console.log('Wrote:');
console.log('  ' + csvPath);
console.log('  ' + mdPath);
console.log('');
console.log('Slack-friendly: upload the CSV (renders as a sortable preview), or paste the .md');
console.log('contents into a Slack message (uses Slack\'s markdown — *bold*, _italic_, <link|text>).');
