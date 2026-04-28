import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import { listRewardTiers, deleteRewardTier, type RewardTierDoc } from '../services/rewardTiersService';
import { getPointsConfig } from '../services/pointsConfigService';
import type { PointsConfig } from '@historia/shared';

export default function RewardTiersPage() {
  const [tiers, setTiers] = useState<RewardTierDoc[]>([]);
  const [config, setConfig] = useState<PointsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  async function refresh() {
    const [t, cfg] = await Promise.all([listRewardTiers(), getPointsConfig()]);
    setTiers(t);
    setConfig(cfg);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
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

  // For each tier, find which level (if any) links to it.
  const linkedFromLevel = useMemo(() => {
    const map = new Map<string, string>();
    if (!config) return map;
    for (const lvl of config.levels) {
      for (const rw of lvl.rewards) {
        if (rw.rewardTierId) map.set(rw.rewardTierId, lvl.name);
      }
    }
    return map;
  }, [config]);

  async function onDelete(id: string) {
    if (!confirm(`Delete tier "${id}"? This cannot be undone.`)) return;
    try {
      await deleteRewardTier(id);
      await refresh();
      setToast({ kind: 'success', message: `Deleted tier ${id}.` });
    } catch (e) {
      setToast({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Delete failed',
      });
    }
  }

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title="Reward Tiers"
        subtitle="Drives the issuance engine — emails Shopify discount codes when a user crosses the points threshold."
        actions={
          <Link to="/reward-tiers/new" className="btn-primary-admin">
            + New tier
          </Link>
        }
      />

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary-600" />
        </div>
      ) : tiers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-primary-200 bg-white p-12 text-center">
          <p className="text-gray-700">No reward tiers yet.</p>
          <Link to="/reward-tiers/new" className="btn-primary-admin mt-4">
            Create the first one
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-soft">
          <table className="min-w-full divide-y divide-primary-100 text-sm">
            <thead className="bg-primary-50 text-left text-xs font-semibold uppercase tracking-wider text-primary-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Points</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Linked from</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-50">
              {tiers.map(({ id, data }) => {
                const linked = linkedFromLevel.get(id);
                return (
                  <tr key={id}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{id}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          data.type === 'percentage_off'
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-success-100 text-success-800'
                        }`}
                      >
                        {data.type === 'percentage_off' ? 'percent off' : 'free item'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary-900">
                      {data.pointsRequired.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      <p className="font-medium">{data.name}</p>
                      <p className="text-xs text-gray-500">
                        {data.type === 'percentage_off'
                          ? `${data.discountPercent}% off`
                          : data.itemName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {linked ? (
                        <span className="text-success-700">{linked}</span>
                      ) : (
                        <span className="italic text-gray-500">orphaned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <Link
                        to={`/reward-tiers/${id}`}
                        className="text-primary-700 hover:text-primary-900"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => onDelete(id)}
                        className="ml-4 text-error-700 hover:text-error-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
