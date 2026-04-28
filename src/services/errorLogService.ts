import firestore from '@react-native-firebase/firestore';
import { Platform } from 'react-native';

const COLLECTION = 'clientErrors';
const MAX_DETAIL_LEN = 4000;

export type ClientErrorContext = Record<string, string | number | boolean | null | undefined>;

interface LogClientErrorArgs {
  /** Short stable identifier for the error site, e.g. 'avatar.upload.invalidUrl'. */
  code: string;
  /** Human-readable message — what went wrong. */
  message: string;
  /** Optional original Error instance — its name + stack are captured. */
  cause?: unknown;
  /** Authenticated user ID (if any) — written to the doc for filtering. */
  userId?: string | null;
  /** Free-form structured context (small, scalar values only). */
  context?: ClientErrorContext;
}

function summarizeCause(cause: unknown): { name: string; message: string; stack?: string } {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: String(cause.message ?? '').slice(0, 500),
      stack: cause.stack ? String(cause.stack).slice(0, 2000) : undefined,
    };
  }
  if (cause == null) return { name: 'NoCause', message: '' };
  return { name: 'NonError', message: String(cause).slice(0, 500) };
}

function clamp(s: string, max = MAX_DETAIL_LEN): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Best-effort write of a client-side error to the `clientErrors` Firestore
 * collection. Fire-and-forget — never throws, so callers can use this in a
 * `.catch` without further wrapping.
 *
 * Document shape:
 *   { code, message, userId, platform, osVersion, cause: { name, message, stack? },
 *     context, createdAt }
 *
 * Use sparingly — this is for diagnosing real production failures, not chatty
 * debug logging.
 */
export async function logClientError(args: LogClientErrorArgs): Promise<void> {
  try {
    const cause = summarizeCause(args.cause);
    await firestore().collection(COLLECTION).add({
      code: clamp(args.code, 200),
      message: clamp(args.message, 1000),
      userId: args.userId ?? null,
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      cause,
      context: args.context ? sanitizeContext(args.context) : null,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    // Never throw from a logger. Local console only.
    console.warn('[errorLogService] failed to log client error', err);
  }
}

function sanitizeContext(ctx: ClientErrorContext): ClientErrorContext {
  const out: ClientErrorContext = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (v === null || v === undefined) {
      out[k] = v ?? null;
      continue;
    }
    if (typeof v === 'string') {
      out[k] = clamp(v, 500);
      continue;
    }
    if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
      continue;
    }
    out[k] = String(v).slice(0, 500);
  }
  return out;
}
