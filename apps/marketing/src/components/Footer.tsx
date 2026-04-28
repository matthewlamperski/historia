import { Link } from 'react-router-dom';
import Logo from './Logo';
import { SITE } from '../config/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-primary-100 bg-primary-50/60">
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo size={28} />
            <p className="mt-4 max-w-sm text-sm text-gray-700">
              {SITE.tagline} Discover historical landmarks across America, earn
              real rewards on every visit, and trade screen time for the road.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-700">
              Explore
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-700 hover:text-primary-900">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/download" className="text-gray-700 hover:text-primary-900">
                  Download
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-gray-700 hover:text-primary-900">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-gray-700 hover:text-primary-900">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-700 hover:text-primary-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary-700">
              Resources
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a
                  href={SITE.shopUrl}
                  className="text-gray-700 hover:text-primary-900"
                  target="_blank"
                  rel="noreferrer"
                >
                  Shop Historia
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-700 hover:text-primary-900">
                  Privacy
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-700 hover:text-primary-900">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-primary-100 pt-6 text-xs text-gray-600 md:flex-row md:items-center">
          <p>© {year} Historia. Made for the road.</p>
          <p className="font-serif italic text-primary-700">
            Real World &gt; Virtual World.
          </p>
        </div>
      </div>
    </footer>
  );
}
