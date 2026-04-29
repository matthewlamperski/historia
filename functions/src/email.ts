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

/**
 * "From" address used for reward-redemption emails. Defaults to the rewards
 * mailbox so the user immediately knows the message is about a discount code.
 */
function getRewardsFromEmail(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'Historia Rewards <rewards@explorehistoria.com>';
}

/**
 * "From" address used for transactional, non-rewards mail (account welcome,
 * Pro welcome, etc.). Keeps a friendlier sender name than the rewards box.
 */
function getTransactionalFromEmail(): string {
  return (
    process.env.RESEND_TRANSACTIONAL_FROM_EMAIL ??
    'Historia <hello@explorehistoria.com>'
  );
}

// ---------------------------------------------------------------------------
// Brand tokens (kept in sync with packages/shared/src/theme.ts)
// ---------------------------------------------------------------------------

const BRAND = {
  cream: '#f7f3ee',
  cream2: '#f0ebe3',
  parchment: '#faf6f1',
  border: '#ece4d2',
  borderSoft: '#f0ebe4',
  primary50: '#f7f3ee',
  primary100: '#ece4d2',
  primary300: '#cbb89a',
  primary500: '#927f61',
  primary600: '#7a6a52',
  primary700: '#625543',
  primary800: '#4a4034',
  primary900: '#322b25',
  ink: '#3d2e1e',
  body: '#4a4034',
  muted: '#7d6f5d',
  faint: '#a1917a',
  white: '#ffffff',
  successInk: '#455d37',
  shopUrl: 'https://shophistoria.com',
  marketingUrl: 'https://historia.app',
} as const;

const APP_STORE_URL =
  process.env.APP_STORE_URL ?? 'https://apps.apple.com/app/historia';
const PLAY_STORE_URL =
  process.env.PLAY_STORE_URL ??
  'https://play.google.com/store/apps/details?id=com.historia.app';

// ---------------------------------------------------------------------------
// Shared HTML shell — used by every transactional email below.
// ---------------------------------------------------------------------------

const SHARED_STYLES = `
  body { margin: 0; padding: 0; background: ${BRAND.cream}; -webkit-font-smoothing: antialiased; }
  table { border-collapse: collapse; }
  img { display: block; border: 0; outline: none; text-decoration: none; }
  a { color: ${BRAND.primary600}; text-decoration: none; }
  .wrapper { width: 100%; background: ${BRAND.cream}; padding: 32px 16px; }
  .container { max-width: 600px; margin: 0 auto; background: ${BRAND.white};
                border-radius: 18px; overflow: hidden;
                box-shadow: 0 2px 16px rgba(50, 43, 37, 0.08); }

  /* HEADER: parchment band with serif wordmark */
  .hdr { background: ${BRAND.cream}; padding: 28px 40px 20px;
          border-bottom: 1px solid ${BRAND.border}; text-align: center; }
  .hdr-mark { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
              font-size: 22px; letter-spacing: 6px; font-weight: 700;
              color: ${BRAND.primary800}; text-transform: uppercase; margin: 0; }
  .hdr-rule { display: inline-block; width: 36px; height: 1px;
              background: ${BRAND.primary300}; margin: 10px 8px 0; vertical-align: middle; }
  .hdr-orn { display: inline-block; vertical-align: middle; margin-top: 10px;
              color: ${BRAND.primary500}; font-size: 11px; letter-spacing: 2px; }
  .hdr-tag { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
              font-style: italic; color: ${BRAND.primary600};
              margin: 10px 0 0; font-size: 13px; }

  /* HERO band */
  .hero { background: linear-gradient(180deg, ${BRAND.cream} 0%, ${BRAND.cream2} 100%);
          padding: 36px 40px 32px; text-align: center; }
  .eyebrow { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 11px; font-weight: 700; letter-spacing: 2.4px;
              text-transform: uppercase; color: ${BRAND.primary600}; margin: 0 0 12px; }
  .hero-title { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
                font-size: 32px; line-height: 1.15; font-weight: 700;
                color: ${BRAND.primary900}; margin: 0; letter-spacing: -0.3px; }
  .hero-title em { color: ${BRAND.primary600}; font-style: italic; }
  .hero-sub { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
              font-style: italic; font-size: 17px; color: ${BRAND.primary700};
              margin: 14px 0 0; line-height: 1.5; }

  /* BODY */
  .body { padding: 32px 40px 8px; }
  .lede { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 16px; line-height: 1.65; color: ${BRAND.body}; margin: 0 0 22px; }
  .lede strong { color: ${BRAND.primary900}; }

  /* CARDS / FEATURE LIST */
  .card { background: ${BRAND.parchment}; border: 1px solid ${BRAND.border};
          border-radius: 14px; padding: 22px 22px; margin: 0 0 14px; }
  .card-eyebrow { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
                  color: ${BRAND.primary600}; font-weight: 700; margin: 0 0 6px; }
  .card-title { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
                font-size: 18px; font-weight: 700; color: ${BRAND.primary900};
                margin: 0 0 6px; }
  .card-text { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px; line-height: 1.6; color: ${BRAND.body}; margin: 0; }

  /* CTA BUTTON */
  .cta-wrap { text-align: center; padding: 24px 40px 8px; }
  .btn { display: inline-block; background: ${BRAND.primary800};
          color: ${BRAND.white} !important; padding: 14px 32px;
          border-radius: 999px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 15px; font-weight: 600; letter-spacing: 0.3px;
          text-decoration: none; }
  .btn-secondary { display: inline-block; background: ${BRAND.white};
                    color: ${BRAND.primary800} !important; padding: 12px 28px;
                    border: 1px solid ${BRAND.primary300}; border-radius: 999px;
                    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 14px; font-weight: 600; letter-spacing: 0.3px;
                    text-decoration: none; }

  /* REWARD CODE */
  .reward-box { background: ${BRAND.parchment}; border: 2px dashed ${BRAND.primary300};
                border-radius: 14px; padding: 28px 24px; text-align: center;
                margin: 8px 0 22px; }
  .reward-label { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 11px; color: ${BRAND.primary600}; letter-spacing: 2px;
                  text-transform: uppercase; font-weight: 700; margin: 0 0 8px; }
  .reward-title { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
                  font-size: 22px; color: ${BRAND.primary900}; margin: 0 0 18px;
                  font-weight: 700; }
  .code-wrap { display: inline-block; background: ${BRAND.white};
                border: 2px solid ${BRAND.primary500}; border-radius: 8px;
                padding: 12px 22px; margin: 0 0 12px; }
  .code { font-family: 'Courier New', Courier, monospace; font-size: 26px;
          font-weight: 700; color: ${BRAND.primary600}; letter-spacing: 5px; }
  .code-help { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 13px; color: ${BRAND.muted}; margin: 0; }

  /* PULL QUOTE / TAGLINE BAND */
  .quote { padding: 28px 40px 4px; text-align: center; }
  .quote p { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
              font-style: italic; font-size: 16px; color: ${BRAND.primary700};
              margin: 0; line-height: 1.6; }

  /* FINE PRINT */
  .fine { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 12px; line-height: 1.6; color: ${BRAND.faint};
          padding: 8px 40px 0; margin: 0; }

  /* FOOTER */
  .footer { padding: 28px 40px 32px; text-align: center;
            border-top: 1px solid ${BRAND.borderSoft}; margin-top: 28px; }
  .footer-mark { font-family: 'Iowan Old Style', 'Apple Garamond', Baskerville, Georgia, serif;
                  font-style: italic; font-size: 13px; color: ${BRAND.primary600};
                  margin: 0 0 6px; }
  .footer-meta { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                  font-size: 11px; color: ${BRAND.faint}; margin: 0; line-height: 1.6; }
  .footer-meta a { color: ${BRAND.primary600}; }

  @media only screen and (max-width: 480px) {
    .wrapper { padding: 16px 8px; }
    .hdr, .hero, .body, .cta-wrap, .quote, .footer { padding-left: 22px; padding-right: 22px; }
    .hero-title { font-size: 26px; }
    .hero-sub { font-size: 15px; }
  }
`.trim();

interface ShellOptions {
  /** Plain-text preview that some clients show next to the subject line. */
  preheader?: string;
  /** Eyebrow above the hero title (e.g. "Welcome", "Historia Pro"). */
  eyebrow?: string;
  /** Hero headline. May contain inline `<em>` for accent words. */
  heroTitle: string;
  /** Optional italic subtitle under the hero. */
  heroSub?: string;
  /** Main body HTML. */
  body: string;
}

function htmlShell(opts: ShellOptions): string {
  const { preheader = '', eyebrow, heroTitle, heroSub, body } = opts;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>Historia</title>
  <style>${SHARED_STYLES}</style>
</head>
<body>
  ${preheader
      ? `<div style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</div>`
      : ''}
  <div class="wrapper">
    <div class="container">
      <div class="hdr">
        <p class="hdr-mark">Historia</p>
        <div>
          <span class="hdr-rule"></span>
          <span class="hdr-orn">&#9670;</span>
          <span class="hdr-rule"></span>
        </div>
        <p class="hdr-tag">Honor History Together</p>
      </div>

      <div class="hero">
        ${eyebrow ? `<p class="eyebrow">${eyebrow}</p>` : ''}
        <h1 class="hero-title">${heroTitle}</h1>
        ${heroSub ? `<p class="hero-sub">${heroSub}</p>` : ''}
      </div>

      ${body}

      <div class="footer">
        <p class="footer-mark">Real World &gt; Virtual World.</p>
        <p class="footer-meta">
          &copy; ${new Date().getFullYear()} Historia &middot; Made for the road.<br />
          You're getting this because you have a Historia account.<br />
          <a href="${BRAND.marketingUrl}">historia.app</a>
          &nbsp;&middot;&nbsp;
          <a href="${BRAND.shopUrl}">shophistoria.com</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeName(value: string | undefined): string {
  if (!value) return '';
  return value.replace(/[<>&"']/g, ch =>
    ch === '<' ? '&lt;' :
    ch === '>' ? '&gt;' :
    ch === '&' ? '&amp;' :
    ch === '"' ? '&quot;' : '&#39;'
  );
}

// ---------------------------------------------------------------------------
// Account Welcome — sent the first time a user creates an account
// ---------------------------------------------------------------------------

function buildAccountWelcomeEmail(firstName?: string): {
  subject: string;
  html: string;
} {
  const safeName = escapeName(firstName?.trim());
  const greetingHero = safeName
    ? `Welcome, <em>${safeName}</em>.`
    : `Welcome to <em>Historia</em>.`;
  const subject = safeName
    ? `Welcome to Historia, ${safeName} — your map awaits`
    : `Welcome to Historia — your map awaits`;

  const body = `
    <div class="body">
      <p class="lede">
        We're so glad you're here. Historia is a different kind of social app —
        a hand-drawn map of America's living heritage that <strong>rewards you
        for getting off your phone and into the world</strong>.
      </p>
      <p class="lede" style="margin-bottom: 28px;">
        Here are a few things to try first:
      </p>

      <div class="card">
        <p class="card-eyebrow">Step One &middot; Discover</p>
        <p class="card-title">Open the map &amp; pick a spot</p>
        <p class="card-text">
          Tens of thousands of national landmarks, museums, monuments, and
          battlefields are pinned across the country. Tap one to see why it
          matters.
        </p>
      </div>

      <div class="card">
        <p class="card-eyebrow">Step Two &middot; Learn</p>
        <p class="card-title">Ask Bede, your AI guide</p>
        <p class="card-text">
          Our LLM-powered guide tells the story of any landmark on the map —
          written like a letter from a friend, not a textbook.
        </p>
      </div>

      <div class="card">
        <p class="card-eyebrow">Step Three &middot; Earn</p>
        <p class="card-title">Visit, post, climb the levels</p>
        <p class="card-text">
          Verified check-ins and posts with photos earn you points. Climb nine
          named levels — Initiate to Eternal Steward — and trade points for
          Made-in-USA gear at shophistoria.com.
        </p>
      </div>
    </div>

    <div class="cta-wrap">
      <a class="btn" href="${APP_STORE_URL}" style="margin: 0 6px 8px;">App Store</a>
      <a class="btn" href="${PLAY_STORE_URL}" style="margin: 0 6px 8px;">Google Play</a>
    </div>

    <div class="cta-wrap" style="padding-top: 4px;">
      <a class="btn-secondary" href="${BRAND.marketingUrl}">Visit historia.app</a>
    </div>

    <div class="quote">
      <p>
        We replaced the algorithm with a map.<br />
        Replaced likes with miles.<br />
        Replaced doomscrolling with the next exit.
      </p>
    </div>

    <p class="fine" style="padding-top: 24px;">
      Questions, ideas, or stories from the road? Just reply to this email —
      a real person reads every one. We're glad you're here.
    </p>
  `;

  const html = htmlShell({
    preheader: safeName
      ? `Welcome, ${safeName}. Three quick steps to start exploring.`
      : `Three quick steps to start exploring American history with Historia.`,
    eyebrow: 'Welcome to Historia',
    heroTitle: greetingHero,
    heroSub: 'Exploring America\'s past to build a more grateful future.',
    body,
  });

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Pro Welcome — sent when a user starts a Historia Pro subscription
// ---------------------------------------------------------------------------

function buildSubscriptionWelcomeEmail(
  firstName: string | undefined,
  redditUrl: string,
): { subject: string; html: string } {
  const safeName = escapeName(firstName?.trim());
  const subject = safeName
    ? `${safeName}, welcome to Historia Pro`
    : 'Welcome to Historia Pro — your adventure just leveled up';

  const greetingHero = safeName
    ? `Welcome to <em>Pro</em>, ${safeName}.`
    : `Welcome to <em>Historia Pro</em>.`;

  const body = `
    <div class="body">
      <p class="lede">
        Thank you for backing Historia. Your subscription directly funds new
        historic-site partnerships, new gear in the shop, and features that
        help more people connect with American history.
        <strong>You're a steward now, not just an explorer.</strong>
      </p>

      <p class="lede" style="margin-bottom: 18px;">Here's everything you've unlocked:</p>

      <div class="card">
        <p class="card-eyebrow">Earn</p>
        <p class="card-title">Points on every visit</p>
        <p class="card-text">
          +10 per verified check-in, +2 per post, plus December double-points.
          Climb nine named levels and unlock real-world perks at each tier.
        </p>
      </div>

      <div class="card">
        <p class="card-eyebrow">Redeem</p>
        <p class="card-title">American-made gear &amp; perks</p>
        <p class="card-text">
          Trade points for exclusive products at ShopHistoria.com — challenge
          coins, tumblers, gift cards, and even museum tours.
        </p>
      </div>

      <div class="card">
        <p class="card-eyebrow">Explore deeper</p>
        <p class="card-title">Offline maps, unlimited bookmarks, gratitude reflections</p>
        <p class="card-text">
          Save every site that catches your eye, download maps for trips
          without cell service, and keep a personal journal tied to your
          landmark visits.
        </p>
      </div>

      <div class="card" style="margin-bottom: 4px;">
        <p class="card-eyebrow">Belong</p>
        <p class="card-title">Priority support &amp; the Pro subreddit</p>
        <p class="card-text">
          Skip the queue when you need help, and swap stories, tips, and trip
          ideas with other Pro members on Reddit.
        </p>
      </div>
    </div>

    <div class="cta-wrap" style="padding-top: 28px;">
      <a class="btn" href="${redditUrl}">Join the Pro subreddit &rarr;</a>
    </div>

    <div class="cta-wrap" style="padding-top: 8px;">
      <a class="btn-secondary" href="${BRAND.shopUrl}">Visit the Historia Shop</a>
    </div>

    <div class="quote">
      <p>
        Authentic discovery. Gratitude at the core. Shared legacy.<br />
        Thank you for honoring history with us.
      </p>
    </div>

    <p class="fine" style="padding-top: 24px;">
      Questions or feedback? Just reply to this email — a real person reads
      every one. Manage or cancel your subscription anytime in your phone's
      App Store or Google Play settings.
    </p>
  `;

  const html = htmlShell({
    preheader: safeName
      ? `Welcome to Pro, ${safeName}. Here's everything you've unlocked.`
      : `Welcome to Historia Pro. Here's everything you've unlocked.`,
    eyebrow: 'Historia Pro',
    heroTitle: greetingHero,
    heroSub: 'Your support keeps Historia ad-free, algorithm-free, and rooted in gratitude.',
    body,
  });

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Reward emails (rewards box + Shopify discount code)
// ---------------------------------------------------------------------------

function buildPercentageOffEmail(
  tier: RewardTier,
  code: string,
  shopifyDomain: string,
): { subject: string; html: string } {
  const subject = `You've unlocked ${tier.discountPercent}% off at the Historia Shop!`;

  const body = `
    <div class="body">
      <p class="lede">
        Congratulations! You've reached
        <strong>${tier.pointsRequired.toLocaleString()} points</strong>
        and unlocked a reward on us.
      </p>

      <div class="reward-box">
        <p class="reward-label">Your reward</p>
        <p class="reward-title">${tier.discountPercent}% off your entire order</p>
        <div class="code-wrap"><span class="code">${code}</span></div>
        <p class="code-help">Enter this code at checkout to save ${tier.discountPercent}%.</p>
      </div>
    </div>

    <div class="cta-wrap">
      <a class="btn" href="https://${shopifyDomain}">Shop now &rarr;</a>
    </div>

    <p class="fine" style="padding-top: 28px;">
      This code is single-use and tied to your account. It cannot be combined
      with other offers and expires after one use.
    </p>
  `;

  const html = htmlShell({
    preheader: `Your ${tier.discountPercent}% off code is ready.`,
    eyebrow: 'Reward unlocked',
    heroTitle: `${tier.discountPercent}% off, on the house.`,
    body,
  });

  return { subject, html };
}

function buildFreeItemEmail(
  tier: RewardTier,
  code: string,
  shopifyDomain: string,
): { subject: string; html: string } {
  const itemName = escapeName(tier.itemName ?? 'Item');
  const subject = `You've unlocked a free ${itemName} from Historia!`;

  const body = `
    <div class="body">
      <p class="lede">
        Congratulations! You've reached
        <strong>${tier.pointsRequired.toLocaleString()} points</strong>
        and unlocked a free item.
      </p>

      <div class="reward-box">
        <p class="reward-label">Free item</p>
        <p class="reward-title">${itemName}</p>
        <div class="code-wrap"><span class="code">${code}</span></div>
        <p class="code-help">
          Add <strong>${itemName}</strong> to your cart, then enter this code
          at checkout to get it free.
        </p>
      </div>
    </div>

    <div class="cta-wrap">
      <a class="btn" href="https://${shopifyDomain}">Claim your item &rarr;</a>
    </div>

    <p class="fine" style="padding-top: 28px;">
      This code is single-use. It applies only to the specified item and
      expires after one use.
    </p>
  `;

  const html = htmlShell({
    preheader: `Your free ${itemName} is ready to claim.`,
    eyebrow: 'Reward unlocked',
    heroTitle: `A free ${itemName}, on the house.`,
    body,
  });

  return { subject, html };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Welcome email sent the first time a user creates a Historia account
 * (free tier or otherwise). Triggered from the `onUserCreate` Firestore
 * trigger in `welcome.ts`.
 */
export async function sendAccountWelcomeEmail(params: {
  email: string;
  firstName?: string;
}): Promise<void> {
  const { email, firstName } = params;
  const resend = new Resend(getResendKey());
  const { subject, html } = buildAccountWelcomeEmail(firstName);

  const { error } = await resend.emails.send({
    from: getTransactionalFromEmail(),
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

/**
 * Welcome email sent when a user starts a Historia Pro subscription.
 * Triggered from the `sendSubscriptionWelcome` HTTP Cloud Function in
 * `index.ts`, which the mobile subscription store calls after a successful
 * purchase.
 */
export async function sendSubscriptionWelcomeEmail(params: {
  email: string;
  firstName?: string;
  redditUrl: string;
}): Promise<void> {
  const { email, firstName } = params;
  const redditUrl = params.redditUrl || 'https://www.reddit.com/r/ExploreHistoria';
  const resend = new Resend(getResendKey());
  const { subject, html } = buildSubscriptionWelcomeEmail(firstName, redditUrl);

  const { error } = await resend.emails.send({
    from: getTransactionalFromEmail(),
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}

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
    from: getRewardsFromEmail(),
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`);
  }
}
