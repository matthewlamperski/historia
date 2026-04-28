import { onRequest } from 'firebase-functions/v2/https';
import { onMessagePublished } from 'firebase-functions/v2/pubsub';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import {
  AppStoreServerAPIClient,
  Environment,
  ReceiptUtility,
  SignedDataVerifier,
  VerificationException,
} from '@apple/app-store-server-library';
import { google } from 'googleapis';
import {
  CanonicalSubscriptionState,
  Platform,
  applyCanonicalState,
  appleNotificationToState,
  findUidByOriginalTransactionId,
  findUidByPurchaseToken,
  fs,
  googleNotificationTypeToStatus,
  msToIso,
} from './subscriptionLifecycle';

// ─── Secrets / params ───────────────────────────────────────────────────────
//
// Apple App Store Server API credentials. Set these once per environment with:
//   firebase functions:secrets:set APPLE_KEY_ID
//   firebase functions:secrets:set APPLE_ISSUER_ID
//   firebase functions:secrets:set APPLE_BUNDLE_ID
//   firebase functions:secrets:set APPLE_PRIVATE_KEY            # contents of the .p8 file
//
// Google Play credentials:
//   firebase functions:secrets:set GOOGLE_PLAY_SERVICE_ACCOUNT  # full JSON of the service account
//   firebase functions:secrets:set GOOGLE_PLAY_PACKAGE_NAME     # e.g. com.historia.app

const APPLE_KEY_ID = defineSecret('APPLE_KEY_ID');
const APPLE_ISSUER_ID = defineSecret('APPLE_ISSUER_ID');
const APPLE_BUNDLE_ID = defineSecret('APPLE_BUNDLE_ID');
const APPLE_PRIVATE_KEY = defineSecret('APPLE_PRIVATE_KEY');

const GOOGLE_PLAY_SERVICE_ACCOUNT = defineSecret('GOOGLE_PLAY_SERVICE_ACCOUNT');
const GOOGLE_PLAY_PACKAGE_NAME = defineSecret('GOOGLE_PLAY_PACKAGE_NAME');

// Set to 'sandbox' in functions/.env if you want to test against sandbox.
// Defaults to production (real App Store).
const APPLE_ENVIRONMENT_VALUE = process.env.APPLE_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production';

const APPLE_SECRETS = [
  APPLE_KEY_ID,
  APPLE_ISSUER_ID,
  APPLE_BUNDLE_ID,
  APPLE_PRIVATE_KEY,
];
const GOOGLE_SECRETS = [
  GOOGLE_PLAY_SERVICE_ACCOUNT,
  GOOGLE_PLAY_PACKAGE_NAME,
];
// validateReceipt routes per platform — declares both so deploy works even
// while one set is placeholders. Runtime branching ensures the real call
// only references the platform actually being validated.
const ALL_SECRETS = [...APPLE_SECRETS, ...GOOGLE_SECRETS];

const APPLE_ROOT_CERTS_BASE64: string[] = [
  // AppleRootCA-G3.cer — fetched from https://www.apple.com/certificateauthority/
  'MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==',
  // AppleRootCA-G2.cer
  'MIIFkjCCA3qgAwIBAgIIAeDltYNno+AwDQYJKoZIhvcNAQEMBQAwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEcyMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxMDA5WhcNMzkwNDMwMTgxMDA5WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzIxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBANgREkhI2imKScUcx+xuM23+TfvgHN6sXuI2pyT5f1BrTM65MFQn5bPW7SXmMLYFN14UIhHF6Kob0vuy0gmVOKTvKkmMXT5xZgM4+xb1hYjkWpIMBDLyyED7Ul+f9sDx47pFoFDVEovy3d6RhiPw9bZyLgHaC/YuOQhfGaFjQQscp5TBhsRTL3b2CtcM0YM/GlMZ81fVJ3/8E7j4ko380yhDPLVoACVdJ2LT3VXdRCCQgzWTxb+4Gftr49wIQuavbfqeQMpOhYV4SbHXw8EwOTKrfl+q04tvny0aIWhwZ7Oj8ZhBbZF8+NfbqOdfIRqMM78xdLe40fTgIvS/cjTf94FNcX1RoeKz8NMoFnNvzcytN31O661A4T+B/fc9Cj6i8b0xlilZ3MIZgIxbdMYs0xBTJh0UT8TUgWY8h2czJxQI6bR3hDRSj4n4aJgXv8O7qhOTH11UL6jHfPsNFL4VPSQ08prcdUFmIrQB1guvkJ4M6mL4m1k8COKWNORj3rw31OsMiANDC1CvoDTdUE0V+1ok2Az6DGOeHwOx4e7hqkP0ZmUoNwIx7wHHHtHMn23KVDpA287PT0aLSmWaasZobNfMmRtHsHLDd4/E92GcdB/O/WuhwpyUgquUoue9G7q5cDmVF8Up8zlYNPXEpMZ7YLlmQ1A/bmH8DvmGqmAMQ0uVAgMBAAGjQjBAMB0GA1UdDgQWBBTEmRNsGAPCe8CjoA1/coB6HHcmjTAPBgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQwFAAOCAgEAUabz4vS4PZO/Lc4Pu1vhVRROTtHlznldgX/+tvCHM/jvlOV+3Gp5pxy+8JS3ptEwnMgNCnWefZKVfhidfsJxaXwU6s+DDuQUQp50DhDNqxq6EWGBeNjxtUVAeKuowM77fWM3aPbn+6/Gw0vsHzYmE1SGlHKy6gLti23kDKaQwFd1z4xCfVzmMX3zybKSaUYOiPjjLUKyOKimGY3xn83uamW8GrAlvacp/fQ+onVJv57byfenHmOZ4VxG/5IFjPoeIPmGlFYl5bRXOJ3riGQUIUkhOb9iZqmxospvPyFgxYnURTbImHy99v6ZSYA7LNKmp4gDBDEZt7Y6YUX6yfIjyGNzv1aJMbDZfGKnexWoiIqrOEDCzBL/FePwN983csvMmOa/orz6JopxVtfnJBtIRD6e/J/JzBrsQzwBvDR4yGn1xuZW7AYJNpDrFEobXsmII9oDMJELuDY++ee1KG++P+w8j2Ud5cAeh6Squpj9kuNsJnfdBrRkBof0Tta6SqoWqPQFZ2aWuuJVecMsXUmPgEkrihLHdoBR37q9ZV0+N0djMenl9MU/S60EinpxLK8JQzcPqOMyT/RFtm2XNuyE9QoB6he7hY1Ck3DDUOUUi78/w0EP3SIEIwiKum1xRKtzCTrJ+VKACd+66eYWyi4uTLLT3OUEVLLUNIAytbwPF+E=',
];

function buildAppleClient(): AppStoreServerAPIClient {
  const env =
    APPLE_ENVIRONMENT_VALUE === 'sandbox'
      ? Environment.SANDBOX
      : Environment.PRODUCTION;
  return new AppStoreServerAPIClient(
    APPLE_PRIVATE_KEY.value(),
    APPLE_KEY_ID.value(),
    APPLE_ISSUER_ID.value(),
    APPLE_BUNDLE_ID.value(),
    env,
  );
}

function buildAppleVerifier(): SignedDataVerifier {
  const env =
    APPLE_ENVIRONMENT_VALUE === 'sandbox'
      ? Environment.SANDBOX
      : Environment.PRODUCTION;
  const rootCerts = APPLE_ROOT_CERTS_BASE64.map(b64 =>
    Buffer.from(b64, 'base64'),
  );
  return new SignedDataVerifier(
    rootCerts,
    rootCerts.length > 0,
    env,
    APPLE_BUNDLE_ID.value(),
  );
}

function googlePublisher() {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(GOOGLE_PLAY_SERVICE_ACCOUNT.value()),
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });
  return google.androidpublisher({ version: 'v3', auth });
}

// ─── Apple App Store Server Notifications v2 webhook ────────────────────────
//
// Configure URL in App Store Connect:
//   App Store Connect → My Apps → Historia → App Information →
//   "App Store Server Notifications" → Production Server URL =
//     https://us-central1-historia-application.cloudfunctions.net/appleAssnWebhook
//
// Apple POSTs a `{ signedPayload: <JWS> }` body. The JWS contains a
// `notificationType` (+ optional subtype) plus signed `transactionInfo` and
// `renewalInfo` JWSes that carry the actual subscription state.

export const appleAssnWebhook = onRequest(
  {
    cors: false,
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: APPLE_SECRETS,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' });
      return;
    }

    const { signedPayload } = (req.body ?? {}) as { signedPayload?: string };
    if (!signedPayload || typeof signedPayload !== 'string') {
      res.status(400).json({ error: 'Missing signedPayload' });
      return;
    }

    try {
      const verifier = buildAppleVerifier();
      const notification = await verifier.verifyAndDecodeNotification(signedPayload);
      const txInfoRaw = notification.data?.signedTransactionInfo;
      const renewalInfoRaw = notification.data?.signedRenewalInfo;

      const txInfo = txInfoRaw
        ? await verifier.verifyAndDecodeTransaction(txInfoRaw)
        : ({} as any);
      const renewalInfo = renewalInfoRaw
        ? await verifier.verifyAndDecodeRenewalInfo(renewalInfoRaw)
        : ({} as any);

      const originalTransactionId =
        txInfo.originalTransactionId ?? renewalInfo.originalTransactionId;
      if (!originalTransactionId) {
        console.warn('appleAssnWebhook: no originalTransactionId in payload');
        res.status(200).json({ ok: true, ignored: 'no originalTransactionId' });
        return;
      }

      const uid = await findUidByOriginalTransactionId(fs(), originalTransactionId);
      if (!uid) {
        // We have no record of this user. Could be a notification arriving
        // before the client has written the doc — Apple retries for ~3 days,
        // so a 200 here lets them retry. Return 200 instead of 4xx so they
        // back off appropriately.
        console.warn(
          `appleAssnWebhook: no user found for originalTransactionId=${originalTransactionId}`,
        );
        res.status(200).json({ ok: true, ignored: 'unknown originalTransactionId' });
        return;
      }

      const state = appleNotificationToState(
        notification.notificationType ?? '',
        notification.subtype,
        {
          expiresDate: txInfo.expiresDate,
          purchaseDate: txInfo.purchaseDate,
          productId: txInfo.productId,
          originalTransactionId,
          environment: txInfo.environment,
        },
        {
          autoRenewStatus: renewalInfo.autoRenewStatus,
          gracePeriodExpiresDate: renewalInfo.gracePeriodExpiresDate,
        },
      );

      await applyCanonicalState(fs(), uid, state, 'ios');

      console.info(
        `appleAssnWebhook: applied ${notification.notificationType} (${notification.subtype ?? 'no-subtype'}) ` +
          `for uid=${uid} → status=${state.status}`,
      );
      res.status(200).json({ ok: true });
    } catch (err) {
      const isVerificationErr = err instanceof VerificationException;
      console.error(
        `appleAssnWebhook: ${isVerificationErr ? 'verification' : 'fatal'} error`,
        err,
      );
      // Apple expects 200 on verification failure (per docs) so they don't
      // retry forever. But for unexpected errors, 500 lets them retry.
      res.status(isVerificationErr ? 200 : 500).json({
        error: isVerificationErr ? 'verification_failed' : 'internal',
      });
    }
  },
);

// ─── Google Play Real-time Developer Notifications ──────────────────────────
//
// Configure in Play Console:
//   Play Console → Monetization → Setup → Real-time developer notifications
//   Topic: projects/historia-application/topics/google-play-rtdn
//   The Pub/Sub topic must exist; subscribe this Cloud Function to it.
//
// Pub/Sub message body format documented at:
//   https://developer.android.com/google/play/billing/rtdn-reference

export const googlePlayRtdnWebhook = onMessagePublished(
  {
    topic: 'google-play-rtdn',
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: GOOGLE_SECRETS,
  },
  async event => {
    try {
      const decoded = Buffer.from(event.data.message.data, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded) as {
        packageName?: string;
        eventTimeMillis?: string;
        subscriptionNotification?: {
          version?: string;
          notificationType?: number;
          purchaseToken?: string;
          subscriptionId?: string;
        };
        testNotification?: { version?: string };
      };

      // Acknowledge test notifications without doing anything.
      if (parsed.testNotification) {
        console.info('googlePlayRtdnWebhook: test notification received');
        return;
      }

      const sub = parsed.subscriptionNotification;
      if (!sub || !sub.purchaseToken || sub.notificationType == null) {
        console.warn('googlePlayRtdnWebhook: malformed payload', parsed);
        return;
      }

      const uid = await findUidByPurchaseToken(fs(), sub.purchaseToken);
      if (!uid) {
        console.warn(
          `googlePlayRtdnWebhook: no user found for purchaseToken=${sub.purchaseToken.slice(0, 12)}…`,
        );
        return;
      }

      // Pull the canonical state from Google Play to get real expiry / grace.
      const publisher = googlePublisher();
      const result = await publisher.purchases.subscriptionsv2.get({
        packageName: GOOGLE_PLAY_PACKAGE_NAME.value(),
        token: sub.purchaseToken,
      });
      const purchase = result.data as {
        startTime?: string;
        regionCode?: string;
        subscriptionState?: string;
        latestOrderId?: string;
        lineItems?: Array<{
          productId?: string;
          expiryTime?: string;
          autoRenewingPlan?: { autoRenewEnabled?: boolean };
        }>;
        canceledStateContext?: { userInitiatedCancellation?: object };
        testPurchase?: object;
      };

      const lineItem = purchase.lineItems?.[0];
      const eventStatus = googleNotificationTypeToStatus(sub.notificationType);

      const state: CanonicalSubscriptionState = {
        status: eventStatus.status,
        startsAt: purchase.startTime ?? null,
        endsAt: lineItem?.expiryTime ?? null,
        isTrial: false,
        autoRenewStatus: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false,
        environment: purchase.testPurchase ? 'sandbox' : 'production',
        productId: lineItem?.productId ?? sub.subscriptionId ?? null,
        purchaseToken: sub.purchaseToken,
        cancellationReason: eventStatus.cancellationReason ?? null,
        cancellationDate: purchase.canceledStateContext ? new Date().toISOString() : null,
      };

      await applyCanonicalState(fs(), uid, state, 'android');

      console.info(
        `googlePlayRtdnWebhook: applied notificationType=${sub.notificationType} ` +
          `for uid=${uid} → status=${state.status}`,
      );
    } catch (err) {
      console.error('googlePlayRtdnWebhook fatal error', err);
      // Re-throw so Pub/Sub retries.
      throw err;
    }
  },
);

// ─── Receipt validation (purchase + restore) ────────────────────────────────
//
// Called from `subscriptionStore.purchaseUpdatedListener` and
// `subscriptionStore.restorePurchases` immediately after a purchase. Returns
// the canonical state so the client never has to fabricate dates.

interface ValidateReceiptBody {
  userId?: string;
  platform?: Platform;
  productId?: string;
  receipt?: string;                 // iOS: base64 receipt OR a transactionId
  purchaseToken?: string | null;    // Android
  originalTransactionId?: string | null;
}

export const validateReceipt = onRequest(
  {
    cors: true,
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
    secrets: ALL_SECRETS,
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'POST only' });
      return;
    }

    const authHeader = req.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    let authedUid: string | null = null;
    if (match) {
      try {
        const decoded = await admin.auth().verifyIdToken(match[1]);
        authedUid = decoded.uid;
      } catch {
        /* fall through; we'll require body.userId === authedUid below */
      }
    }

    const body = (req.body ?? {}) as ValidateReceiptBody;
    if (!body.userId || !body.platform || !body.productId) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    if (authedUid && body.userId !== authedUid) {
      res.status(403).json({ error: 'userId mismatch with authenticated user' });
      return;
    }

    try {
      let state: CanonicalSubscriptionState;
      if (body.platform === 'ios') {
        state = await validateApple(body);
      } else {
        state = await validateGoogle(body);
      }

      await applyCanonicalState(fs(), body.userId, state, body.platform);

      res.status(200).json({
        startsAt: state.startsAt ?? new Date().toISOString(),
        endsAt: state.endsAt ?? new Date().toISOString(),
        isTrial: state.isTrial,
        autoRenewStatus: state.autoRenewStatus,
        environment: state.environment,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('validateReceipt fatal error', msg);
      res.status(500).json({ error: 'validation_failed', detail: msg });
    }
  },
);

async function validateApple(body: ValidateReceiptBody): Promise<CanonicalSubscriptionState> {
  if (!body.receipt && !body.originalTransactionId) {
    throw new Error('Apple validation requires receipt or originalTransactionId');
  }

  const apple = buildAppleClient();

  // Prefer originalTransactionId (more reliable); fall back to extracting it
  // from the base64 receipt blob.
  let originalTransactionId = body.originalTransactionId ?? null;
  if (!originalTransactionId && body.receipt) {
    const ru = new ReceiptUtility();
    originalTransactionId = ru.extractTransactionIdFromAppReceipt(body.receipt);
  }
  if (!originalTransactionId) {
    throw new Error('Could not determine originalTransactionId');
  }

  const subStatuses = await apple.getAllSubscriptionStatuses(originalTransactionId);
  const items = subStatuses.data ?? [];
  // Pick the most recent transaction for our product.
  let bestTx: any = null;
  let bestRenewal: any = null;
  for (const group of items) {
    for (const last of group.lastTransactions ?? []) {
      const txInfoJws = last.signedTransactionInfo;
      const renewalJws = last.signedRenewalInfo;
      if (!txInfoJws) continue;
      const verifier = buildAppleVerifier();
      const tx: any = await verifier.verifyAndDecodeTransaction(txInfoJws);
      const ren: any = renewalJws
        ? await verifier.verifyAndDecodeRenewalInfo(renewalJws)
        : {};
      if (tx.productId !== body.productId) continue;
      if (!bestTx || (tx.expiresDate ?? 0) > (bestTx.expiresDate ?? 0)) {
        bestTx = tx;
        bestRenewal = ren;
      }
    }
  }
  if (!bestTx) {
    throw new Error('No matching subscription found for productId');
  }

  const env: 'production' | 'sandbox' =
    bestTx.environment === 'Sandbox' ? 'sandbox' : 'production';
  const startsAt = msToIso(bestTx.purchaseDate);
  const endsAt = msToIso(bestTx.expiresDate);
  const grace = msToIso(bestRenewal?.gracePeriodExpiresDate);
  const isTrial = bestTx.offerType === 1; // 1 = introductory offer (free trial)
  const status =
    endsAt && new Date(endsAt) <= new Date()
      ? 'expired'
      : isTrial
        ? 'trial'
        : 'active';

  return {
    status,
    startsAt,
    endsAt,
    isTrial,
    autoRenewStatus: bestRenewal?.autoRenewStatus !== 0,
    environment: env,
    productId: bestTx.productId,
    originalTransactionId,
    gracePeriodExpiresDate: grace,
  };
}

async function validateGoogle(body: ValidateReceiptBody): Promise<CanonicalSubscriptionState> {
  if (!body.purchaseToken) {
    throw new Error('Google validation requires purchaseToken');
  }
  const publisher = googlePublisher();
  const result = await publisher.purchases.subscriptionsv2.get({
    packageName: GOOGLE_PLAY_PACKAGE_NAME.value(),
    token: body.purchaseToken,
  });
  const purchase = result.data as any;
  const lineItem = purchase.lineItems?.[0];
  const isActive = purchase.subscriptionState === 'SUBSCRIPTION_STATE_ACTIVE';
  const isPaused = purchase.subscriptionState === 'SUBSCRIPTION_STATE_PAUSED';
  const inGrace = purchase.subscriptionState === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD';
  const isOnHold = purchase.subscriptionState === 'SUBSCRIPTION_STATE_ON_HOLD';

  const status: CanonicalSubscriptionState['status'] =
    isPaused || isOnHold
      ? 'expired'
      : isActive || inGrace
        ? 'active'
        : 'expired';

  return {
    status,
    startsAt: purchase.startTime ?? null,
    endsAt: lineItem?.expiryTime ?? null,
    isTrial: false,
    autoRenewStatus: lineItem?.autoRenewingPlan?.autoRenewEnabled ?? false,
    environment: purchase.testPurchase ? 'sandbox' : 'production',
    productId: lineItem?.productId ?? body.productId ?? null,
    purchaseToken: body.purchaseToken,
  };
}
