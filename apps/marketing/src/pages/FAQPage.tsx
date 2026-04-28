import { Link } from 'react-router-dom';

const SUPPORT_EMAIL = 'hello@explorehistoria.com';

export default function FAQPage() {
  return (
    <>
      {/* Hero */}
      <section className="container-narrow py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          Frequently Asked Questions
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold leading-tight text-primary-900 md:text-6xl">
          Everything you wanted to know about Historia.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-gray-700">
          Can't find your answer below? Reach out at{' '}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-900"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>

      {/* About Historia */}
      <FaqSection title="About Historia">
        <Faq question="What is Historia?">
          <p>
            Historia is the app that helps you discover and explore America's
            museums, historic sites, and manufacturers—while building real
            connections and gratitude and earning rewards along the way. It's
            called <em>"gratitude media"</em> for a reason: media designed to
            inspire thankfulness through honoring and appreciating history.
          </p>
        </Faq>
        <Faq question="How is Historia different from other travel or social apps?">
          <p>
            We flip the script. Social platforms engineer for maximum screen
            time—we engineer for maximum real-world time. No likes & no addictive
            feeds—just tools for discovery, companion planning, genuine
            interactions, and rewards for actual visits and shares.
          </p>
        </Faq>
        <Faq question='What are "companions"?'>
          <p>
            Companions are people that you share adventures with—family,
            friends, or new connections who share your values (gratitude,
            lifelong learning, exploration). Plan itineraries together, meet at
            sites, and build true bonds together. We crossed out "friends" on
            our home page because this is about meaningful, purpose-driven
            relationships—not superficial lists.
          </p>
        </Faq>
      </FaqSection>

      {/* Pricing & Trial */}
      <FaqSection title="Pricing & trial">
        <Faq question="Is Historia free?">
          <p>
            Yes—the core app is free forever (discovery, basic mapping,
            posting). Pro upgrade (via 14-day free trial) adds premium tools for
            deeper exploration at only <strong>$1.99/month</strong>.
          </p>
        </Faq>
        <Faq question="What is the 14-day free trial of Historia Pro?">
          <p>
            New users get a full 14-day free trial of Historia Pro. Unlock
            premium features: ad-free browsing, advanced interactive maps,
            exclusive site guides/content, and more. No credit card required to
            start—just download and start exploring.
          </p>
        </Faq>
        <Faq question="What about the 180-day money-back guarantee?">
          <p>
            If after 180 days of using Historia you don't feel more grateful, or
            inspired to explore—you'd get a full refund, no questions asked. We
            have a feeling no one will be asking for a refund :)
          </p>
        </Faq>
      </FaqSection>

      {/* Points & Levels */}
      <FaqSection title="Points & levels">
        <Faq question="How do points and levels work?">
          <p>
            Earn points through real actions: <strong>+20</strong> for verified
            visits, <strong>+5</strong> per post, <strong>+3</strong> per video,
            and <strong>+1</strong> per photo. Level up (Historia Initiate →
            History Keeper → Patriotic Chronicler and many more) to unlock
            badges, premium perks, partner discounts, and exclusive rewards.
            Build your legacy while honoring history.
          </p>
        </Faq>
      </FaqSection>

      {/* For sites, museums, manufacturers */}
      <FaqSection title="For historic sites, museums & manufacturers">
        <Faq question="How do I get my historic site, museum, or manufacturer listed on Historia?">
          <p>
            We'd love to include your site! Please reach out to{' '}
            <Mail /> with details about your historic site, museum, or
            manufacturing business (including name, address, website, phone
            number, and a brief description), and our team will review your
            submission and place it on our map as soon as possible.
          </p>
        </Faq>
        <Faq question='How does "Featured" placement work, and how do I sign up?'>
          <p>
            Yes! Featured placement gives your site or business a highlighted
            profile and priority visibility to our growing community for{' '}
            <strong>$30/month</strong>. If you're interested in signing up,
            email <Mail />—we'll send more details, benefits, and next steps.
          </p>
        </Faq>
      </FaqSection>

      {/* Feedback & Reviews */}
      <FaqSection title="Feedback & reviews">
        <Faq question="I have an idea, feature request, or feedback. Where do I share it?">
          <p>
            We actively welcome your input to make Historia even better—whether
            it's a feature request, bug report, idea for improvement, or general
            feedback. Reach out to <Mail /> to share!
          </p>
        </Faq>
        <Faq question="I love Historia—where can I leave a review?">
          <p>
            Thank you—that means the world to us! Reviews help spread the word
            and bring more people into real-world exploration.
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong>iPhone / iPad (App Store):</strong> Open the App Store
              app, search for "Historia," scroll to <em>Ratings & Reviews</em>,
              tap <em>Write a Review</em>, select your stars, add your thoughts,
              and submit.
            </li>
            <li>
              <strong>Android (Google Play Store):</strong> Open the Google
              Play Store, search for "Historia," scroll to{' '}
              <em>Rate this app</em>, tap the stars to rate, then tap{' '}
              <em>Write a review</em> to share and submit.
            </li>
          </ul>
          <p className="mt-3">Your feedback fuels our growth—thank you in advance!</p>
        </Faq>
      </FaqSection>

      {/* Privacy & Mission */}
      <FaqSection title="Privacy & mission">
        <Faq question="Is my data private?">
          <p>
            Yes—we have extremely strong privacy practices. We don't sell data
            or use it for ads. See our full Privacy Policy for details.
          </p>
        </Faq>
        <Faq question="How do you support historic preservation?">
          <p>
            We donate <strong>5% of our annual profits</strong> back to museums
            and historic sites in our home state of Ohio. We believe in giving
            back to the heritage we celebrate.
          </p>
        </Faq>
      </FaqSection>

      {/* Getting started */}
      <FaqSection title="Getting started">
        <Faq question="How do I get started?">
          <p>
            Download from the App Store or Google Play Store. Sign up, start
            exploring, add companions, earn points—and enjoy your 14-day
            Historia Pro trial. Questions? Contact us at <Mail />.
          </p>
          <div className="mt-4">
            <Link to="/download" className="btn-primary">
              Get the app
            </Link>
          </div>
        </Faq>
      </FaqSection>

      {/* Closing */}
      <section className="container-wide pb-24">
        <div className="rounded-3xl border border-primary-100 bg-white p-10 text-center shadow-soft md:p-16">
          <h2 className="font-serif text-3xl font-semibold text-primary-900 md:text-4xl">
            Still have questions?
          </h2>
          <p className="mt-4 text-lg text-gray-700">
            We're here to help—reach out anytime at <Mail />.
          </p>
          <p className="mt-6 font-serif italic text-primary-700">
            Let's honor history together.
          </p>
        </div>
      </section>
    </>
  );
}

function FaqSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="container-narrow pb-12 md:pb-16">
      <h2 className="font-serif text-2xl font-semibold text-primary-800 md:text-3xl">
        {title}
      </h2>
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

function Faq({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-primary-100 bg-white p-6 shadow-soft md:p-7">
      <h3 className="font-serif text-lg font-semibold text-primary-900 md:text-xl">
        {question}
      </h3>
      <div className="prose-historia mt-3 leading-relaxed text-gray-700 [&>p]:my-2">
        {children}
      </div>
    </div>
  );
}

function Mail() {
  return (
    <a
      href={`mailto:${SUPPORT_EMAIL}`}
      className="font-medium text-primary-700 underline decoration-primary-300 underline-offset-4 hover:text-primary-900"
    >
      {SUPPORT_EMAIL}
    </a>
  );
}
