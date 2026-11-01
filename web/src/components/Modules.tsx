'use client';

import { useRef } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';
import LineHeading from './LineHeading';

const MODULES = [
  { name: 'Dashboard', text: 'Revenue, receivables, stock value and open work, shown for the role signed in.' },
  { name: 'HR', text: 'Departments, employees, leave approvals, attendance and monthly payroll.' },
  { name: 'CRM', text: 'A leads pipeline and the customers those leads become.' },
  { name: 'Sales', text: 'Orders with discounts and tax, invoices, and payments that can’t exceed what’s owed.' },
  { name: 'Purchasing', text: 'Suppliers and purchase orders from draft to received to paid.' },
  { name: 'Inventory', text: 'Products, warehouses, transfers, a movement history that can’t be edited, and reorder alerts.' },
  { name: 'Accounting', text: 'Chart of accounts, balanced journal entries and a trial balance.' },
  { name: 'Projects', text: 'Projects and tasks with status, priority and an assignee.' },
  { name: 'Administration', text: 'Users, roles and an audit log of who changed what.' },
];

/** A ruled index. Each name drifts sideways as it passes, and wipes to ink on hover. */
export default function Modules() {
  const root = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.utils.toArray<HTMLElement>('[data-row]').forEach((row, i) => {
          const name = row.querySelector('[data-name]');
          const rule = row.querySelector('[data-rule]');
          gsap.fromTo(rule, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: row, start: 'top 92%', once: true } });
          gsap.fromTo(
            name,
            { xPercent: i % 2 ? 5 : 0 },
            { xPercent: i % 2 ? 0 : 5, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } },
          );
          gsap.from(row.querySelector('[data-text]'), {
            opacity: 0,
            y: 14,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: row, start: 'top 88%', once: true },
          });
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section ref={root} id="modules" className="bg-sheet py-28 lg:py-40">
      <div className="mx-auto max-w-[88rem] px-5 sm:px-8">
        <LineHeading lines={['Nine modules.', 'One set of books.']} className="text-[clamp(3.1rem,6vw,5.6rem)]" />
        <p className="mt-6 max-w-xl text-lg text-graphite">
          Every module reads and writes the same records, so a sale, a stock count and a ledger entry are never typed in twice.
        </p>
        <ul className="mt-16 lg:mt-24">
          {MODULES.map((m) => (
            <li key={m.name} data-row className="group relative overflow-hidden py-6 lg:py-8">
              <span data-rule className="absolute inset-x-0 top-0 h-px origin-left bg-carbon/80" />
              <div className="grid items-end gap-3 lg:grid-cols-12 lg:gap-8">
                <h3 data-name className="display relative text-[clamp(2.6rem,9vw,8rem)] leading-[0.9] text-carbon transition-colors duration-500 group-hover:text-ink lg:col-span-8">
                  {m.name}
                </h3>
                <p data-text className="max-w-sm pb-1 text-[1.02rem] text-graphite lg:col-span-4">
                  {m.text}
                </p>
              </div>
            </li>
          ))}
          <li aria-hidden className="h-px bg-carbon/80" />
        </ul>
      </div>
    </section>
  );
}
