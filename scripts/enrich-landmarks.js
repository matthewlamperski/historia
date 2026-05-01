#!/usr/bin/env node
/**
 * scripts/enrich-landmarks.js
 *
 * Batch enrichment for the entire `landmarks` Firestore collection using the
 * Google Places API (New, v1). Mirrors the runtime enricher in
 * src/services/placesEnrichmentService.ts, but in a single offline pass.
 *
 * Per landmark (skipped when `populated === true`):
 *   1. Search Text (IDs Only field mask) — biased to the landmark's coords.
 *      → free SKU.
 *   2. Place Details with a maximal field mask spanning Pro/Enterprise/Atmosphere.
 *      → Enterprise+Atmosphere SKU ($25/1000), since we ask for editorialSummary,
 *        rating, userRatingCount, reviews.
 *   3. Save the COMPLETE Places response to disk:
 *        backups/places/<landmarkId>.json   (full per-landmark dump)
 *        backups/run-<startTs>.jsonl        (one summary line per landmark)
 *   4. Update the Firestore doc with the same shape the runtime enricher writes,
 *      plus a few extras (placeId, placeTypes, enrichedAt). Always sets
 *      `populated: true` (even on no-match, to match runtime behaviour).
 *
 * Coordinate writes mirror existing populated docs: we set `coordinates`,
 * `_geoloc`, flat `lat`/`lng`, and flat `latitude`/`longitude` for safety.
 *
 * Errors (HTTP/network) do NOT mark the doc populated — leaves it for retry.
 *
 * Flags:
 *   --confirm           required before real writes (sanity gate)
 *   --dry-run           skip Firestore writes (still writes local JSON backups)
 *   --no-places         skip Places calls entirely (smoke-test the loop)
 *   --limit=N           process at most N landmarks
 *   --start-from=ID     resume from this landmark id (alphabetical order)
 *   --concurrency=N     parallel Places calls (default 5)
 *   --skip-existing-backup   skip landmarks that already have a backup file
 *
 * Usage:
 *   node scripts/enrich-landmarks.js --dry-run --limit=3
 *   node scripts/enrich-landmarks.js --confirm
 *   node scripts/enrich-landmarks.js --confirm --start-from=museum_8400200090
 */

const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// ── Configuration ─────────────────────────────────────────────────────────────

const SERVICE_ACCOUNT_PATH = path.resolve(
  __dirname,
  '../../landmarks/historia-application-firebase-adminsdk-fbsvc-5232516847.json'
);

// Mirrors src/constants/googlePlaces.ts. Restricted to mobile bundle ids — but
// this script runs from a developer machine (no bundle id), so the unrestricted
// server-side variant is preferred. Falls back to env var if set.
const GOOGLE_PLACES_API_KEY =
  process.env.GOOGLE_PLACES_API_KEY ||
  'AIzaSyBeC7TakaBndJJI45JFa0dQR27sSWWbEMg';

const PLACES_BASE = 'https://places.googleapis.com/v1';

// Maximal field mask. Highest tier requested = Enterprise + Atmosphere ($25/1000).
// Adding more fields within the same tier is free, so we grab everything useful.
const DETAIL_FIELD_MASK = [
  // Pro fields
  'id',
  'displayName',
  'formattedAddress',
  'shortFormattedAddress',
  'addressComponents',
  'adrFormatAddress',
  'location',
  'viewport',
  'plusCode',
  'googleMapsUri',
  'iconMaskBaseUri',
  'iconBackgroundColor',
  'types',
  'primaryType',
  'primaryTypeDisplayName',
  'businessStatus',
  'utcOffsetMinutes',
  'photos',
  // Enterprise fields
  'websiteUri',
  'nationalPhoneNumber',
  'internationalPhoneNumber',
  'regularOpeningHours',
  'currentOpeningHours',
  'accessibilityOptions',
  // Atmosphere fields (already paying for tier — grab them)
  'rating',
  'userRatingCount',
  'priceLevel',
  'editorialSummary',
  'reviews',
  'parkingOptions',
  'paymentOptions',
  'outdoorSeating',
  'reservable',
  'restroom',
  'goodForChildren',
  'goodForGroups',
  'allowsDogs',
].join(',');

const BACKUP_DIR = path.resolve(__dirname, '..', 'backups', 'places');
const RUN_LOG_DIR = path.resolve(__dirname, '..', 'backups');

// ── CLI flags ─────────────────────────────────────────────────────────────────

const flags = {
  confirm: false,
  dryRun: false,
  noPlaces: false,
  limit: Infinity,
  startFrom: null,
  concurrency: 5,
  skipExistingBackup: false,
};

for (const arg of process.argv.slice(2)) {
  if (arg === '--confirm') flags.confirm = true;
  else if (arg === '--dry-run') flags.dryRun = true;
  else if (arg === '--no-places') flags.noPlaces = true;
  else if (arg === '--skip-existing-backup') flags.skipExistingBackup = true;
  else if (arg.startsWith('--limit=')) flags.limit = parseInt(arg.split('=')[1], 10);
  else if (arg.startsWith('--start-from=')) flags.startFrom = arg.split('=')[1];
  else if (arg.startsWith('--concurrency=')) flags.concurrency = parseInt(arg.split('=')[1], 10);
  else {
    console.error(`Unknown flag: ${arg}`);
    process.exit(1);
  }
}

if (!flags.confirm && !flags.dryRun && !flags.noPlaces) {
  console.error(
    '\nRefusing to run without --confirm.\n' +
    'Use --dry-run for a no-write preview, or --confirm to enable Firestore writes.\n'
  );
  process.exit(1);
}

// ── Firebase admin ────────────────────────────────────────────────────────────

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  console.error(`Service account key not found at ${SERVICE_ACCOUNT_PATH}`);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)) });
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readCoords(d) {
  // Read coordinates from any of the 4 schemas the codebase supports.
  const lat =
    d?.coordinates?.latitude ??
    d?.latitude ??
    d?._geoloc?.lat ??
    d?.lat;
  const lng =
    d?.coordinates?.longitude ??
    d?.longitude ??
    d?._geoloc?.lng ??
    d?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { latitude: lat, longitude: lng };
}

function photoUrl(photoName, maxWidthPx = 900) {
  return `${PLACES_BASE}/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${GOOGLE_PLACES_API_KEY}`;
}

async function searchForPlaceId({ name, city, state, lat, lng }) {
  const textQuery = [name, city, state].filter(Boolean).join(', ');
  const body = {
    textQuery,
    locationBias: {
      circle: { center: { latitude: lat, longitude: lng }, radius: 3000 },
    },
    maxResultCount: 1,
  };
  const res = await fetch(`${PLACES_BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': 'places.id',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return {
    request: { textQuery, body },
    status: res.status,
    ok: res.ok,
    response: json ?? text,
    placeId: json?.places?.[0]?.id ?? null,
  };
}

async function fetchPlaceDetails(placeId) {
  const res = await fetch(`${PLACES_BASE}/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': DETAIL_FIELD_MASK,
    },
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return {
    request: { placeId, fieldMask: DETAIL_FIELD_MASK },
    status: res.status,
    ok: res.ok,
    response: json ?? text,
  };
}

function buildFirestoreUpdate(landmark, details) {
  // Mirrors src/services/placesEnrichmentService.ts:enrichAndPersist().
  // Always sets populated:true. Only overwrites a few selected fields.
  const update = {
    populated: true,
    enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (!details) return update;

  // Coordinates: write to ALL four schemas existing populated docs use.
  const loc = details.location;
  if (loc && typeof loc.latitude === 'number' && typeof loc.longitude === 'number') {
    update.coordinates = { latitude: loc.latitude, longitude: loc.longitude };
    update._geoloc = { lat: loc.latitude, lng: loc.longitude };
    update.latitude = loc.latitude;
    update.longitude = loc.longitude;
    update.lat = loc.latitude;
    update.lng = loc.longitude;
  }

  const photos = (details.photos ?? []).slice(0, 6).map(p => photoUrl(p.name));
  if (photos.length > 0) update.images = photos;

  if (details.nationalPhoneNumber) update.phone = details.nationalPhoneNumber;
  if (details.websiteUri && !landmark.website) update.website = details.websiteUri;
  if (
    details.formattedAddress &&
    (!landmark.address || landmark.address.length < 10)
  ) {
    update.address = details.formattedAddress;
  }
  if (details.googleMapsUri) update.googleMapsUri = details.googleMapsUri;
  if (typeof details.rating === 'number') update.rating = details.rating;
  if (typeof details.userRatingCount === 'number') update.ratingCount = details.userRatingCount;
  if (details.regularOpeningHours?.weekdayDescriptions?.length) {
    update.openingHours = details.regularOpeningHours.weekdayDescriptions;
  }
  if (typeof details.accessibilityOptions?.wheelchairAccessibleEntrance === 'boolean') {
    update.wheelchair = details.accessibilityOptions.wheelchairAccessibleEntrance;
  }
  if (details.editorialSummary?.text) {
    update.editorialSummary = details.editorialSummary.text;
  }
  // Extras (not in runtime enricher) — useful future-proofing.
  if (details.id) update.placeId = details.id;
  if (Array.isArray(details.types) && details.types.length) update.placeTypes = details.types;

  return update;
}

// ── Main ──────────────────────────────────────────────────────────────────────

(async () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Historia landmark enrichment — batch run');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode:          ${flags.dryRun ? 'DRY RUN (no Firestore writes)' :
                                flags.noPlaces ? 'NO-PLACES (Firestore-only test)' :
                                'LIVE (Places + Firestore writes)'}`);
  console.log(`Concurrency:   ${flags.concurrency}`);
  if (flags.limit !== Infinity) console.log(`Limit:         ${flags.limit}`);
  if (flags.startFrom) console.log(`Start from:    ${flags.startFrom}`);
  console.log('');

  ensureDir(BACKUP_DIR);
  ensureDir(RUN_LOG_DIR);
  const startTs = new Date().toISOString().replace(/[:.]/g, '-');
  const runLogPath = path.join(RUN_LOG_DIR, `run-${startTs}.jsonl`);
  const runLog = fs.createWriteStream(runLogPath, { flags: 'a' });

  console.log('Loading landmarks from Firestore…');
  const snap = await db.collection('landmarks').get();
  console.log(`  ${snap.size} total documents`);

  // Filter + sort.
  const candidates = [];
  let alreadyEnriched = 0;
  let noCoords = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (data.populated === true) { alreadyEnriched++; return; }
    const coords = readCoords(data);
    if (!coords) { noCoords++; return; }
    candidates.push({ id: doc.id, data, coords });
  });
  candidates.sort((a, b) => a.id.localeCompare(b.id));

  console.log(`  ${alreadyEnriched} already enriched (skipping)`);
  console.log(`  ${noCoords} have no coordinates (skipping — search needs location bias)`);
  console.log(`  ${candidates.length} candidates to enrich`);

  let queue = candidates;
  if (flags.startFrom) {
    const idx = queue.findIndex(c => c.id === flags.startFrom);
    if (idx < 0) {
      console.error(`--start-from id "${flags.startFrom}" not found in candidates.`);
      process.exit(1);
    }
    queue = queue.slice(idx);
    console.log(`  resuming from ${flags.startFrom} → ${queue.length} remaining`);
  }
  if (queue.length > flags.limit) queue = queue.slice(0, flags.limit);

  console.log(`\nWill process ${queue.length} landmark(s).`);
  console.log(`Backups → ${BACKUP_DIR}/`);
  console.log(`Run log → ${runLogPath}`);
  console.log('');

  let processed = 0;
  let succeeded = 0;
  let noMatch = 0;
  let errored = 0;
  let skippedBackup = 0;

  async function processOne(entry) {
    const { id, data, coords } = entry;
    const backupPath = path.join(BACKUP_DIR, `${id}.json`);

    if (flags.skipExistingBackup && fs.existsSync(backupPath)) {
      skippedBackup++;
      processed++;
      return;
    }

    const record = {
      landmarkId: id,
      fetchedAt: new Date().toISOString(),
      input: {
        name: data.name,
        city: data.city,
        state: data.state,
        coordinates: coords,
        textQuery: [data.name, data.city, data.state].filter(Boolean).join(', '),
      },
      search: null,
      details: null,
      firestoreUpdate: null,
      outcome: 'pending',
    };

    try {
      if (flags.noPlaces) {
        record.outcome = 'skipped_no_places';
      } else {
        // 1. Search
        const search = await searchForPlaceId({
          name: data.name,
          city: data.city,
          state: data.state,
          lat: coords.latitude,
          lng: coords.longitude,
        });
        record.search = search;

        if (!search.ok) {
          record.outcome = 'search_error';
          errored++;
        } else if (!search.placeId) {
          record.outcome = 'no_match';
          noMatch++;
          // Mirror runtime: still mark populated so we don't re-query forever
          record.firestoreUpdate = { populated: true, enrichedAt: '<serverTimestamp>' };
          if (!flags.dryRun) {
            await db.collection('landmarks').doc(id).update({
              populated: true,
              enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        } else {
          // 2. Details
          const details = await fetchPlaceDetails(search.placeId);
          record.details = details;
          if (!details.ok) {
            record.outcome = 'details_error';
            errored++;
          } else {
            const update = buildFirestoreUpdate(data, details.response);
            record.firestoreUpdate = { ...update, enrichedAt: '<serverTimestamp>' };
            record.outcome = 'success';
            succeeded++;
            if (!flags.dryRun) {
              await db.collection('landmarks').doc(id).update(update);
            }
          }
        }
      }
    } catch (err) {
      record.outcome = 'exception';
      record.error = String(err?.stack || err);
      errored++;
    }

    // Persist per-landmark backup + run-log line.
    fs.writeFileSync(backupPath, JSON.stringify(record, null, 2));
    runLog.write(JSON.stringify({
      id,
      outcome: record.outcome,
      placeId: record.search?.placeId ?? null,
    }) + '\n');

    processed++;
    if (processed % 25 === 0 || processed === queue.length) {
      const pct = ((processed / queue.length) * 100).toFixed(1);
      console.log(
        `  [${processed}/${queue.length}] ${pct}%  ` +
        `ok=${succeeded} no_match=${noMatch} err=${errored}` +
        (skippedBackup ? ` skipped=${skippedBackup}` : '')
      );
    }
  }

  // Run with bounded concurrency.
  const workers = Array.from({ length: flags.concurrency }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) return;
      await processOne(next);
    }
  });
  await Promise.all(workers);

  runLog.end();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Processed:     ${processed}`);
  console.log(`  succeeded:   ${succeeded}`);
  console.log(`  no match:    ${noMatch}`);
  console.log(`  errored:     ${errored}`);
  if (skippedBackup) console.log(`  skipped (backup exists): ${skippedBackup}`);
  console.log(`Run log:       ${runLogPath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  process.exit(errored > 0 ? 1 : 0);
})().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
