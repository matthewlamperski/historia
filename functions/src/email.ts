import { Resend } from 'resend';
import { RewardTier } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getResendKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY environment variable is not set');
  return key;
}

function getFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'Historia Rewards <rewards@historia.app>';
}

// ---------------------------------------------------------------------------
// HTML email templates
// ---------------------------------------------------------------------------

const BASE_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; background: #f5f0eb; margin: 0; padding: 0; }
  .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px;
               overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,0.10); }
  .header { background: #927f61; padding: 32px 40px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 26px; letter-spacing: 1.5px; font-weight: normal; }
  .header p  { color: #e8ddd0; margin: 6px 0 0; font-size: 13px; letter-spacing: 0.5px; }
  .body  { padding: 36px 40px; }
  .intro { font-size: 15px; color: #444; line-height: 1.6; margin: 0 0 24px; }
  .reward-box { background: #faf6f1; border: 2px dashed #c4aa88; border-radius: 10px;
                padding: 28px 24px; text-align: center; margin: 0 0 28px; }
  .reward-label { font-size: 13px; color: #927f61; letter-spacing: 1px; text-transform: uppercase;
                  margin: 0 0 8px; }
  .reward-title { font-size: 22px; color: #3d2e1e; margin: 0 0 16px; }
  .code-wrapper { display: inline-block; background: #fff; border: 2px solid #927f61;
                  border-radius: 6px; padding: 10px 20px; margin: 0 0 12px; }
  .code { font-size: 28px; font-weight: bold; color: #927f61; letter-spacing: 5px;
          font-family: 'Courier New', Courier, monospace; }
  .code-instructions { font-size: 13px; color: #888; margin: 0; }
  .cta { text-align: center; margin: 0 0 28px; }
  .cta a { display: inline-block; background: #927f61; color: #fff; padding: 14px 36px;
           border-radius: 8px; text-decoration: none; font-size: 15px; letter-spacing: 0.5px; }
  .fine-print { font-size: 12px; color: #aaa; line-height: 1.5; margin: 0; }
  .footer { padding: 20px 40px; border-top: 1px solid #f0ebe4; font-size: 11px;
            color: #bbb; text-align: center; }
`.trim();

function htmlShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${BASE_STYLES}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Historia Rewards</h1>
      <p>Your points are paying off</p>
    </div>
    <div class="body">
      ${bodyContent}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Historia &mdash; All rights reserved.<br />
      This is a one-time reward code tied to your account.
    </div>
  </div>
</body>
</html>`;
}

function buildPercentageOffEmail(
  tier: RewardTier,
  code: string,
  shopifyDomain: string,
): { subject: string; html: string } {
  const subject = `You've unlocked ${tier.discountPercent}% off at the Historia Shop!`;

  const body = `
    <p class="intro">
      Congratulations! You've reached <strong>${tier.pointsRequired.toLocaleString()} points</strong>
      and unlocked a reward:
    </p>
    <div class="reward-box">
      <p class="reward-label">Your reward</p>
      <p class="reward-title">${tier.discountPercent}% Off Your Entire Order</p>
      <div class="code-wrapper"><span class="code">${code}</span></div>
      <p class="code-instructions">Enter this code at checkout to save ${tier.discountPercent}%</p>
    </div>
    <div class="cta">
      <a href="https://${shopifyDomain}" target="_blank">Shop Now &rarr;</a>
    </div>
    <p class="fine-print">
      This code is single-use and tied to your account. It cannot be combined with other offers
      and expires after one use.
    </p>
  `;

  return { subject, html: htmlShell(body) };
}

function buildFreeItemEmail(
  tier: RewardTier,
  code: string,
  shopifyDomain: string,
): { subject: string; html: string } {
  const itemName = tier.itemName ?? 'Item';
  const subject = `You've unlocked a free ${itemName} from Historia!`;

  const body = `
    <p class="intro">
      Congratulations! You've reached <strong>${tier.pointsRequired.toLocaleString()} points</strong>
      and unlocked a free item:
    </p>
    <div class="reward-box">
      <p class="reward-label">Free item</p>
      <p class="reward-title">${itemName}</p>
      <div class="code-wrapper"><span class="code">${code}</span></div>
      <p class="code-instructions">
        Add <strong>${itemName}</strong> to your cart, then enter this code at checkout to get it free.
      </p>
    </div>
    <div class="cta">
      <a href="https://${shopifyDomain}" target="_blank">Claim Your Item &rarr;</a>
    </div>
    <p class="fine-print">
      This code is single-use. It applies only to the specified item and expires after one use.
    </p>
  `;

  return { subject, html: htmlShell(body) };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function sendRewardEmail(params: {
  email: string;
  tier: RewardTier;
  code: string;
}): Promise<void> {
  const { email, tier, code } = params;
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN ?? 'your-store.myshopify.com';

  const resend = new Resend(getResendKey());

  const { subject, html } =
    tier.type === 'percentage_off'
      ? buildPercentageOffEmail(tier, code, shopifyDomain)
      : buildFreeItemEmail(tier, code, shopifyDomain);

  const { error } = await resend.emails.send({
    from: getFromEmail(),
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}
