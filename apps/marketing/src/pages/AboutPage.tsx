import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <>
      <section className="container-narrow py-20 md:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
          About
        </p>
        <h1 className="mt-3 font-serif text-5xl font-bold leading-tight text-primary-900 md:text-6xl">
          We're building a more grateful world—one historic marker at a time.
        </h1>
        <p className="mt-8 max-w-3xl text-xl leading-relaxed text-gray-700">
          Historia began as a question: what if the most engaging app on your
          phone was the one that pulled you out the door? What if the algorithm
          wasn't a feed, but a map of the country you live in?
        </p>
      </section>

      <section className="container-narrow grid gap-10 pb-16 md:grid-cols-2 md:gap-16">
        <Block title="The mission">
          <p>
            Historia is a movement to honor American history and inspire
            lifelong learning. The app is one piece. <em>shophistoria.com</em>—
            our marketplace for Made-in-USA goods—is another. Both fund the
            work, both point the same direction: real-world exploration over
            virtual escape.
          </p>
        </Block>
        <Block title="The principles">
          <ul className="list-disc space-y-2 pl-6">
            <li>Real World &gt; Virtual World.</li>
            <li>No algorithm. No likes. No follower counts.</li>
            <li>Companions, not friends—people you actually share the road with.</li>
            <li>Every reward we give is something we'd be proud to receive.</li>
          </ul>
        </Block>
        <Block title="The economy">
          <p>
            Visit a landmark, post about a place you love, refer someone who
            wants to come along. Every action earns you points. Points unlock
            real rewards on shophistoria.com—shirts, tumblers, gift cards,
            museum tours. The more you explore, the more we send your way.
          </p>
        </Block>
        <Block title="The team">
          <p>
            Historia is built by a small team of explorers, history buffs, and
            engineers who believe technology should serve a life, not be one.
          </p>
          <p className="mt-4 italic text-primary-700">
            — Want to reach us?{' '}
            <Link to="/contact" className="underline decoration-primary-300 hover:text-primary-900">
              Send a note
            </Link>
            .
          </p>
        </Block>
      </section>

      <section className="container-wide pb-24">
        <div className="rounded-3xl border border-primary-100 bg-white p-10 shadow-soft md:p-16">
          <p className="font-serif text-2xl italic leading-relaxed text-primary-900 md:text-3xl">
            "We don't think of Historia as a social platform. It's a guide to
            the country, a way to remember who came before us, and a small bet
            that gratitude—paid forward in points and miles—is more durable
            than any feed."
          </p>
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-primary-700">
            — The Historia team
          </p>
        </div>
      </section>
    </>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-serif text-3xl font-semibold text-primary-900">{title}</h2>
      <div className="prose-historia mt-4 [&>p]:my-3">{children}</div>
    </div>
  );
}
