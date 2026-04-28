import { useState } from 'react';
import { SITE, isPlaceholder } from '../config/site';

export default function ContactPage() {
  const [copied, setCopied] = useState(false);
  const placeholder = isPlaceholder(SITE.supportEmail);
  const email = placeholder ? '' : SITE.supportEmail;

  async function copy() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
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
        we're missing—we read every message.
      </p>

      <div className="mt-12 rounded-3xl border border-primary-100 bg-white p-10 shadow-soft md:p-12">
        <h2 className="font-serif text-2xl font-semibold text-primary-900">
          Email us
        </h2>

        {placeholder ? (
          <p className="mt-4 text-sm italic text-gray-600">
            Our support address is being set up. In the meantime, please use
            the in-app feedback form on the Profile tab.
          </p>
        ) : (
          <>
            <p className="mt-4 text-base text-gray-700">
              Drop us a line at the address below. We aim to reply within two
              business days.
            </p>

            <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <a
                href={`mailto:${email}`}
                className="rounded-xl border border-primary-200 bg-primary-50 px-5 py-3 font-mono text-base text-primary-900 hover:bg-primary-100"
              >
                {email}
              </a>
              <button
                type="button"
                onClick={copy}
                className="btn-secondary"
                aria-live="polite"
              >
                {copied ? 'Copied ✓' : 'Copy address'}
              </button>
              <a href={`mailto:${email}`} className="btn-primary">
                Open in mail
              </a>
            </div>
          </>
        )}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <FaqCard
          title="Subscription help"
          body="Cancel or change your plan in your phone's subscription settings (App Store on iOS, Play Store on Android). For billing questions, email support."
        />
        <FaqCard
          title="Press & partnerships"
          body="If you run a museum, historic site, or Made-in-USA shop and want to collaborate, please mention partnership in the subject line."
        />
      </div>
    </section>
  );
}

function FaqCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card">
      <h3 className="font-serif text-xl font-semibold text-primary-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-gray-700">{body}</p>
    </div>
  );
}
