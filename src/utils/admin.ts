/**
 * Central list of Firebase Auth UIDs that have in-app admin powers
 * (edit / delete landmarks, etc). Keep in sync with any server-side
 * Firestore rules that enforce the same privilege.
 */
export const ADMIN_UIDS = new Set<string>([
  'MsgaoumnlwSbZZYgHFGMRKZPlCs2',
  'HzIGqkeYhVbuiZogz34nPpIVMKW2',
  '0gYuyq2FvyWNNZYoAhCiMI2jODY2',
]);

export const isAdminUid = (uid?: string | null): boolean =>
  Boolean(uid && ADMIN_UIDS.has(uid));

// Subset of admins who curate landmark data manually and should bypass
// the Google Places enrichment flow entirely — both the auto-fetch on
// marker tap and the `populated` flag write on form save.
export const NO_ENRICHMENT_UIDS = new Set<string>([
  '0gYuyq2FvyWNNZYoAhCiMI2jODY2',
  'HzIGqkeYhVbuiZogz34nPpIVMKW2',
]);

export const isNoEnrichmentUid = (uid?: string | null): boolean =>
  Boolean(uid && NO_ENRICHMENT_UIDS.has(uid));
