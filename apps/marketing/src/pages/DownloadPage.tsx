import StoreButtons from '../components/StoreButtons';
import { SITE, isPlaceholder } from '../config/site';

export default function DownloadPage() {
  return (
    <>
      <section className="container-narrow py-20 text-center md:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          Get the app
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold text-primary-900 md:text-6xl">
          Bring Historia on the road.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-700">
          Available on iPhone and Android. {SITE.pricing.trialDays}-day free
          trial. {SITE.pricing.pro} after, cancel anytime.
        </p>

        <div className="mt-10 flex justify-center">
          <StoreButtons size="lg" align="center" />
        </div>

        {(isPlaceholder(SITE.appStoreUrl) || isPlaceholder(SITE.playStoreUrl)) && (
          <p className="mt-6 text-sm italic text-gray-600">
            Store links are being finalized — check back soon.
          </p>
        )}
      </section>

      <section className="container-wide py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <PlatformCard
            title="iPhone"
            subtitle="iOS 16 and later"
            note="Works on iPhone and iPad. Universal Links route shared landmarks straight into the app."
            iconLetter="i"
          />
          <PlatformCard
            title="Android"
            subtitle="Android 10 and later"
            note="Material You theme support. Background location permission used only when checking in to a landmark."
            iconLetter="A"
          />
        </div>
      </section>

      <section className="container-narrow py-16">
        <h2 className="font-serif text-3xl font-bold text-primary-900">
          What you get with Historia Pro
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {PRO_FEATURES.map((f) => (
            <li
              key={f.title}
              className="flex gap-4 rounded-2xl border border-primary-100 bg-white p-5 shadow-soft"
            >
              <div
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-100 text-primary-800"
              >
                <CheckIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-primary-900">{f.title}</p>
                <p className="mt-1 text-sm text-gray-700">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

const PRO_FEATURES = [
  { title: 'Points on every visit', text: 'Verified check-ins, posts with photos and videos, and referrals all earn points.' },
  { title: 'Achievement coins & levels', text: 'Climb 9 named levels, each with a unique coin and unlockable reward.' },
  { title: 'Made-in-USA rewards', text: 'Trade points for shophistoria.com gear—shirts, tumblers, gift cards, museum tours.' },
  { title: 'Unlimited Ask Bede', text: 'AI guide to every landmark. 200+ messages a day, well past what anyone needs.' },
  { title: 'Unlimited bookmarks', text: 'Save every site you want to visit, with no cap.' },
  { title: 'Offline maps', text: 'Download regions for road trips with no cell service.' },
  { title: 'Gratitude Reflections', text: 'Personal journal entries tied to your visits — only you ever see them.' },
  { title: 'Private community', text: 'Exclusive Reddit space for Pro members to swap stories and routes.' },
];

function PlatformCard({
  title,
  subtitle,
  note,
  iconLetter,
}: {
  title: string;
  subtitle: string;
  note: string;
  iconLetter: string;
}) {
  return (
    <div className="card flex items-start gap-5">
      <div
        aria-hidden
        className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary-100 font-serif text-2xl font-bold text-primary-800"
      >
        {iconLetter}
      </div>
      <div>
        <h3 className="font-serif text-xl font-semibold text-primary-900">{title}</h3>
        <p className="mt-1 text-sm text-primary-700">{subtitle}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{note}</p>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
