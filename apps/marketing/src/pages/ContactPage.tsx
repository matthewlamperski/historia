import { useState } from 'react';
import { SITE } from '../config/site';

type EmailKey = keyof typeof SITE.emails;

const CONTACT_OPTIONS: Array<{
  key: EmailKey;
  label: string;
  description: string;
}> = [
  {
    key: 'contact',
    label: 'Contact',
    description:
      'Questions, story ideas, partnership notes, or a landmark you think we’re missing.',
  },
  {
    key: 'support',
    label: 'Subscription help',
    description:
      'Billing questions or trouble with your Historia Pro subscription. Cancel or change your plan in your phone’s subscription settings (App Store on iOS, Play Store on Android).',
  },
  {
    key: 'press',
    label: 'Press',
    description:
      'Press inquiries, interviews, and partnership opportunities for museums, historic sites, and Made-in-USA shops.',
  },
];

export default function ContactPage() {
  const [copiedKey, setCopiedKey] = useState<EmailKey | null>(null);

  async function copy(key: EmailKey, email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore — fall back to mailto
    }
  }

  return (
    <section className="container-narrow py-20 md:py-28">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
        Contact
      </p>
      <h1 className="mt-3 font-serif text-5xl font-bold text-primary-900 md:text-6xl">
        Send us a postcard.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-gray-700">
        Questions, story ideas, partnership notes, or a landmark you think
        we&rsquo;re missing—we read every message. Reach the right inbox below.
      </p>

      <div className="mt-12 space-y-6">
        {CONTACT_OPTIONS.map(({ key, label, description }) => {
          const email = SITE.emails[key];
          const isCopied = copiedKey === key;
          return (
            <div
              key={key}
              className="rounded-3xl border border-primary-100 bg-white p-8 shadow-soft md:p-10"
            >
              <h2 className="font-serif text-2xl font-semibold text-primary-900">
                {label}
              </h2>
              <p className="mt-3 text-base text-gray-700">{description}</p>

              <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <a
                  href={`mailto:${email}`}
                  className="rounded-xl border border-primary-200 bg-primary-50 px-5 py-3 font-mono text-base text-primary-900 hover:bg-primary-100"
                >
                  {email}
                </a>
                <button
                  type="button"
                  onClick={() => copy(key, email)}
                  className="btn-secondary"
                  aria-live="polite"
                >
                  {isCopied ? 'Copied ✓' : 'Copy address'}
                </button>
                <a href={`mailto:${email}`} className="btn-primary">
                  Open in mail
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
