import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Toast from '../components/Toast';
import {
  getRewardTier,
  saveRewardTier,
} from '../services/rewardTiersService';
import type { RewardTier, RewardTierType } from '@historia/shared';

interface DraftPercentageOff {
  type: 'percentage_off';
  pointsRequired: number;
  discountPercent: number;
  name: string;
  description: string;
}

interface DraftFreeItem {
  type: 'free_item';
  pointsRequired: number;
  shopifyProductId: string;
  shopifyVariantId: string;
  itemName: string;
  name: string;
  description: string;
}

type Draft = DraftPercentageOff | DraftFreeItem;

const EMPTY_PERCENT: DraftPercentageOff = {
  type: 'percentage_off',
  pointsRequired: 0,
  discountPercent: 10,
  name: '',
  description: '',
};

const EMPTY_FREE: DraftFreeItem = {
  type: 'free_item',
  pointsRequired: 0,
  shopifyProductId: '',
  shopifyVariantId: '',
  itemName: '',
  name: '',
  description: '',
};

export default function RewardTierEditPage() {
  const { tierId } = useParams<{ tierId: string }>();
  const navigate = useNavigate();
  const isNew = !tierId;
  const [draftId, setDraftId] = useState(tierId ?? '');
  const [draft, setDraft] = useState<Draft>(EMPTY_PERCENT);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const got = await getRewardTier(tierId!);
        if (cancelled) return;
        if (!got) {
          setToast({ kind: 'error', message: `Tier "${tierId}" not found.` });
          return;
        }
        if (got.data.type === 'percentage_off') {
          setDraft({ ...got.data });
        } else {
          setDraft({ ...got.data, shopifyVariantId: got.data.shopifyVariantId ?? '' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tierId, isNew]);

  function setType(type: RewardTierType) {
    setDraft((prev) => {
      if (prev.type === type) return prev;
      if (type === 'percentage_off')
        return { ...EMPTY_PERCENT, pointsRequired: prev.pointsRequired, name: prev.name, description: prev.description };
      return { ...EMPTY_FREE, pointsRequired: prev.pointsRequired, name: prev.name, description: prev.description };
    });
  }

  async function save() {
    setSaving(true);
    try {
      if (isNew && !draftId.trim()) {
        throw new Error('Tier ID is required for new tiers.');
      }

      const id = (isNew ? draftId.trim() : tierId!).replace(/\s+/g, '_');

      let payload: RewardTier;
      if (draft.type === 'percentage_off') {
        payload = {
          type: 'percentage_off',
          pointsRequired: Number(draft.pointsRequired),
          discountPercent: Number(draft.discountPercent),
          name: draft.name,
          description: draft.description,
        };
      } else {
        payload = {
          type: 'free_item',
          pointsRequired: Number(draft.pointsRequired),
          shopifyProductId: draft.shopifyProductId,
          ...(draft.shopifyVariantId ? { shopifyVariantId: draft.shopifyVariantId } : {}),
          itemName: draft.itemName,
          name: draft.name,
          description: draft.description,
        };
      }

      await saveRewardTier(id, payload);
      setToast({ kind: 'success', message: 'Saved.' });
      if (isNew) {
        setTimeout(() => navigate(`/reward-tiers/${id}`), 800);
      }
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

  return (
    <>
      {toast && (
        <Toast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} />
      )}

      <PageHeader
        title={isNew ? 'New reward tier' : tierId!}
        backHref="/reward-tiers"
        backLabel="Back to tiers"
        actions={
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn-primary-admin disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save tier'}
          </button>
        }
      />

      <section className="space-y-6 rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
        {isNew && (
          <Field
            label="Tier ID"
            help="Stable identifier; lowercase, snake_case. Must be unique."
          >
            <input
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              className="input-admin font-mono"
              placeholder="shop_15_off"
            />
          </Field>
        )}

        <Field label="Type">
          <div className="flex gap-2">
            <button
              type="button"
              className={typeBtnCls(draft.type === 'percentage_off')}
              onClick={() => setType('percentage_off')}
            >
              Percentage off
            </button>
            <button
              type="button"
              className={typeBtnCls(draft.type === 'free_item')}
              onClick={() => setType('free_item')}
            >
              Free item
            </button>
          </div>
        </Field>

        <Field label="Points required">
          <input
            type="number"
            min={0}
            value={draft.pointsRequired}
            onChange={(e) =>
              setDraft({ ...draft, pointsRequired: Number(e.target.value) })
            }
            className="input-admin max-w-xs"
          />
        </Field>

        <Field label="Display name (used in emails)">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="input-admin"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            rows={2}
            className="input-admin"
          />
        </Field>

        {draft.type === 'percentage_off' && (
          <Field label="Discount percent">
            <input
              type="number"
              min={1}
              max={100}
              value={draft.discountPercent}
              onChange={(e) =>
                setDraft({ ...draft, discountPercent: Number(e.target.value) })
              }
              className="input-admin max-w-xs"
            />
          </Field>
        )}

        {draft.type === 'free_item' && (
          <>
            <Field label="Shopify product ID">
              <input
                value={draft.shopifyProductId}
                onChange={(e) =>
                  setDraft({ ...draft, shopifyProductId: e.target.value })
                }
                className="input-admin font-mono"
              />
            </Field>
            <Field label="Shopify variant ID (optional)">
              <input
                value={draft.shopifyVariantId}
                onChange={(e) =>
                  setDraft({ ...draft, shopifyVariantId: e.target.value })
                }
                className="input-admin font-mono"
              />
            </Field>
            <Field label="Item name (shown in email)">
              <input
                value={draft.itemName}
                onChange={(e) => setDraft({ ...draft, itemName: e.target.value })}
                className="input-admin"
              />
            </Field>
          </>
        )}
      </section>
    </>
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

function typeBtnCls(active: boolean): string {
  return `rounded-lg px-4 py-2 text-sm font-medium transition ${
    active
      ? 'bg-primary-600 text-white shadow-soft'
      : 'border border-primary-200 bg-white text-primary-800 hover:bg-primary-50'
  }`;
}
