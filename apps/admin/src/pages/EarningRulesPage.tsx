import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import { getPointsConfig, savePointsConfig } from '../services/pointsConfigService';
import type { EarningRules, PointsConfig } from '@historia/shared';

const FIELDS: Array<{
  key: keyof EarningRules;
  label: string;
  hint: string;
}> = [
  { key: 'postBasePoints', label: 'Post base points', hint: 'Awarded for creating a post.' },
  {
    key: 'postPerMediaPoints',
    label: 'Post per-media points',
    hint: 'Additional pts per attached image or video.',
  },
  {
    key: 'dailyPostCap',
    label: 'Daily post cap',
    hint: 'Max posts per UTC day that earn points.',
  },
  {
    key: 'referralPoints',
    label: 'Referral points',
    hint: 'Awarded to BOTH referrer and referred user.',
  },
  {
    key: 'siteVisitPoints',
    label: 'Site visit points',
    hint: 'Awarded on a verified landmark check-in.',
  },
];

export default function EarningRulesPage() {
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [draft, setDraft] = useState<EarningRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getPointsConfig();
        if (cancelled) return;
        setConfig(cfg);
        if (cfg) setDraft({ ...cfg.earning });
      } catch (e) {
        if (!cancelled)
          setToast({
            kind: 'error',
            message: e instanceof Error ? e.message : 'Load failed',
          });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!config || !draft) return;
    setSaving(true);
    try {
      const res = await savePointsConfig({ levels: config.levels, earning: draft });
      setConfig({ ...config, earning: draft, version: res.version });
      setToast({
        kind: 'success',
        message: `Saved. Version bumped to ${res.version}.`,
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

  if (!config || !draft) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-error-800">
        config/points missing. Run the seed script first.
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title="Earning Rules"
        subtitle={`Drives every point award in the mobile app. v${config.version}.`}
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary-admin disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save & bump version'}
          </button>
        }
      />

      <section className="rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
        <div className="space-y-5">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm font-medium text-primary-900">{f.label}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={draft[f.key]}
                onChange={(e) =>
                  setDraft({ ...draft, [f.key]: Math.max(0, Number(e.target.value)) })
                }
                className="input-admin mt-1 max-w-xs"
              />
              <p className="mt-1 text-xs text-gray-600">{f.hint}</p>
            </label>
          ))}
        </div>
      </section>

      <p className="mt-4 text-xs text-gray-500">
        Mobile app refetches `config/points` on cold start. Force-quit and relaunch
        to verify changes.
      </p>
    </>
  );
}
