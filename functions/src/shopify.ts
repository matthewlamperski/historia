import { RewardTier, DiscountResult } from './types';

const SHOPIFY_API_VERSION = '2024-01';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getShopifyDomain(): string {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN environment variable is not set');
  return domain;
}

function getShopifyToken(): string {
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!token) throw new Error('SHOPIFY_ADMIN_API_TOKEN environment variable is not set');
  return token;
}

/** Generates a unique, human-readable discount code. */
function generateCode(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${rand}${ts}`;
}

/** POST helper that throws on non-2xx responses. */
async function shopifyPost(path: string, body: object): Promise<Record<string, unknown>> {
  const url = `https://${getShopifyDomain()}/admin/api/${SHOPIFY_API_VERSION}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': getShopifyToken(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API ${response.status} on ${path}: ${text}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

/** Creates a discount code under an existing price rule and returns its ID. */
async function createDiscountCode(priceRuleId: string, code: string): Promise<string> {
  const data = await shopifyPost(
    `/price_rules/${priceRuleId}/discount_codes.json`,
    { discount_code: { code } },
  );
  const dc = (data as { discount_code: { id: number } }).discount_code;
  return String(dc.id);
}

// ---------------------------------------------------------------------------
// Reward type handlers
// ---------------------------------------------------------------------------

async function createPercentageOffDiscount(tier: RewardTier): Promise<DiscountResult> {
  if (!tier.discountPercent) throw new Error(`Tier ${tier.id} is missing discountPercent`);

  const code = generateCode('HIST');

  const data = await shopifyPost('/price_rules.json', {
    price_rule: {
      title: `Historia Reward — ${tier.name}`,
      value_type: 'percentage',
      value: `-${tier.discountPercent}.0`,
      customer_selection: 'all',
      target_type: 'line_item',
      target_selection: 'all',
      allocation_method: 'across',
      starts_at: new Date().toISOString(),
      once_per_customer: true,
      usage_limit: 1,
    },
  });

  const priceRuleId = String(
    (data as { price_rule: { id: number } }).price_rule.id,
  );
  const discountCodeId = await createDiscountCode(priceRuleId, code);

  return { code, priceRuleId, discountCodeId };
}

async function createFreeItemDiscount(tier: RewardTier): Promise<DiscountResult> {
  if (!tier.shopifyProductId && !tier.shopifyVariantId) {
    throw new Error(`Tier ${tier.id} is missing shopifyProductId or shopifyVariantId`);
  }

  const code = generateCode('HISTFREE');

  // A -100% price rule scoped to a specific product/variant makes it free.
  // Shopify requires target_selection: 'entitled' when limiting to specific items.
  const priceRuleBody: Record<string, unknown> = {
    title: `Historia Reward — Free ${tier.itemName ?? 'Item'}`,
    value_type: 'percentage',
    value: '-100.0',
    customer_selection: 'all',
    target_type: 'line_item',
    target_selection: 'entitled',
    allocation_method: 'each',
    starts_at: new Date().toISOString(),
    once_per_customer: true,
    usage_limit: 1,
  };

  if (tier.shopifyVariantId) {
    // Pin to a specific variant (e.g. a particular size/colour)
    priceRuleBody.entitled_variant_ids = [parseInt(tier.shopifyVariantId, 10)];
  } else {
    // Apply to any variant of the product
    priceRuleBody.entitled_product_ids = [parseInt(tier.shopifyProductId!, 10)];
  }

  const data = await shopifyPost('/price_rules.json', { price_rule: priceRuleBody });
  const priceRuleId = String(
    (data as { price_rule: { id: number } }).price_rule.id,
  );
  const discountCodeId = await createDiscountCode(priceRuleId, code);

  return { code, priceRuleId, discountCodeId };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createShopifyDiscount(tier: RewardTier): Promise<DiscountResult> {
  switch (tier.type) {
    case 'percentage_off': return createPercentageOffDiscount(tier);
    case 'free_item':      return createFreeItemDiscount(tier);
    default:
      throw new Error(`Unknown reward type: ${(tier as RewardTier).type}`);
  }
}
