import { SITE } from '@/lib/site';

/** Three stacked sheets with a ballpoint tick: the product idea as a mark. */
export function Mark({ className = 'h-7 w-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="9" y="9" width="18" height="18" rx="1.5" fill="#F2B2C3" />
      <rect x="6" y="6" width="18" height="18" rx="1.5" fill="#F6E27B" />
      <rect x="3" y="3" width="18" height="18" rx="1.5" fill="#FDFDFB" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 12l3.2 3.2L16.5 8.5" fill="none" stroke="#1630D0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark />
      <span className="display-md text-[1.55rem] leading-none">{SITE.name}</span>
    </span>
  );
}
