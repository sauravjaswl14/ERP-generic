'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP, MOTION_OK, DESKTOP } from '@/lib/gsap';
import LineHeading from './LineHeading';

const TABS = [
  { slug: 'acme', name: 'Acme Trading', tone: 'bg-sheet' },
  { slug: 'northwind', name: 'Northwind Foods', tone: 'bg-canary' },
  { slug: 'blue-harbor', name: 'Blue Harbor Ltd', tone: 'bg-pink' },
  { slug: 'kestrel', name: 'Kestrel Print', tone: 'bg-sheet' },
];

const ROLES = ['Administrator', 'Manager', 'HR', 'Sales', 'Purchasing', 'Inventory', 'Accountant', 'Employee'];

const POINTS = [
  'Each company signs in to its own workspace by name.',
  'Customers, stock, invoices and the ledger belong to one workspace and are never visible to another.',
  'Document numbers start at 00001 in every workspace.',
];

function Row({ reverse }: { reverse?: boolean }) {
  return (
    <div data-row={reverse ? 'r' : 'f'} className="flex w-max gap-3 will-change-transform">
      {[...ROLES, ...ROLES, ...ROLES].map((r, i) => (
        <span key={i} className="display-md whitespace-nowrap border border-carbon/80 px-6 py-3 text-2xl text-carbon sm:text-3xl">
          {r}
        </span>
      ))}
    </div>
  );
}

export default function Workspaces() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(`${MOTION_OK} and ${DESKTOP}`, () => {
        gsap.fromTo(
          '[data-tab]',
          { y: (i: number) => i * 14, rotate: 0 },
          {
            y: (i: number) => i * 112,
            rotate: (i: number) => (i - 1.5) * 2.2,
            ease: 'none',
            scrollTrigger: { trigger: '[data-stack]', start: 'top 70%', end: 'top 20%', scrub: 0.6 },
          },
        );
      });
      mm.add(MOTION_OK, () => {
        const rows = gsap.utils.toArray<HTMLElement>('[data-row]');
        const tweens = rows.map((el) => {
          const dir = el.dataset.row === 'r' ? 1 : -1;
          const w = el.scrollWidth / 3;
          return gsap.fromTo(el, { x: dir === -1 ? 0 : -w }, { x: dir === -1 ? -w : 0, duration: 38, ease: 'none', repeat: -1 });
        });
        // Scrolling fast speeds the rows up, then they settle back.
        const p = { s: 1 };
        const apply = () => tweens.forEach((t) => t.timeScale(p.s));
        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            const target = 1 + Math.min(Math.abs(self.getVelocity()) / 400, 5);
            if (target <= p.s) return;
            gsap.to(p, { s: target, duration: 0.15, overwrite: true, onUpdate: apply, onComplete: () => void gsap.to(p, { s: 1, duration: 1.2, onUpdate: apply }) });
          },
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="workspaces" className="bg-sheet py-28 lg:py-40">
      <div className="mx-auto grid max-w-[88rem] gap-16 px-5 sm:px-8 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-6">
          <LineHeading lines={['Many companies.', 'Nothing shared.']} className="text-[clamp(3rem,5.8vw,5.4rem)]" />
          <ul className="mt-10 max-w-lg space-y-4 text-lg text-graphite">
            {POINTS.map((p) => (
              <li key={p} className="border-l-2 border-ink pl-4">{p}</li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-6">
          <div data-stack className="relative mx-auto max-w-md pb-24 lg:pb-[21rem]">
            {TABS.map((t, i) => (
              <div
                key={t.slug}
                data-tab
                className={`${t.tone} ${i ? 'absolute inset-x-0' : 'relative'} rounded-[3px] border border-carbon/20 p-6 shadow-sheet`}
                style={{ top: 0, zIndex: 10 - i, transform: `translateY(${i * 14}px)` }}
              >
                <p className="typed text-xs text-graphite">workspace</p>
                <p className="display-md text-3xl">{t.name}</p>
                <p className="typed mt-1 text-sm text-ink">{t.slug}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-sm text-graphite">Example workspaces for illustration.</p>
        </div>
      </div>
      <div className="mt-24 overflow-hidden lg:mt-32" aria-label="Roles: Administrator, Manager, HR, Sales, Purchasing, Inventory, Accountant, Employee">
        <p className="mx-auto mb-6 max-w-[88rem] px-5 text-lg text-graphite sm:px-8">
          Eight roles decide who sees and changes what, in the app and in the API.
        </p>
        <div aria-hidden className="space-y-3">
          <Row />
          <Row reverse />
        </div>
      </div>
    </section>
  );
}
