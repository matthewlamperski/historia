#!/usr/bin/env node
/**
 * Reads every per-landmark backup in backups/places/ and emits a
 * coordinate-review file showing old vs new coords, distance, and links
 * for visual verification.
 *
 * Outputs:
 *   backups/coord-review-<runTs>.md
 *
 * Pass a run-log file as argv[2] to scope to just that batch:
 *   node scripts/review-coords.js backups/run-2026-05-01T00-58-30-938Z.jsonl
 */

const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups', 'places');
const RUN_LOG = process.argv[2]
  ? path.resolve(process.argv[2])
  : null;

function haversineMeters(a, b) {
  if (!a || !b) return null;
  const toRad = d => (d * Math.PI) / 180;
  const R = 6371000;
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
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

function gmapsLink(c) {
  if (!c) return '';
  return `https://maps.google.com/?q=${c.latitude},${c.longitude}`;
}

let ids = null;
if (RUN_LOG) {
  ids = fs
    .readFileSync(RUN_LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line).id);
}

const files = fs.readdirSync(BACKUP_DIR)
  .filter(f => f.endsWith('.json'))
  .filter(f => !ids || ids.includes(f.replace(/\.json$/, '')));

const rows = files.map(f => {
  const r = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf8'));
  const oldC = r.input?.coordinates;
  const placeLoc = r.details?.response?.location;
  const newC = placeLoc && typeof placeLoc.latitude === 'number'
    ? { latitude: placeLoc.latitude, longitude: placeLoc.longitude }
    : null;
  const placeName = r.details?.response?.displayName?.text;
  const formattedAddr = r.details?.response?.formattedAddress;
  const placeId = r.details?.response?.id;
  const dist = haversineMeters(oldC, newC);
  return {
    id: r.landmarkId,
    inputName: r.input?.name,
    placeName,
    address: formattedAddr,
    state: r.input?.state,
    city: r.input?.city,
    oldC,
    newC,
    distM: dist,
    placeId,
    outcome: r.outcome,
  };
});

rows.sort((a, b) => (b.distM ?? 0) - (a.distM ?? 0));

const out = [];
out.push(`# Landmark coordinate review`);
out.push(``);
out.push(`Generated: ${new Date().toISOString()}`);
out.push(`Backups: \`${BACKUP_DIR}\``);
if (RUN_LOG) out.push(`Scoped to run: \`${path.basename(RUN_LOG)}\``);
out.push(`Records: ${rows.length}`);
out.push(``);
out.push(`Sorted by distance from old → new (largest deltas first).`);
out.push(``);

for (const r of rows) {
  out.push(`## ${r.inputName}`);
  out.push(``);
  out.push(`- **Doc id**: \`${r.id}\``);
  out.push(`- **Outcome**: ${r.outcome}`);
  if (r.placeName) {
    const samename = r.placeName === r.inputName;
    out.push(`- **CSV name**:    ${r.inputName}`);
    out.push(`- **Places name**: ${r.placeName}${samename ? '  *(same)*' : ''}`);
  }
  if (r.address) out.push(`- **Address (Places)**: ${r.address}`);
  if (r.city || r.state) {
    out.push(`- **Input city/state**: ${[r.city, r.state].filter(Boolean).join(', ')}`);
  }
  out.push(`- **Distance moved**: **${fmtDist(r.distM)}**`);
  if (r.oldC) {
    out.push(`- **Old coords**: ${r.oldC.latitude.toFixed(6)}, ${r.oldC.longitude.toFixed(6)}  → [Google Maps](${gmapsLink(r.oldC)})`);
  }
  if (r.newC) {
    out.push(`- **New coords**: ${r.newC.latitude.toFixed(6)}, ${r.newC.longitude.toFixed(6)}  → [Google Maps](${gmapsLink(r.newC)})`);
  }
  if (r.placeId) {
    out.push(`- **Places id**: \`${r.placeId}\``);
  }
  out.push(``);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outPath = path.resolve(__dirname, '..', 'backups', `coord-review-${stamp}.md`);
fs.writeFileSync(outPath, out.join('\n'));

console.log(`Wrote ${rows.length} rows to:`);
console.log(`  ${outPath}`);
console.log('');
console.log('Distance summary:');
const buckets = {
  '0-10m': 0, '10-50m': 0, '50-100m': 0, '100m-1km': 0, '1-10km': 0, '>10km': 0, 'no match': 0,
};
for (const r of rows) {
  if (r.distM == null) buckets['no match']++;
  else if (r.distM < 10) buckets['0-10m']++;
  else if (r.distM < 50) buckets['10-50m']++;
  else if (r.distM < 100) buckets['50-100m']++;
  else if (r.distM < 1000) buckets['100m-1km']++;
  else if (r.distM < 10000) buckets['1-10km']++;
  else buckets['>10km']++;
}
for (const [k, v] of Object.entries(buckets)) {
  console.log(`  ${k.padEnd(10)} ${v}`);
}
