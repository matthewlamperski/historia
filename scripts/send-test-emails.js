#!/usr/bin/env node
/*
 * One-shot trigger that sends the two transactional emails (account welcome,
 * subscription welcome) to a target address so we can preview them. Pulls
 * RESEND_API_KEY and friends out of functions/.env.example.
 */

const fs = require('fs');
const path = require('path');

const TO = process.argv[2] || 'matthew.lamperski@gmail.com';
const FIRST_NAME = process.argv[3] || 'Matthew';

const ENV_FILE = path.resolve(__dirname, '..', 'functions', '.env.example');

function loadEnv(file) {
  const content = fs.readFileSync(file, 'utf8');
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // Strip surrounding quotes if present.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv(ENV_FILE);

// Resend keys must start with `re_`. The .env.example currently has `rre_…`
// which is almost certainly a typo. Auto-correct it.
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('rre_')) {
  console.log('  (note) RESEND_API_KEY started with "rre_" — stripping leading r');
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY.slice(1);
}

// Default transactional sender to the rewards sender if only one domain
// address is verified in Resend.
if (
  !process.env.RESEND_TRANSACTIONAL_FROM_EMAIL &&
  process.env.RESEND_FROM_EMAIL
) {
  process.env.RESEND_TRANSACTIONAL_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
}

const emailModulePath = path.resolve(__dirname, '..', 'functions', 'lib', 'email.js');
const {
  sendAccountWelcomeEmail,
  sendSubscriptionWelcomeEmail,
} = require(emailModulePath);

(async () => {
  console.log(`Target inbox: ${TO}`);
  console.log(`First name:   ${FIRST_NAME}`);
  console.log(`From (rewards):       ${process.env.RESEND_FROM_EMAIL || '(default)'}`);
  console.log(`From (transactional): ${process.env.RESEND_TRANSACTIONAL_FROM_EMAIL || '(default fallback)'}`);
  console.log('');

  let failures = 0;

  console.log('1. Account welcome email...');
  try {
    await sendAccountWelcomeEmail({ email: TO, firstName: FIRST_NAME });
    console.log('   ✓ sent');
  } catch (e) {
    failures++;
    console.error('   ✗ failed:', e.message);
  }

  console.log('2. Subscription welcome email...');
  try {
    await sendSubscriptionWelcomeEmail({
      email: TO,
      firstName: FIRST_NAME,
      redditUrl: 'https://www.reddit.com/r/ExploreHistoria',
    });
    console.log('   ✓ sent');
  } catch (e) {
    failures++;
    console.error('   ✗ failed:', e.message);
  }

  if (failures) {
    console.log(`\n${failures} failure(s). Check Resend dashboard for details.`);
    process.exit(1);
  } else {
    console.log('\nBoth queued with Resend. Check your inbox.');
  }
})();
