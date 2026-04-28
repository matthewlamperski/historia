import { SITE, isPlaceholder } from '../config/site';

interface StoreButtonsProps {
  size?: 'md' | 'lg';
  align?: 'start' | 'center';
}

export default function StoreButtons({ size = 'md', align = 'start' }: StoreButtonsProps) {
  const padding = size === 'lg' ? 'px-7 py-4' : 'px-5 py-3';
  const wrap =
    align === 'center'
      ? 'flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:justify-center'
      : 'flex flex-col items-start gap-3 sm:flex-row sm:items-center';

  return (
    <div className={wrap}>
      <StoreLink
        href={SITE.appStoreUrl}
        label="Download on the"
        store="App Store"
        padding={padding}
        Icon={AppleIcon}
      />
      <StoreLink
        href={SITE.playStoreUrl}
        label="Get it on"
        store="Google Play"
        padding={padding}
        Icon={PlayIcon}
      />
    </div>
  );
}

interface StoreLinkProps {
  href: string;
  label: string;
  store: string;
  padding: string;
  Icon: React.FC<{ className?: string }>;
}

function StoreLink({ href, label, store, padding, Icon }: StoreLinkProps) {
  const placeholder = isPlaceholder(href);

  const content = (
    <>
      <Icon className="h-7 w-7 shrink-0" />
      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] uppercase tracking-wide opacity-80">
          {label}
        </span>
        <span className="mt-0.5 text-base font-semibold tracking-tight">
          {store}
        </span>
      </div>
    </>
  );

  const baseClass = `inline-flex items-center gap-3 rounded-2xl bg-primary-900 text-white ${padding} shadow-soft-md transition hover:bg-primary-800 active:scale-[0.98]`;

  if (placeholder) {
    return (
      <span
        title="Link not yet configured — see TODO.md"
        className={`${baseClass} cursor-not-allowed opacity-70`}
        aria-disabled="true"
      >
        {content}
      </span>
    );
  }

  return (
    <a href={href} className={baseClass} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.36 12.78c-.02-2.36 1.93-3.5 2.02-3.55-1.1-1.61-2.81-1.83-3.42-1.86-1.45-.15-2.84.86-3.58.86-.74 0-1.88-.84-3.1-.82-1.59.02-3.06.92-3.88 2.34-1.66 2.87-.42 7.13 1.19 9.46.79 1.14 1.73 2.43 2.95 2.38 1.19-.05 1.64-.77 3.07-.77 1.43 0 1.84.77 3.1.74 1.28-.02 2.09-1.16 2.87-2.31.91-1.32 1.28-2.61 1.3-2.68-.03-.01-2.49-.95-2.52-3.79zM14.06 5.34c.65-.79 1.09-1.88.97-2.97-.94.04-2.07.62-2.74 1.4-.6.7-1.13 1.81-.99 2.88 1.05.08 2.11-.53 2.76-1.31z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.6 2.18c-.25.21-.4.55-.4.97v17.7c0 .42.15.76.4.97l9.96-9.82L3.6 2.18z" opacity=".9" />
      <path d="M16.5 11.25l2.93-1.66c.78-.44.78-1.34 0-1.78L15.7 5.69 13.56 12l2.94 1.92z" opacity=".7" />
      <path d="M3.6 21.82c.34.28.81.31 1.27.05l13.3-7.55-2.94-2.92L3.6 21.82z" opacity=".85" />
      <path d="M3.6 2.18l11.96 11.78L18.16 12l-13.3-7.55c-.46-.26-.92-.23-1.26.05l.01-.32z" />
    </svg>
  );
}
