'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';
import { LINKS } from '@/lib/site';
import LineHeading from './LineHeading';
import Magnetic from './Magnetic';

export default function FinalCta() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-par]').forEach((el) => {
          const s = parseFloat(el.dataset.par ?? '0');
          gsap.fromTo(el, { yPercent: -s }, { yPercent: s, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <section ref={root} className="relative overflow-hidden bg-ink py-32 text-white lg:py-48">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div data-par="22" className="absolute -right-10 top-10 h-72 w-56 rotate-6 bg-canary shadow-sheet sm:right-[8%] lg:h-96 lg:w-72" />
        <div data-par="40" className="absolute -right-24 top-40 h-72 w-56 -rotate-3 bg-pink shadow-sheet sm:right-[2%] lg:h-96 lg:w-72" />
        <div data-par="12" className="absolute right-[18%] top-24 hidden h-80 w-60 rotate-[-9deg] bg-sheet shadow-sheet lg:block" />
      </div>
      <div className="relative mx-auto max-w-[88rem] px-5 sm:px-8">
        <LineHeading lines={['Start with', 'one workspace.']} tone="light" className="text-[clamp(3.4rem,8vw,8rem)]" />
        <p className="mt-8 max-w-md text-lg text-white/80">Create it, add your team, and enter your first order.</p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Magnetic href={LINKS.signup} className="btn bg-sheet text-carbon hover:bg-canary">
            Create a workspace
          </Magnetic>
          <a href={LINKS.login} className="btn border border-white/60 text-white hover:bg-white/10">
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}
