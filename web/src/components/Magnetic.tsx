'use client';

import { useRef } from 'react';
import type { ReactNode } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';

/** A link that leans a little toward the pointer. Pointer devices only. */
export default function Magnetic({ href, className = '', children }: { href: string; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(`${MOTION_OK} and (hover: hover)`, () => {
      const el = ref.current;
      if (!el) return;
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - (r.left + r.width / 2)) * 0.22);
        y((e.clientY - (r.top + r.height / 2)) * 0.3);
      };
      const leave = () => {
        x(0);
        y(0);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerleave', leave);
      return () => {
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerleave', leave);
      };
    });
    return () => mm.revert();
  });
  return (
    <a ref={ref} href={href} className={className}>
      {children}
    </a>
  );
}
