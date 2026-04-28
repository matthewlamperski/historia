import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import { getPointsConfig, savePointsConfig } from '../services/pointsConfigService';
import { listRewardTiers, type RewardTierDoc } from '../services/rewardTiersService';
import { uploadLevelCoin } from '../services/storageService';
import type { LevelDef, PointsConfig, Reward } from '@historia/shared';

export default function LevelEditPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [draft, setDraft] = useState<LevelDef | null>(null);
  const [tiers, setTiers] = useState<RewardTierDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfg, t] = await Promise.all([getPointsConfig(), listRewardTiers()]);
        if (cancelled) return;
        setConfig(cfg);
        setTiers(t);
        if (cfg) {
          const found = cfg.levels.find((l) => l.id === levelId);
          if (found) setDraft(structuredClone(found));
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
  }, [levelId]);

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
        Level not found.
      </div>
    );
  }

  const sortedLevels = [...config.levels].sort((a, b) => a.order - b.order);
  const indexInOrder = sortedLevels.findIndex((l) => l.id === draft.id);
  const isLast = indexInOrder === sortedLevels.length - 1;
  const prevLevel = indexInOrder > 0 ? sortedLevels[indexInOrder - 1] : null;
  const nextLevel = indexInOrder < sortedLevels.length - 1 ? sortedLevels[indexInOrder + 1] : null;

  function update<K extends keyof LevelDef>(key: K, value: LevelDef[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function updateReward(idx: number, patch: Partial<Reward>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const rewards = prev.rewards.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return { ...prev, rewards };
    });
  }

  function addReward() {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            rewards: [
              ...prev.rewards,
              { id: `reward_${Date.now()}`, title: '', description: '' },
            ],
          }
        : prev
    );
  }

  function removeReward(idx: number) {
    setDraft((prev) =>
      prev ? { ...prev, rewards: prev.rewards.filter((_, i) => i !== idx) } : prev
    );
  }

  async function onUploadCoin(file: File) {
    if (!draft) return;
    setUploading(true);
    try {
      const { url, path } = await uploadLevelCoin(draft.id, file);
      update('imageUrl', url);
      update('imageStoragePath', path);
      setToast({ kind: 'success', message: 'Coin uploaded.' });
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!config || !draft) return;
    setSaving(true);
    try {
      const next = config.levels.map((l) => (l.id === draft.id ? draft : l));
      const res = await savePointsConfig({ levels: next, earning: config.earning });
      setConfig({ ...config, levels: next, version: res.version });
      setToast({
        kind: 'success',
        message: `Saved. Mobile app will refetch on next cold start (v${res.version}).`,
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

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title={draft.name || 'Untitled level'}
        backHref="/levels"
        backLabel="Back to levels"
        subtitle={`Level id: ${draft.id} · order ${draft.order}`}
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary-admin disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save level'}
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Identity">
            <Field label="Display name">
              <input
                value={draft.name}
                onChange={(e) => update('name', e.target.value)}
                className="input-admin"
              />
            </Field>
            <Field
              label="Color"
              help="Hex code for accents and the Levels screen badge."
            >
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={draft.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="h-10 w-14 rounded-lg border border-primary-100"
                />
                <input
                  value={draft.color}
                  onChange={(e) => update('color', e.target.value)}
                  className="input-admin font-mono"
                />
              </div>
            </Field>
            <Field
              label="FontAwesome 6 icon name"
              help={
                <>
                  Decorative fallback. Browse names at{' '}
                  <a
                    href="https://fontawesome.com/v6/search?o=r&m=free"
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    fontawesome.com
                  </a>
                  .
                </>
              }
            >
              <input
                value={draft.icon}
                onChange={(e) => update('icon', e.target.value)}
                className="input-admin font-mono"
                placeholder="seedling"
              />
            </Field>
          </Card>

          <Card title="Point range">
            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Min points"
                help={
                  prevLevel
                    ? `Must equal ${(prevLevel.maxPoints ?? 0) + 1} (one above ${prevLevel.name}'s max).`
                    : 'First level — usually 0.'
                }
              >
                <input
                  type="number"
                  min={0}
                  value={draft.minPoints}
                  onChange={(e) => update('minPoints', Number(e.target.value))}
                  className="input-admin"
                />
              </Field>
              <Field
                label={isLast ? 'Max points (highest level — must be null)' : 'Max points'}
                help={
                  isLast
                    ? 'Highest-order level has no upper bound.'
                    : nextLevel
                    ? `Next level "${nextLevel.name}" starts at ${nextLevel.minPoints}.`
                    : undefined
                }
              >
                <input
                  type="number"
                  min={0}
                  value={draft.maxPoints ?? ''}
                  disabled={isLast}
                  onChange={(e) => {
                    const v = e.target.value;
                    update('maxPoints', v === '' ? null : Number(v));
                  }}
                  className="input-admin disabled:bg-primary-50 disabled:text-gray-500"
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Rewards"
            subtitle="Display only — shown to users on the Levels screen. Optionally link each to a Reward Tier (the issuance engine that emails Shopify discount codes)."
          >
            <div className="space-y-4">
              {draft.rewards.map((rw, idx) => {
                const linkedTier = rw.rewardTierId
                  ? tiers.find((t) => t.id === rw.rewardTierId)
                  : null;
                let driftMessage: { tone: 'ok' | 'warn' | 'err'; text: string } | null = null;
                if (rw.rewardTierId) {
                  if (!linkedTier) {
                    driftMessage = {
                      tone: 'err',
                      text: `Linked tier "${rw.rewardTierId}" no longer exists.`,
                    };
                  } else if (linkedTier.data.pointsRequired !== draft.minPoints) {
                    driftMessage = {
                      tone: 'warn',
                      text: `Tier's pointsRequired (${linkedTier.data.pointsRequired}) ≠ this level's minPoints (${draft.minPoints}). Users will receive this code at ${linkedTier.data.pointsRequired} pts, not at this level.`,
                    };
                  } else {
                    driftMessage = {
                      tone: 'ok',
                      text: `Linked: ${linkedTier.data.name} (${linkedTier.data.pointsRequired} pts) ✓`,
                    };
                  }
                }
                return (
                  <div
                    key={rw.id}
                    className="rounded-xl border border-primary-100 bg-primary-50/40 p-4"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-3">
                        <Field label="Title">
                          <input
                            value={rw.title}
                            onChange={(e) => updateReward(idx, { title: e.target.value })}
                            className="input-admin"
                            placeholder="e.g. Get 15% off your order at shophistoria.com"
                          />
                        </Field>
                        <Field label="Description (optional)">
                          <input
                            value={rw.description ?? ''}
                            onChange={(e) =>
                              updateReward(idx, { description: e.target.value })
                            }
                            className="input-admin"
                          />
                        </Field>
                        <Field label="Linked Reward Tier (optional)">
                          <select
                            value={rw.rewardTierId ?? ''}
                            onChange={(e) =>
                              updateReward(idx, {
                                rewardTierId: e.target.value || undefined,
                              })
                            }
                            className="input-admin"
                          >
                            <option value="">— Display only —</option>
                            {tiers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.id} · {t.data.name} ({t.data.pointsRequired} pts)
                              </option>
                            ))}
                          </select>
                        </Field>
                        {driftMessage && (
                          <p
                            className={`text-xs font-medium ${
                              driftMessage.tone === 'ok'
                                ? 'text-success-700'
                                : driftMessage.tone === 'warn'
                                ? 'text-warning-800'
                                : 'text-error-800'
                            }`}
                          >
                            {driftMessage.text}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeReward(idx)}
                        className="rounded p-2 text-error-700 hover:bg-error-50"
                        aria-label="Remove reward"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
              <button type="button" onClick={addReward} className="btn-secondary-admin">
                + Add reward
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Coin image" subtitle="PNG, square, ~512×512.">
            <div className="flex flex-col items-center gap-4">
              <div
                className="grid h-40 w-40 place-items-center overflow-hidden rounded-2xl border border-primary-100"
                style={{ backgroundColor: `${draft.color}22` }}
              >
                {draft.imageUrl ? (
                  <img
                    src={draft.imageUrl}
                    alt={draft.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-gray-500">no image</span>
                )}
              </div>
              <label className="btn-secondary-admin cursor-pointer">
                {uploading ? 'Uploading…' : 'Upload new coin'}
                <input
                  type="file"
                  accept="image/png,image/webp,image/jpeg"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUploadCoin(f);
                    e.target.value = '';
                  }}
                />
              </label>
              <p className="break-all text-center text-[11px] text-gray-500">
                {draft.imageStoragePath || 'no storage path'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
      <header className="mb-4">
        <h2 className="font-serif text-xl font-semibold text-primary-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-primary-900">{label}</span>
      <div className="mt-1">{children}</div>
      {help && <p className="mt-1 text-xs text-gray-600">{help}</p>}
    </label>
  );
}
