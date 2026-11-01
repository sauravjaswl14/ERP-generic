'use client';

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP, MOTION_OK } from '@/lib/gsap';
import { scrollToId } from '@/lib/lenis';
import { LINKS } from '@/lib/site';
import Logo from './Logo';

const NAV = [
  { id: 'flow', label: 'How it works' },
  { id: 'modules', label: 'Modules' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'faq', label: 'Questions' },
];

/** Slides away while you read down, returns the moment you scroll up. */
export default function Header() {
  const ref = useRef<HTMLElement>(null);
  const [solid, setSolid] = useState(false);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      ScrollTrigger.create({
        start: 0,
        end: 'max',
        onUpdate: (self) => {
          setSolid(self.scroll() > 24);
          gsap.to(ref.current, { yPercent: self.direction === 1 && self.scroll() > 320 ? -110 : 0, duration: 0.35, ease: 'power2.out', overwrite: true });
        },
      });
    });
    return () => mm.revert();
  });

  return (
    <header
      ref={ref}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        solid ? 'border-b border-rule bg-chalk/85 backdrop-blur-md' : 'border-b border-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between px-5 sm:px-8">
        <a href="#top" aria-label="Back to top" onClick={(e) => { e.preventDefault(); scrollToId('top'); }}>
          <Logo />
        </a>
        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToId(n.id);
              }}
              className="text-[0.95rem] font-medium text-graphite transition-colors hover:text-carbon"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href={LINKS.login} className="hidden px-2 text-[0.95rem] font-medium text-graphite hover:text-carbon sm:inline">
            Sign in
          </a>
          <a href={LINKS.signup} className="btn btn-ink !px-4 !py-2.5 !text-[0.95rem]">
            Create a workspace
          </a>
        </div>
      </div>
    </header>
  );
}
