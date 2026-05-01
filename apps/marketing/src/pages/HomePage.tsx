import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import StoreButtons from '../components/StoreButtons';
import { SITE } from '../config/site';

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(1200px 600px at 70% -10%, rgba(146, 127, 97, 0.18), transparent 60%), linear-gradient(180deg, #f7f3ee 0%, #f0ebe3 100%)',
          }}
        />
        <div className="container-wide grid items-center gap-12 py-20 md:grid-cols-2 md:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-700 shadow-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Historia Pro {SITE.pricing.trialDays}-day free trial · then {SITE.pricing.pro}
            </span>
            <h1 className="mt-6 font-serif text-5xl font-bold leading-[1.05] tracking-tight text-primary-900 md:text-6xl">
              Turn adventure into <em className="text-primary-600">rewards</em> by
              exploring American history together.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-gray-700 md:text-xl">
              Historia is a location-based exploration &amp; connection app
              celebrating American history. Discover historic sites, museums,
              and manufacturers, meet new people, and earn points &amp; rewards
              along the way.
            </p>
            <div className="mt-8">
              <StoreButtons size="lg" />
            </div>
            <p className="mt-4 text-sm text-gray-600">
              Free to start. No algorithm. No &lsquo;likes.&rsquo; Real
              interactions, rooted in gratitude.
            </p>
          </div>

          {/* App icon mockup */}
          <div className="relative mx-auto max-w-sm md:max-w-none">
            <div
              className="absolute -inset-12 -z-10 rounded-[3rem] blur-2xl"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(closest-side, rgba(146, 127, 97, 0.4), transparent)',
              }}
            />
            <div className="rounded-[2.5rem] bg-white p-6 shadow-soft-xl">
              <img
                src="/app-icon.png"
                alt="Historia app icon"
                className="mx-auto aspect-square w-full max-w-[360px] rounded-[2rem] shadow-soft-lg"
              />
              <div className="mt-6 grid grid-cols-3 gap-3 px-2">
                {[1, 4, 7].map((n) => (
                  <div
                    key={n}
                    className="aspect-square overflow-hidden rounded-2xl bg-primary-50 p-3 ring-1 ring-primary-100"
                  >
                    <img
                      src={`/assets/achievements/${n}.png`}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PILLAR FEATURES */}
      <section className="container-wide py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
            Why Historia
          </p>
          <h2 className="mt-3 font-serif text-4xl font-bold text-primary-900 md:text-5xl">
            Built for exploration, not for scrolling.
          </h2>
          <p className="mt-4 text-lg text-gray-700">
            We engineer for maximum real world time. Not maximum screen time.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          <Feature
            title="A map of America's history"
            text="Tens of thousands of national landmarks, museums, monuments, battlefields, and historic sites—on a single offline-capable map."
            badge="Discover"
          />
          <Feature
            title="Earn on every visit"
            text={
              <>
                Verified check-ins, posts &amp; photos, and friends you refer all
                earn points. Climb all 9 levels and unlock real-world perks like
                discounts and gift cards at{' '}
                <a
                  href={SITE.shopUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-700 underline underline-offset-2 hover:text-primary-900"
                >
                  shophistoria.com
                </a>
                .
              </>
            }
            badge="Reward"
          />
          <Feature
            title="Ask Bede, your AI guide"
            text="Tap any landmark to ask Bede—our LLM-powered guide—why it matters. Stories on demand, written like a letter from a friend."
            badge="Learn"
          />
        </div>
      </section>

      {/* PROOF: LEVELS BAND */}
      <section className="bg-primary-900 text-cream">
        <div className="container-wide py-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-300">
                Nine levels. Real perks.
              </p>
              <h2 className="mt-3 font-serif text-4xl font-bold leading-tight text-cream md:text-5xl">
                Climb from Initiate to Eternal&nbsp;Steward.
              </h2>
              <p className="mt-5 max-w-lg text-lg text-primary-100">
                Each level unlocks a new challenge coin and a new reward—a 15%
                shop discount, a Tervis tumbler, a $50 gift card, even a museum
                tour. Every coin you earn supports American history.
              </p>
              <div className="mt-8">
                <Link to="/download" className="btn-primary">
                  Start your climb
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 md:grid-cols-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <div
                  key={n}
                  className="group relative aspect-square overflow-hidden rounded-2xl bg-primary-800 p-4 ring-1 ring-primary-700 transition hover:ring-primary-400"
                >
                  <img
                    src={`/assets/achievements/${n}.png`}
                    alt={`Level ${n} coin`}
                    className="h-full w-full object-contain transition group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="container-narrow py-24">
        <div className="rounded-3xl border border-primary-100 bg-white p-10 shadow-soft md:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
            Gratitude Media
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-primary-900 md:text-4xl">
            A Feed Built on Gratitude, Not Attention.
          </h2>
          <div className="mt-6 space-y-5 text-lg text-gray-700">
            <p>
              Historia isn&rsquo;t another social network. There&rsquo;s no
              infinite feed or algorithm. No &lsquo;likes.&rsquo; No follower
              counts. We call it &lsquo;Gratitude Media:&rsquo; a refreshing
              space to amplify thankfulness through learned insights, fostering
              genuine interactions with thoughtful comments and direct messages
              to plan meetups and real world adventures together.
            </p>
            <p>
              Post moments from your visits, reflect on learned lessons with a
              personal gratitude journal for each site, and inspire others with
              uplifting content and authentic stories that build a more grateful
              world.
            </p>
          </div>
          <div className="mt-8">
            <Link to="/about" className="btn-secondary">
              Read our story
            </Link>
          </div>
        </div>
      </section>

      {/* FIND COMPANIONS */}
      <section className="container-narrow pb-12">
        <div className="rounded-3xl border border-primary-100 bg-primary-50/60 p-10 shadow-soft md:p-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
            Find Companions
          </p>
          <h2 className="mt-3 font-serif text-3xl font-bold text-primary-900 md:text-4xl">
            Build lasting connections and find true &lsquo;companions&rsquo;
            through shared adventure.
          </h2>
          <div className="mt-6 space-y-5 text-lg text-gray-700">
            <p>
              It&rsquo;s harder than ever to meet people and build genuine
              friendships. Historia changes that. You share the same
              inspirational values of self-improvement, gratitude, and lifelong
              learning. That means you&rsquo;re not just &lsquo;friends,&rsquo;
              you&rsquo;re &lsquo;companions&rsquo; now.
            </p>
            <p>
              Invite your family, friends, and &lsquo;companions&rsquo; to plan
              itineraries, meet up, and celebrate discoveries together out in
              the real world, not virtual. Great adventure and connections start
              here.
            </p>
          </div>
          <div className="mt-8">
            <StoreButtons size="lg" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-wide pb-16">
        <div className="overflow-hidden rounded-3xl bg-primary-100 p-10 md:p-16">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-serif text-4xl font-bold text-primary-900 md:text-5xl">
                Start your Historia adventure today.
              </h2>
              <p className="mt-3 font-serif text-xl italic text-primary-700 md:text-2xl">
                180-day money-back guarantee.
              </p>
              <p className="mt-5 max-w-2xl text-lg text-gray-700">
                Basic: Free forever. Historia Pro: Free for{' '}
                {SITE.pricing.trialDays} days, then {SITE.pricing.pro}. Cancel
                anytime in your phone settings.
              </p>
              <p className="mt-4 max-w-2xl text-base text-gray-700">
                If after 180 days you don&rsquo;t feel more connected, more
                grateful, and more inspired by America&rsquo;s history, you&rsquo;ll
                get your money back no questions asked.
              </p>
            </div>
            <StoreButtons size="lg" />
          </div>
        </div>
      </section>
    </>
  );
}

function Feature({
  title,
  text,
  badge,
}: {
  title: string;
  text: ReactNode;
  badge: string;
}) {
  return (
    <div className="card transition hover:-translate-y-0.5 hover:shadow-soft-md">
      <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-700">
        {badge}
      </span>
      <h3 className="mt-4 font-serif text-2xl font-semibold text-primary-900">
        {title}
      </h3>
      <p className="mt-3 text-base leading-relaxed text-gray-700">{text}</p>
    </div>
  );
}
