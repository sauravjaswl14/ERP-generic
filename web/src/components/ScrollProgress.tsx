'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';

/** A thin ballpoint line across the top that fills as you read down the page. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo(
        bar.current,
        { scaleX: 0 },
        { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'max', scrub: 0.2 } },
      );
    });
    return () => mm.revert();
  });
  return <div ref={bar} aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left scale-x-0 bg-ink motion-reduce:hidden" />;
}
