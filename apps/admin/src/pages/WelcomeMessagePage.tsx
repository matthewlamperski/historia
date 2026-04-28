import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import {
  getWelcomeMessage,
  saveWelcomeMessage,
  verifySenderExists,
} from '../services/welcomeMessageService';
import { WelcomeMessageSchema } from '@historia/shared';

export default function WelcomeMessagePage() {
  // Per spec §6.8: deliberately tiny editor. One form, one save button.
  // No drag handles, no rich text, no preview. The textarea itself with
  // `white-space: pre-wrap` IS the preview.
  const [senderId, setSenderId] = useState('');
  const [text, setText] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifyResult, setVerifyResult] = useState<
    { kind: 'ok'; name?: string } | { kind: 'missing' } | null
  >(null);
  const [verifying, setVerifying] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getWelcomeMessage();
        if (cancelled) return;
        if (cfg) {
          setSenderId(cfg.senderId);
          setText(cfg.text);
          setEnabled(cfg.enabled);
          if (cfg.updatedAt && typeof cfg.updatedAt.toDate === 'function') {
            setUpdatedAt(cfg.updatedAt.toDate());
          }
        } else {
          // Defensive: doc should be seeded but allow creation.
          setEnabled(true);
        }
      } catch (e) {
        if (!cancelled)
          setToast({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Failed to load',
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function verify() {
    if (!senderId.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const r = await verifySenderExists(senderId);
      setVerifyResult(r.exists ? { kind: 'ok', name: r.name } : { kind: 'missing' });
    } finally {
      setVerifying(false);
    }
  }

  async function save() {
    // Validate using shared zod schema. Note: text is NOT trimmed here —
    // per spec the Cloud Function preserves whitespace verbatim.
    const parsed = WelcomeMessageSchema.safeParse({ senderId, text, enabled });
    if (!parsed.success) {
      setToast({
        kind: 'error',
        message: parsed.error.issues.map((i) => i.message).join(' · '),
      });
      return;
    }

    setSaving(true);
    try {
      await saveWelcomeMessage({ senderId: parsed.data.senderId, text, enabled });
      // Refresh updatedAt by re-reading.
      const cfg = await getWelcomeMessage();
      if (cfg?.updatedAt && typeof cfg.updatedAt.toDate === 'function') {
        setUpdatedAt(cfg.updatedAt.toDate());
      }
      setToast({
        kind: 'success',
        message: 'Saved. New signups will receive the updated message.',
      });
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  const canSave = senderId.trim().length > 0 && text.trim().length > 0 && !saving;

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <div className="mx-auto max-w-2xl">
        <PageHeader
          title="Welcome Message"
          subtitle="Sent automatically as a direct message from the founder's account to every new user immediately after signup."
        />

        <section className="space-y-6 rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
          {/* Sender UID */}
          <div>
            <label className="block text-sm font-medium text-primary-900">
              Sender UID
            </label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <input
                value={senderId}
                onChange={(e) => {
                  setSenderId(e.target.value);
                  setVerifyResult(null);
                }}
                className="input-admin font-mono"
                placeholder="Firebase Auth UID"
              />
              <button
                type="button"
                onClick={verify}
                disabled={!senderId.trim() || verifying}
                className="btn-secondary-admin shrink-0"
              >
                {verifying ? 'Checking…' : 'Verify UID'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-600">
              Firebase Auth UID of the account that appears as the sender (typically
              the founder's account).
            </p>
            {verifyResult?.kind === 'ok' && (
              <p className="mt-2 text-xs font-medium text-success-700">
                ✓ User exists{verifyResult.name ? ` — ${verifyResult.name}` : ''}.
              </p>
            )}
            {verifyResult?.kind === 'missing' && (
              <p className="mt-2 text-xs font-medium text-error-700">
                ⚠️ No `users/{'{'}senderId{'}'}` doc found. The Cloud Function will
                refuse to send.
              </p>
            )}
          </div>

          {/* Enabled toggle */}
          <div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-primary-300 text-primary-600 focus:ring-primary-500"
              />
              <span>
                <span className="block text-sm font-medium text-primary-900">Enabled</span>
                <span className="block text-xs text-gray-600">
                  When off, new users will not receive the welcome message. The text
                  below is preserved.
                </span>
              </span>
            </label>
          </div>

          {/* Message body */}
          <div>
            <label className="block text-sm font-medium text-primary-900">Message</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="input-admin mt-1"
              style={{ whiteSpace: 'pre-wrap' }}
              placeholder="Write the welcome message here. Whitespace and line breaks are preserved exactly."
            />
            <p className="mt-1 text-xs text-gray-600">
              Whitespace, blank lines, and line breaks are preserved verbatim by the
              Cloud Function — admins can format with paragraph breaks and the
              recipient sees them as written.
            </p>
          </div>

          {/* Last updated */}
          <p className="text-xs text-gray-500">
            Last updated: {updatedAt ? updatedAt.toLocaleString() : '—'}
          </p>

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="btn-primary-admin w-full disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </section>
      </div>
    </>
  );
}
