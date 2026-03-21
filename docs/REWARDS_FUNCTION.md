# Historia Rewards Cloud Function

A Firebase Cloud Function (`processRewards`) that issues Shopify discount codes
when a user crosses a points threshold, then emails the code via Resend.

---

## How it works

```
POST /processRewards
Body: { "points": 750, "email": "user@example.com" }

  1. Query rewardTiers where pointsRequired <= points
  2. Skip any tier already recorded in userRewards/{email}/claimed/{tierId}
  3. For each new tier:
       a. Call Shopify Admin API → create price rule + unique discount code
       b. Send email via Resend with styled HTML template
       c. Write claim record to Firestore (prevents duplicate issuance)
  4. Return list of newly issued rewards
```

---

## Firestore schema

### `rewardTiers/{tierId}`  — create these documents manually

**Percentage-off example (500 pts → 10% off):**
```json
{
  "pointsRequired": 500,
  "type": "percentage_off",
  "name": "10% Off Coupon",
  "description": "10% off your entire order",
  "discountPercent": 10
}
```

**Free-item example (1000 pts → free tote bag):**
```json
{
  "pointsRequired": 1000,
  "type": "free_item",
  "name": "Free Tote Bag",
  "description": "Redeem a free Historia tote bag",
  "shopifyProductId": "8012345678901",
  "itemName": "Historia Tote Bag"
}
```

> To lock the reward to a **specific variant** (e.g. one size/colour), add
> `"shopifyVariantId": "42012345678901"` instead of `shopifyProductId`.

### `userRewards/{email}/claimed/{tierId}`  — written by the function

```json
{
  "claimedAt": "<Firestore Timestamp>",
  "tierId": "abc123",
  "tierName": "10% Off Coupon",
  "type": "percentage_off",
  "code": "HIST-A3FX9KT1",
  "shopifyPriceRuleId": "1234567890",
  "shopifyDiscountCodeId": "9876543210",
  "pointsAtClaim": 750
}
```

---

## Credentials you need to supply

Copy `functions/.env.example` → `functions/.env` and fill in these values:

| Variable | Where to get it |
|---|---|
| `SHOPIFY_STORE_DOMAIN` | Your store URL without `https://`, e.g. `my-shop.myshopify.com` |
| `SHOPIFY_ADMIN_API_TOKEN` | Shopify Admin → **Apps** → **Develop apps** → create a custom app → install it → copy the **Admin API access token**. Required scopes: `write_price_rules`, `write_discounts` |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys → Create API Key |
| `RESEND_FROM_EMAIL` | A domain you've verified in Resend, e.g. `Historia Rewards <rewards@your-domain.com>` |

---

## Deploying

```bash
# 1. Install Firebase CLI (one-time)
npm install -g firebase-tools
firebase login

# 2. Install function dependencies
cd functions
npm install
cd ..

# 3. Copy and fill in your credentials
cp functions/.env.example functions/.env
# edit functions/.env with real values

# 4. Deploy
firebase deploy
```

After deploying, the URL will be printed:
```
Function URL (processRewards):
  https://us-central1-historia-application.cloudfunctions.net/processRewards
```

---

## Testing locally with the emulator

```bash
cd functions && npm run build && cd ..
firebase emulators:start --only functions

# In another terminal
curl -X POST \
  http://127.0.0.1:5001/historia-application/us-central1/processRewards \
  -H "Content-Type: application/json" \
  -d '{"points": 750, "email": "test@example.com"}'
```

---

## Calling from the app

Call the function whenever the user's point balance changes (bookmark added,
check-in completed, etc.):

```typescript
const response = await fetch(
  'https://us-central1-historia-application.cloudfunctions.net/processRewards',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      points: user.pointsBalance,
      email: user.email,
    }),
  },
);
const data = await response.json();
// data.newRewards → [{ name, type, code }, ...]
```

---

## Finding a Shopify product ID

1. Shopify Admin → **Products** → click the product
2. The numeric ID is in the URL: `.../products/8012345678901`
3. Use that number (as a string) for `shopifyProductId` in the Firestore document
