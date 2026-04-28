import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const { signIn, signInWithGoogle, isLoading, error, isAdmin, user } = useAuth();
  const navigate = useNavigate();

  // Redirect once authenticated as admin.
  useEffect(() => {
    if (user && isAdmin) navigate('/', { replace: true });
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src="/logo.png" alt="Historia" className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 font-serif text-3xl font-bold text-primary-900">
            Admin
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in with your admin account.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-error-200 bg-error-50 p-4">
            <p className="text-sm text-error-800">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm font-semibold text-primary-900 shadow-soft transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GoogleG className="h-5 w-5" />
            {isLoading ? 'Signing in…' : 'Continue with Google'}
          </button>

          {!showPwForm && (
            <button
              type="button"
              onClick={() => setShowPwForm(true)}
              className="w-full text-center text-xs text-gray-600 hover:text-primary-700"
            >
              Use email and password instead
            </button>
          )}
        </div>

        {showPwForm && (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-primary-200 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-500">
          Only accounts on the admin allow-list can access this dashboard.
        </p>
      </div>
    </div>
  );
}

function GoogleG({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.95l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.41c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.16 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.34 9.14 5.41 12 5.41z"
      />
    </svg>
  );
}
