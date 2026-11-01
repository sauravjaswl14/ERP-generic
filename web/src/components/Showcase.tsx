'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK, DESKTOP } from '@/lib/gsap';
import LineHeading from './LineHeading';

const BARS = [38, 52, 44, 66, 58, 79, 71, 92];
const KPIS = [
  { label: 'Revenue', value: '184,200' },
  { label: 'Receivables', value: '41,600' },
  { label: 'Stock value', value: '96,350' },
  { label: 'Low stock', value: '7 items' },
];

/** The dashboard, tilted back, settles flat as you scroll to it. Sticky notes drift at their own speed. */
export default function Showcase() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const st = { trigger: '[data-frame-wrap]', start: 'top 85%', end: 'top 15%', scrub: 0.6 };
        gsap.fromTo('[data-frame]', { rotateX: 24, scale: 0.9, y: 40 }, { rotateX: 0, scale: 1, y: 0, ease: 'none', scrollTrigger: st });
        gsap.fromTo('[data-bar]', { scaleY: 0 }, { scaleY: 1, stagger: 0.06, ease: 'power3.out', duration: 0.9, scrollTrigger: { trigger: '[data-frame-wrap]', start: 'top 55%', once: true } });
        gsap.utils.toArray<HTMLElement>('[data-drift]').forEach((n) => {
          const s = parseFloat(n.dataset.drift ?? '0');
          gsap.to(n, { yPercent: s, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
      });
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        gsap.from('[data-kpi]', { y: 24, opacity: 0, stagger: 0.08, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '[data-frame-wrap]', start: 'top 50%', once: true } });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="showcase" className="relative overflow-hidden bg-chalk py-28 lg:py-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <LineHeading lines={['See the whole', 'business at a glance.']} className="text-[clamp(3rem,5.8vw,5.4rem)]" />
        <p className="mt-6 max-w-xl text-lg text-graphite">
          The dashboard shows each person what their role can act on. An accountant sees receivables; a warehouse lead sees what to reorder.
        </p>
        <div data-frame-wrap className="relative mt-16 [perspective:1600px]">
          <div data-drift="-14" className="absolute -left-2 -top-10 z-20 hidden w-44 -rotate-6 bg-canary p-4 text-[0.95rem] leading-snug shadow-note md:block">
            7 products are below their reorder level.
          </div>
          <div data-drift="10" className="absolute -right-2 bottom-10 z-20 hidden w-48 rotate-3 bg-pink p-4 text-[0.95rem] leading-snug shadow-note md:block">
            3 invoices are overdue.
          </div>
          <div data-frame className="overflow-hidden rounded-md border border-carbon/15 bg-sheet shadow-sheet [transform-origin:50%_0%]">
            <div className="flex items-center gap-2 border-b border-rule bg-chalk px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-rule" />
              <span className="h-2.5 w-2.5 rounded-full bg-rule" />
              <span className="h-2.5 w-2.5 rounded-full bg-rule" />
              <span className="typed ml-3 text-xs text-graphite">acme / Dashboard</span>
            </div>
            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-12">
              <div className="grid grid-cols-2 gap-4 lg:col-span-12 lg:grid-cols-4">
                {KPIS.map((k) => (
                  <div key={k.label} data-kpi className="border-l-2 border-ink pl-4">
                    <p className="text-sm text-graphite">{k.label}</p>
                    <p className="typed mt-1 text-xl text-carbon sm:text-2xl">{k.value}</p>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-8">
                <p className="mb-3 text-sm font-medium text-carbon">Revenue by month</p>
                <div className="flex h-52 items-end gap-3 border-b border-carbon/70 sm:h-64">
                  {BARS.map((h, i) => (
                    <div key={i} className="flex h-full flex-1 items-end">
                      <div data-bar className="w-full origin-bottom bg-ink" style={{ height: `${h}%`, opacity: 0.45 + i * 0.07 }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-4">
                <p className="mb-3 text-sm font-medium text-carbon">Recent orders</p>
                {[['SO-00042', 'Acme Trading', '2,400.00'], ['SO-00041', 'Northwind Foods', '980.00'], ['SO-00040', 'Blue Harbor', '1,310.00'], ['SO-00039', 'Kestrel Print', '615.00']].map((r) => (
                  <div key={r[0]} className="flex items-baseline justify-between gap-3 border-t border-rule py-3 text-sm">
                    <span><span className="typed text-graphite">{r[0]}</span> <span className="ml-1 text-carbon">{r[1]}</span></span>
                    <span className="typed text-carbon">{r[2]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-graphite">Sample company and figures. Yours will show your own.</p>
      </div>
    </section>
  );
}
