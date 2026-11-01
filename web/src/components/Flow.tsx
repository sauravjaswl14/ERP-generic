'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK, DESKTOP } from '@/lib/gsap';
import LineHeading from './LineHeading';
import { Field, Sheet } from './Sheet';

const STEPS = [
  { title: 'Stock is issued', text: 'The quantity leaves the warehouse you picked. If there isn’t enough, the order is refused.' },
  { title: 'The invoice is raised', text: 'Due in 30 days and numbered from your own sequence.' },
  { title: 'The ledger posts itself', text: 'Receivables, revenue, cost of goods and inventory. An entry that doesn’t balance is rejected.' },
  { title: 'Totals update', text: 'Revenue and receivables on the dashboard change as soon as it’s done.' },
];

type Tl = gsap.core.Timeline;

/** Reveals each element left to right in discrete steps, like a typewriter. */
function typeIn(tl: Tl, els: Element[], at: number, per = 0.5, gap = 0.18) {
  els.forEach((el, i) => {
    const n = Math.max(4, (el.textContent ?? '').length);
    tl.fromTo(el, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: per, ease: `steps(${n})` }, at + i * gap);
  });
}

const stampIn = (tl: Tl, stamp: Element, at: number) =>
  tl.fromTo(stamp, { scale: 2.6, opacity: 0, rotation: -24 }, { scale: 1, opacity: 1, rotation: -9, duration: 0.25, ease: 'power4.in' }, at);

export default function Flow() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      // Desktop: the section pins and the whole order plays out as you scroll.
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        const sales = q('[data-card="sales"]')[0] as HTMLElement;
        const stock = q('[data-card="stock"]')[0] as HTMLElement;
        const acct = q('[data-card="acct"]')[0] as HTMLElement;
        const ticker = q('[data-ticker]')[0];
        const steps = q('[data-step]');
        const bars = q('[data-bar]');

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: root.current, start: 'top top', end: '+=320%', pin: true, scrub: 0.6, anticipatePin: 1 },
        });

        // 1. The order is written on the top sheet, then stamped.
        typeIn(tl, q('[data-card="sales"] [data-type]'), 0.2, 0.4, 0.2);
        stampIn(tl, q('[data-stamp]')[0], 1.6);
        tl.to(sales, { y: 5, duration: 0.06, yoyo: true, repeat: 3 }, 1.85);

        // 2. The copies underneath start stacked behind it, then fan out to their departments.
        const stackedAt = (el: HTMLElement, n: number) => ({ x: sales.offsetLeft - el.offsetLeft + 14 * n, y: sales.offsetTop - el.offsetTop + 14 * n });
        tl.fromTo(stock, stackedAt(stock, 1), { x: 0, y: 0, duration: 1, ease: 'power2.inOut' }, 2.5);
        tl.fromTo(acct, stackedAt(acct, 2), { x: 0, y: 0, duration: 1, ease: 'power2.inOut' }, 2.5);

        // 3. Each copy fills itself in, and the matching line on the left lights up.
        const light = (i: number, at: number) => {
          tl.fromTo(steps[i], { opacity: 0.32 }, { opacity: 1, duration: 0.35 }, at);
          tl.fromTo(bars[i], { scaleY: 0 }, { scaleY: 1, duration: 0.9 }, at);
        };
        light(0, 3.6);
        typeIn(tl, q('[data-card="stock"] [data-type]'), 3.6, 0.4, 0.2);
        if (ticker) {
          const o = { v: 25 };
          ticker.textContent = '25';
          tl.to(ticker, { duration: 0.01 }, 4.5); // keeps the timeline's end after the ticker
          tl.to(o, { v: 23, duration: 0.5, onUpdate: () => void (ticker.textContent = String(Math.round(o.v))) }, 4.6);
        }
        light(1, 5.4);
        typeIn(tl, q('[data-card="acct"] [data-type="inv"]'), 5.4, 0.4, 0.2);
        light(2, 6.4);
        typeIn(tl, q('[data-card="acct"] [data-type="je"]'), 6.4, 0.45, 0.4);
        tl.fromTo(q('[data-balanced]')[0], { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, 8.2);
        tl.fromTo(q('[data-check]')[0], { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5 }, 8.4);
        light(3, 9.0);
        tl.fromTo(q('[data-kpi]')[0], { scale: 0.6, opacity: 0, y: 24 }, { scale: 1, opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)' }, 9.0);
        tl.to({}, { duration: 0.7 }, 9.5);

        return () => {
          if (ticker) ticker.textContent = '23';
        };
      });

      // Small screens: no pinning. Each copy types itself in as it scrolls into view.
      mm.add(`${MOTION_OK} and (max-width: 1023.98px)`, () => {
        q('[data-card]').forEach((card) => {
          const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: card, start: 'top 78%', once: true } });
          typeIn(tl, Array.from(card.querySelectorAll('[data-type]')), 0, 0.4, 0.14);
          const stamp = card.querySelector('[data-stamp]');
          if (stamp) stampIn(tl, stamp, 0.9);
          const check = card.querySelector('[data-check]');
          if (check) tl.fromTo(check, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.5 }, 1.4);
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="flow" className="relative bg-chalk py-24 lg:flex lg:h-screen lg:items-center lg:overflow-hidden lg:py-0">
      <div className="mx-auto grid w-full max-w-[88rem] gap-x-10 gap-y-12 px-5 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-y-10 lg:pt-14">
        <div className="lg:col-span-12">
          <LineHeading lines={['Confirm the order.', 'The rest follows.']} className="text-[clamp(3.1rem,5.6vw,5.4rem)]" />
        </div>
        <div className="lg:col-span-4">
          <ol>
            {STEPS.map((s) => (
              <li key={s.title} data-step className="relative border-l-[3px] border-rule py-3.5 pl-6">
                <span data-bar aria-hidden className="absolute -left-[3px] top-0 h-full w-[3px] origin-top bg-ink" />
                <h3 className="text-[1.2rem] font-semibold [font-stretch:92%]">{s.title}</h3>
                <p className="mt-1 max-w-md text-[1.02rem] leading-[1.55] text-graphite">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="lg:col-span-8">
          <div className="relative mx-auto flex max-w-md flex-col gap-8 lg:block lg:h-[29rem] lg:max-w-none">
            <div data-card="sales" className="relative z-10 lg:absolute lg:left-0 lg:top-[3%] lg:w-[17.5rem]">
              <Sheet tone="white" title="Sales order" no="SO-00042" className="lg:-rotate-[2.5deg]">
                <Field mark="so" label="Customer" value="Acme Trading" />
                <Field mark="so" label="Warehouse" value="Main Warehouse" />
                <Field mark="so" label={'2 × Business Laptop 14"'} value="2,400.00" />
                <Field mark="so" label="Total" value="2,400.00" strong />
                <div className="h-14" />
                <span
                  data-stamp
                  className="display-md absolute bottom-5 right-5 -rotate-[9deg] border-[3px] border-ink px-3 py-1 text-[1.7rem] text-ink mix-blend-multiply"
                >
                  Confirmed
                </span>
              </Sheet>
            </div>

            <div data-card="stock" className="relative z-20 lg:absolute lg:left-[31%] lg:top-[9%] lg:w-[17.5rem]">
              <Sheet tone="canary" title="Warehouse copy" no="OUT-00042" className="lg:rotate-[1.5deg]">
                <Field mark="out" label="Product" value={'Business Laptop 14"'} />
                <Field mark="out" label="From" value="Main Warehouse" />
                <Field mark="out" label="Issue" value="2 units" />
                <Field mark="out" label="On hand now" value={<span data-ticker>23</span>} strong />
                <p className="mt-6 text-[0.8rem] leading-snug text-carbon/70 [font-stretch:92%]">Movement recorded as out, ref SO-00042. It stays in the history.</p>
              </Sheet>
            </div>

            <div data-card="acct" className="relative z-30 lg:absolute lg:left-[62%] lg:top-[0%] lg:w-[17.5rem]">
              <Sheet tone="pink" title="Accounts copy" no="INV-00042" className="lg:rotate-[4deg]">
                <Field mark="inv" label="Invoice due" value="in 30 days" />
                <Field mark="inv" label="Amount" value="2,400.00" strong />
                <p className="mt-3 text-[0.78rem] font-semibold text-carbon/80 [font-stretch:90%]">Journal JE-00019</p>
                <Field mark="je" label="Dr Accounts receivable" value="2,400.00" />
                <Field mark="je" label="Cr Sales revenue" value="2,400.00" />
                <Field mark="je" label="Dr Cost of goods sold" value="1,800.00" />
                <Field mark="je" label="Cr Inventory" value="1,800.00" />
                <div data-balanced className="mt-4 flex items-center gap-2 text-ok">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
                    <path data-check pathLength={1} d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[0.92rem] font-semibold [font-stretch:92%]">Debits 4,200.00 equal credits 4,200.00</span>
                </div>
              </Sheet>
            </div>

            <div
              data-kpi
              className="relative z-40 inline-flex w-fit items-center gap-3 rounded-[3px] bg-carbon px-4 py-3 text-chalk shadow-note lg:absolute lg:bottom-0 lg:left-0"
            >
              <span className="text-[0.85rem] text-chalk/70 [font-stretch:90%]">Dashboard, receivables</span>
              <span className="typed text-[0.95rem] font-medium">+2,400.00</span>
            </div>
          </div>
          <p className="mt-6 text-center text-[0.82rem] text-graphite lg:text-left">Sample order. Names and amounts are illustrative.</p>
        </div>
      </div>
    </section>
  );
}
