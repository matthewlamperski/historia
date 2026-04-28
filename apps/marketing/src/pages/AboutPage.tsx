import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="container-narrow py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          About
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold leading-tight text-primary-900 md:text-6xl">
          Honor History Together
        </h1>
        <p className="mt-4 font-serif text-2xl italic text-primary-700 md:text-3xl">
          Exploring America's past to build a more grateful future.
        </p>
      </section>

      {/* Our Origin Story */}
      <section className="container-narrow pb-16">
        <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
          Our Origin Story
        </h2>
        <div className="prose-historia mt-6 space-y-6 text-lg leading-relaxed text-gray-700">
          <p>
            We started Historia because we want to help people discover incredible
            American history by visiting historic sites, museums, and American
            makers. As avid explorers of our nation's past—from battlefields to
            iconic landmarks to workshops—we saw something was broken: today's
            social platforms are built to trap you in endless scrolling, chasing
            likes and notifications for as long as possible.
          </p>
          <p>
            Historia's the exact opposite. We created an app engineered to pull
            you out of the digital world and into the real one. Historia exists
            to help you discover, visit, connect, and reflect over America's
            living heritage. You won't find any "friends," "likes," or addictive,
            algorithmic feeds here. Just tools that get you out and exploring in
            order to spark lifelong learning, gratitude, and joy within you.
          </p>
        </div>
      </section>

      {/* Why "Honoring History Together" Drives Everything */}
      <section className="container-narrow pb-20">
        <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
          Why "Honoring History Together" drives everything we do
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Pillar title="Authentic Discovery">
            We highlight real places that tell America's story: museums packed
            with artifacts, historic sites where pivotal events unfolded, and
            American makers carrying forward generations of skill and innovation.
          </Pillar>
          <Pillar title="Gratitude at the Core">
            Every visit, post, or shared adventure becomes a chance to pause,
            appreciate, and feel thankful for the resilience and fortitude that
            built our nation.
          </Pillar>
          <Pillar title="Shared Legacy">
            When you add companions, you build connections grounded in common
            values and you actively keep history alive and pass it forward.
          </Pillar>
        </div>
      </section>

      {/* Our Promise */}
      <section className="bg-primary-50/60 py-20">
        <div className="container-narrow">
          <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
            Our Promise: built to inspire adventure, connection, and gratitude
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <Pillar title="Real World First">
              We intentionally limit in-app time with minimal notifications, no
              like counters, and features that guide you to offline experiences—
              GPS check-ins, meetup planning, gratitude reflections. The goal:
              spend way more time at historic sites than staring at your screen.
            </Pillar>
            <Pillar title="Genuine Over Artificial">
              We replaced superficial likes with thoughtful comments, direct
              messages, and real-world meetups—because lasting bonds form
              through shared adventures, not a virtual thumbs up.
            </Pillar>
            <Pillar title="Gratitude Media in Action">
              This isn't another social app. It's a space for uplifting stories
              from actual explorations that inspire thankfulness and deeper
              appreciation—no algorithms deciding what you see.
            </Pillar>
          </div>
        </div>
      </section>

      {/* How We Create the Historia Experience */}
      <section className="container-narrow py-20">
        <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
          How we create the Historia experience
        </h2>
        <div className="mt-10 space-y-4">
          <Step
            number="1"
            title="Curate & Map"
            what="Research and organize thousands of museums, historic sites, and American makers with important details."
            why="Makes finding meaningful destinations simple and exciting."
          />
          <Step
            number="2"
            title="Enable Connections"
            what="Add companions to collaborate on plans, coordinate meetups, and share journeys with people who share your passion for history and growth."
            why="Turns solo curiosity into shared, memorable experiences and real friendships & relationships."
          />
          <Step
            number="3"
            title="Reward Real Effort"
            what="Give points for verified visits (+20), meaningful posts (+5), videos (+3), and photos (+1), letting you level up and unlock badges, exclusive guides, partner perks, and more."
            why="Makes every outing feel purposeful, building your personal legacy while celebrating America's."
          />
          <Step
            number="4"
            title="Foster Reflection"
            what="Write in your own personal Gratitude Journal and encourage posts focused on gratitude and insight, creating a feed of inspiration rather than noise."
            why="Helps users (and the community) grow more appreciative and connected to the past."
          />
        </div>
      </section>

      {/* The Impact */}
      <section className="container-narrow pb-20">
        <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
          The impact of joining Historia
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Pillar title="More Time Outdoors">
            You'll spend significantly more hours exploring than in the app—
            rediscovering America's heritage one adventure at a time.
          </Pillar>
          <Pillar title="Giving Back to History">
            We donate 5% of our annual profits to museums, preservation efforts,
            and historic organizations in our home state of Ohio.
          </Pillar>
          <Pillar title="A Purposeful Community">
            You're part of a network of explorers who prioritize lifelong
            learning, self-improvement, gratitude, and authentic relationships—
            helping create a world that remembers and honors its roots.
          </Pillar>
        </div>
      </section>

      {/* Join the Movement */}
      <section className="container-wide pb-24">
        <div className="rounded-3xl border border-primary-100 bg-white p-10 shadow-soft md:p-16">
          <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
            Join the movement
          </h2>
          <div className="prose-historia mt-6 space-y-6 text-lg leading-relaxed text-gray-700">
            <p>
              Picture this: you're interested in Civil War history, or even
              better, you're just getting started on your history journey by
              having watched Ken Burns' Civil War documentary. You open the app
              and search "Civil War Battlefield" and see one just a 45-minute
              drive from where you live. You plan out a mostly spontaneous
              visit, and while you're there you put yourself in the shoes of
              those young soldiers who put their life on the line for a cause
              they believed in.
            </p>
            <p>
              You open Historia again to write a quick personal reflection and
              post. That post in turn levels up your Historia status, but more
              importantly sparks gratitude within yourself and in others—feeling
              more joyful and connected to America's story than ever before.
              That's Historia.
            </p>
            <p>
              Download the app today and start with our 14-day free trial of
              Historia Pro—unlock ad-free access, advanced mapping, exclusive
              content, and more. Backed by our 180-day money-back guarantee: if
              Historia doesn't leave you feeling more grateful, inspired,
              connected, and eager to explore after 180 days, we'll refund you
              entirely, no questions asked.
            </p>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link to="/download" className="btn-primary">
              Get the app today
            </Link>
            <Link
              to="/faq"
              className="text-sm font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-900"
            >
              Read the FAQ
            </Link>
          </div>
          <p className="mt-8 font-serif italic text-primary-700">
            Let's honor history together to build a more grateful world.
          </p>
        </div>
      </section>
    </>
  );
}

function Pillar({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-soft">
      <h3 className="font-serif text-xl font-semibold text-primary-900">
        {title}
      </h3>
      <p className="mt-3 leading-relaxed text-gray-700">{children}</p>
    </div>
  );
}

function Step({
  number,
  title,
  what,
  why,
}: {
  number: string;
  title: string;
  what: string;
  why: string;
}) {
  return (
    <div className="flex gap-5 rounded-2xl border border-primary-100 bg-white p-6 shadow-soft md:gap-8 md:p-8">
      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary-100 font-serif text-xl font-bold text-primary-900 md:h-14 md:w-14">
        {number}
      </div>
      <div className="flex-1">
        <h3 className="font-serif text-xl font-semibold text-primary-900 md:text-2xl">
          {title}
        </h3>
        <p className="mt-3 leading-relaxed text-gray-700">{what}</p>
        <p className="mt-2 text-sm italic text-primary-700">{why}</p>
      </div>
    </div>
  );
}
