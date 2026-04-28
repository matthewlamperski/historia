import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import { getPointsConfig, savePointsConfig } from '../services/pointsConfigService';
import { listRewardTiers, type RewardTierDoc } from '../services/rewardTiersService';
import type { LevelDef, PointsConfig } from '@historia/shared';

interface DriftSummary {
  linked: number;
  unlinked: number;
  warnings: number;
}

export default function LevelsPage() {
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [tiers, setTiers] = useState<RewardTierDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfg, t] = await Promise.all([getPointsConfig(), listRewardTiers()]);
        if (cancelled) return;
        if (!cfg) {
          setError(
            "config/points doesn't exist yet. Run `node scripts/seed-points-config.js` from the mobile repo first."
          );
        } else {
          setConfig(cfg);
        }
        setTiers(t);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const driftSummary: DriftSummary = useMemo(() => {
    if (!config) return { linked: 0, unlinked: 0, warnings: 0 };
    let linked = 0;
    let unlinked = 0;
    let warnings = 0;
    for (const lvl of config.levels) {
      for (const rw of lvl.rewards) {
        if (!rw.rewardTierId) {
          unlinked++;
          continue;
        }
        const tier = tiers.find((t) => t.id === rw.rewardTierId);
        if (!tier) {
          warnings++;
          continue;
        }
        linked++;
        if (tier.data.pointsRequired !== lvl.minPoints) warnings++;
      }
    }
    return { linked, unlinked, warnings };
  }, [config, tiers]);

  function move(idx: number, dir: -1 | 1) {
    if (!config) return;
    const next = config.levels.slice().sort((a, b) => a.order - b.order);
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    // Re-stamp order based on new array index.
    next.forEach((lvl, i) => (lvl.order = i + 1));
    setConfig({ ...config, levels: next });
    setDirty(true);
  }

  async function saveAll() {
    if (!config) return;
    setSaving(true);
    setError(null);
    try {
      const result = await savePointsConfig({
        levels: config.levels,
        earning: config.earning,
      });
      setConfig({ ...config, version: result.version });
      setDirty(false);
      setToast({
        kind: 'success',
        message: `Saved. Version bumped to ${result.version}.`,
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
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="rounded-2xl border border-error-200 bg-error-50 p-6 text-error-800">
        <p className="font-semibold">Could not load levels</p>
        <p className="mt-2 text-sm">{error || 'config/points missing'}</p>
      </div>
    );
  }

  const sorted = [...config.levels].sort((a, b) => a.order - b.order);

  return (
    <>
      {toast && (
        <Toast
          kind={toast.kind}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      <PageHeader
        title="Levels & Rewards"
        subtitle={`Edit the points ladder the mobile app shows on the Levels screen. v${config.version}.`}
        actions={
          <>
            <button
              type="button"
              className="btn-secondary-admin"
              onClick={() => navigate('/reward-tiers')}
            >
              Reward Tiers
            </button>
            <button
              type="button"
              className="btn-primary-admin disabled:opacity-50"
              onClick={saveAll}
              disabled={!dirty || saving}
            >
              {saving ? 'Saving…' : dirty ? 'Save reorder + bump version' : 'No changes'}
            </button>
          </>
        }
      />

      <DriftBanner summary={driftSummary} />

      <div className="mt-6 space-y-3">
        {sorted.map((lvl, i) => (
          <LevelRow
            key={lvl.id}
            level={lvl}
            tiers={tiers}
            isFirst={i === 0}
            isLast={i === sorted.length - 1}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          />
        ))}
      </div>
    </>
  );
}

function DriftBanner({ summary }: { summary: DriftSummary }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat
        label="Linked"
        value={summary.linked}
        tone="success"
        hint="rewards with a working rewardTier link"
      />
      <Stat
        label="Display-only"
        value={summary.unlinked}
        tone="neutral"
        hint="rewards shown in app but not in the issuance engine"
      />
      <Stat
        label="Drift warnings"
        value={summary.warnings}
        tone={summary.warnings > 0 ? 'warning' : 'success'}
        hint="mismatched or missing rewardTierId links"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const palette =
    tone === 'success'
      ? 'border-success-200 bg-success-50 text-success-800'
      : tone === 'warning'
      ? 'border-warning-300 bg-warning-50 text-warning-800'
      : 'border-primary-100 bg-white text-primary-900';
  return (
    <div className={`rounded-2xl border p-5 ${palette}`}>
      <p className="text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-80">{hint}</p>
    </div>
  );
}

function LevelRow({
  level,
  tiers,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
}: {
  level: LevelDef;
  tiers: RewardTierDoc[];
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const range =
    level.maxPoints === null
      ? `${level.minPoints.toLocaleString()}+ pts`
      : `${level.minPoints.toLocaleString()} – ${level.maxPoints.toLocaleString()} pts`;

  const driftCount = level.rewards.filter((rw) => {
    if (!rw.rewardTierId) return false;
    const tier = tiers.find((t) => t.id === rw.rewardTierId);
    if (!tier) return true;
    return tier.data.pointsRequired !== level.minPoints;
  }).length;

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-primary-100 bg-white p-4 shadow-soft">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="grid h-7 w-7 place-items-center rounded text-primary-700 hover:bg-primary-50 disabled:opacity-30"
          aria-label="Move up"
        >
          ▲
        </button>
        <span className="text-xs font-semibold text-primary-600">{level.order}</span>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="grid h-7 w-7 place-items-center rounded text-primary-700 hover:bg-primary-50 disabled:opacity-30"
          aria-label="Move down"
        >
          ▼
        </button>
      </div>

      <div
        className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-primary-100"
        style={{ backgroundColor: `${level.color}22` }}
      >
        {level.imageUrl ? (
          <img src={level.imageUrl} alt={level.name} className="h-full w-full object-contain" />
        ) : (
          <span className="font-bold" style={{ color: level.color }}>
            {level.order}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-serif text-lg font-semibold text-primary-900">{level.name}</p>
        <p className="text-sm text-gray-600">
          {range} · {level.rewards.length} reward{level.rewards.length === 1 ? '' : 's'}
          {driftCount > 0 && (
            <span className="ml-2 rounded-full bg-warning-100 px-2 py-0.5 text-[10px] font-semibold text-warning-800">
              {driftCount} drift
            </span>
          )}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="hidden h-3 w-3 rounded-full sm:block"
        style={{ backgroundColor: level.color }}
      />

      <Link to={`/levels/${level.id}`} className="btn-primary-admin">
        Edit
      </Link>
    </div>
  );
}
