import type { ReactNode } from 'react';

export type Tone = 'white' | 'canary' | 'pink';
const TONE: Record<Tone, string> = { white: 'bg-sheet', canary: 'bg-canary', pink: 'bg-pink' };

/** One sheet of a triplicate form set. */
export function Sheet({
  tone,
  title,
  no,
  className = '',
  children,
  ...rest
}: {
  tone: Tone;
  title: string;
  no: string;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={`paper relative p-5 sm:p-6 ${TONE[tone]} ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b-[3px] border-carbon pb-2">
        <h3 className="display-md text-[1.6rem] sm:text-[1.9rem]">{title}</h3>
        <span className="typed whitespace-nowrap pt-1.5 text-[0.7rem] text-graphite">No. {no}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** A labelled line on a form. The value is what was "typed" in, and carries data-type so it can be typed on. */
export function Field({ label, value, strong = false, mark }: { label: string; value: ReactNode; strong?: boolean; mark?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-carbon/20 py-[0.42rem]">
      <span className="text-[0.78rem] leading-tight text-graphite [font-stretch:88%]">{label}</span>
      <span className={`typed text-right text-[0.88rem] leading-tight ${strong ? 'font-medium' : ''}`}>
        <span data-type={mark ?? ''} className="inline-block">
          {value}
        </span>
      </span>
    </div>
  );
}
