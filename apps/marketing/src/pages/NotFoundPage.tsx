import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="container-narrow py-32 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">
        404
      </p>
      <h1 className="mt-3 font-serif text-5xl font-bold text-primary-900 md:text-6xl">
        Off the map.
      </h1>
      <p className="mx-auto mt-6 max-w-md text-lg text-gray-700">
        That page doesn't exist—or it never did. Try one of these instead.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/" className="btn-primary">Home</Link>
        <Link to="/blog" className="btn-secondary">Blog</Link>
        <Link to="/download" className="btn-secondary">Download</Link>
      </div>
    </section>
  );
}
