'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';

/**
 * Headline whose lines rise out of a mask as it enters the viewport. Each line is given explicitly
 * so the break never depends on the viewport; the accessible name is the whole sentence.
 */
export default function LineHeading({
  lines,
  as: Tag = 'h2',
  className = '',
  tone = 'dark',
}: {
  lines: string[];
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
  tone?: 'dark' | 'light';
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from('[data-line]', {
          yPercent: 108,
          duration: 1,
          ease: 'power4.out',
          stagger: 0.09,
          scrollTrigger: { trigger: ref.current, start: 'top 88%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} aria-label={lines.join(' ')} className={`display-md ${tone === 'light' ? 'text-white' : 'text-carbon'} ${className}`}>
      {lines.map((l) => (
        <span key={l} aria-hidden className="-mb-[0.1em] block overflow-hidden pb-[0.1em]">
          <span data-line className="block">
            {l}
          </span>
        </span>
      ))}
    </Tag>
  );
}
