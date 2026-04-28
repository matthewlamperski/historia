import { Link } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {backHref && (
          <Link
            to={backHref}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary-600 hover:text-primary-800"
          >
            <span aria-hidden="true">←</span>
            {backLabel}
          </Link>
        )}
        <h1 className="font-serif text-3xl font-bold text-primary-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
