'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK, DESKTOP } from '@/lib/gsap';
import { scrollToId } from '@/lib/lenis';
import { LINKS } from '@/lib/site';
import Magnetic from './Magnetic';
import { Field, Sheet } from './Sheet';

const LINE1 = 'Write it once.';

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const q = gsap.utils.selector(root);
        const chars = q('[data-char]');
        const heroEls = q('[data-hero]');
        const sheets = q('[data-sheet]');
        const line1 = q('[data-hero="line1"]');
        const line2 = q('[data-hero="line2"]');
        const base = q('[data-base]');
        const ghosts = q('[data-ghost]');
        const caret = q('[data-caret]');
        const rest = q('[data-hero="sub"], [data-hero="cta"], [data-hero="note"]');
        const sign = q('[data-sign]');

        // Take over from the CSS "hidden until ready" rule, then play the one orchestrated entrance.
        gsap.set(heroEls, { opacity: 0 });
        gsap.set(chars, { opacity: 0 });
        gsap.set(ghosts, { opacity: 0 });
        gsap.set(sign, { strokeDasharray: 1, strokeDashoffset: 1 });
        document.documentElement.classList.add('ready');

        const typeEnd = 0.5 + chars.length * 0.042;
        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to(sheets, { opacity: 1, y: 0, startAt: { y: -110 }, duration: 0.95, stagger: 0.14 }, 0)
          .set(line1, { opacity: 1 }, 0.35)
          .set(caret, { opacity: 1 }, 0.35)
          .to(chars, { opacity: 1, duration: 0.01, stagger: 0.042, ease: 'none' }, 0.5)
          .set(caret, { opacity: 0 }, typeEnd + 0.35)
          .set(line2, { opacity: 1 }, typeEnd + 0.05)
          .fromTo(base, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.95, ease: 'power2.inOut' }, typeEnd + 0.05)
          .to(ghosts, { opacity: 1, duration: 0.5, stagger: 0.14 }, typeEnd + 0.7)
          .to(rest, { opacity: 1, y: 0, startAt: { y: 18 }, duration: 0.8, stagger: 0.1 }, typeEnd + 0.5)
          .to(sign, { strokeDashoffset: 0, duration: 1.1, ease: 'power1.inOut' }, typeEnd + 0.3);

        // The copies drift apart as the hero scrolls away.
        const scrub = { trigger: root.current, start: 'top top', end: 'bottom top', scrub: 0.7 };
        gsap.to('[data-ghost="1"]', { x: 34, y: 30, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-ghost="2"]', { x: 68, y: 60, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-headline]', { y: -50, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-par="back"]', { y: -170, rotation: 4, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-par="mid"]', { y: -95, ease: 'none', scrollTrigger: scrub });
        gsap.to('[data-par="front"]', { y: -35, ease: 'none', scrollTrigger: scrub });
      });

      // Pointer depth: the three sheets follow the cursor by different amounts.
      mm.add(`${MOTION_OK} and ${DESKTOP} and (hover: hover)`, () => {
        const section = root.current;
        if (!section) return;
        const layers = [
          { el: section.querySelector('[data-pointer="back"]'), d: 10 },
          { el: section.querySelector('[data-pointer="mid"]'), d: 20 },
          { el: section.querySelector('[data-pointer="front"]'), d: 34 },
        ].filter((l): l is { el: Element; d: number } => !!l.el);
        const movers = layers.map((l) => ({ ...l, x: gsap.quickTo(l.el, 'x', { duration: 0.9, ease: 'power3' }), y: gsap.quickTo(l.el, 'y', { duration: 0.9, ease: 'power3' }) }));
        const move = (e: PointerEvent) => {
          const nx = e.clientX / window.innerWidth - 0.5;
          const ny = e.clientY / window.innerHeight - 0.5;
          movers.forEach((m) => {
            m.x(-nx * m.d);
            m.y(-ny * m.d);
          });
        };
        section.addEventListener('pointermove', move);
        return () => section.removeEventListener('pointermove', move);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="top" className="relative isolate overflow-hidden pb-24 pt-28 lg:pb-32 lg:pt-32">
      <div className="mx-auto grid max-w-[88rem] items-center gap-y-16 px-5 sm:px-8 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-12">
        <div className="relative z-10 lg:col-span-7">
          <h1 data-headline aria-label="Write it once. Every department gets a copy." className="display text-[clamp(3.9rem,12.4vw,10.5rem)] lg:text-[clamp(4rem,8.4vw,9rem)]">
            <span data-hero="line1" aria-hidden className="block whitespace-nowrap">
              {LINE1.split('').map((c, i) => (
                <span key={i} data-char className="inline-block">
                  {c === ' ' ? ' ' : c}
                </span>
              ))}
              <span data-caret aria-hidden className="ml-1 inline-block h-[0.78em] w-[0.07em] translate-y-[0.06em] bg-ink align-baseline opacity-0" />
            </span>
            <span data-hero="line2" aria-hidden className="relative mt-[0.06em] block">
              <span data-ghost="2" className="absolute inset-0 select-none text-pink" style={{ transform: 'translate(11px,11px)' }}>
                Every department gets a copy.
              </span>
              <span data-ghost="1" className="absolute inset-0 select-none text-canary" style={{ transform: 'translate(5.5px,5.5px)' }}>
                Every department gets a copy.
              </span>
              <span data-base className="relative block">
                Every department gets a copy.
              </span>
            </span>
          </h1>

          <p data-hero="sub" className="mt-9 max-w-[34rem] text-[1.2rem] leading-[1.55] text-graphite sm:text-[1.3rem]">
            ERP Suite runs sales, purchasing, stock, HR and accounting from one system. Confirm a sales order and the stock, the invoice and the ledger update together.
          </p>
          <div data-hero="cta" className="mt-9 flex flex-wrap items-center gap-4">
            <Magnetic href={LINKS.signup} className="btn btn-ink">
              Create a workspace
            </Magnetic>
            <a
              href="#flow"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('flow');
              }}
              className="btn btn-line"
            >
              See an order move
            </a>
          </div>
          <p data-hero="note" className="mt-6 text-[0.95rem] text-graphite">
            Built on Node, React and PostgreSQL.
          </p>
        </div>

        {/* The form set: pink accounts copy at the back, canary warehouse copy, white sales order on top. */}
        <div className="relative mx-auto h-[33rem] w-full max-w-[32rem] sm:h-[38rem] lg:col-span-5 lg:h-[40rem] lg:max-w-none" aria-hidden>
          <div data-par="back" className="absolute left-[27%] top-[40%] w-[73%]">
            <div data-pointer="back">
              <Sheet data-sheet data-hero tone="pink" title="Accounts copy" no="INV-00042" className="rotate-[6deg]">
                <Field label="Debit, receivables" value="2,400.00" />
                <Field label="Credit, revenue" value="2,400.00" />
                <Field label="Debit, cost of goods" value="1,800.00" />
                <Field label="Credit, inventory" value="1,800.00" />
              </Sheet>
            </div>
          </div>
          <div data-par="mid" className="absolute left-[14%] top-[21%] w-[73%]">
            <div data-pointer="mid">
              <Sheet data-sheet data-hero tone="canary" title="Warehouse copy" no="OUT-00042" className="rotate-[2.5deg]">
                <Field label="Product" value={'Business Laptop 14"'} />
                <Field label="From" value="Main Warehouse" />
                <Field label="Issue" value="2 units" />
                <Field label="On hand now" value="23" strong />
              </Sheet>
            </div>
          </div>
          <div data-par="front" className="absolute left-0 top-0 w-[73%]">
            <div data-pointer="front">
              <Sheet data-sheet data-hero tone="white" title="Sales order" no="SO-00042" className="-rotate-[3deg]">
                <Field label="Customer" value="Acme Trading" />
                <Field label="Warehouse" value="Main Warehouse" />
                <Field label={'2 × Business Laptop 14"'} value="2,400.00" />
                <Field label="Total" value="2,400.00" strong />
                <div className="mt-4 flex items-end justify-between">
                  <span className="text-[0.72rem] text-graphite [font-stretch:88%]">Approved by</span>
                  <svg viewBox="0 0 160 44" className="h-11 w-40 text-ink" fill="none">
                    <path data-sign pathLength={1} d="M4 30c10-22 18-26 20-18 2 9-14 28-6 24 10-5 14-22 22-20 7 2-4 16 4 14 9-2 12-12 20-10 6 2 0 10 6 10 8 0 14-8 22-10 6-1 8 4 14 2 6-2 10-10 14-12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
