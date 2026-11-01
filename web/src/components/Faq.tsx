'use client';

import { useRef, useState } from 'react';
import { gsap, useGSAP, MOTION_OK } from '@/lib/gsap';
import LineHeading from './LineHeading';

const ITEMS = [
  { q: 'Can several companies use one installation?', a: 'Yes. Each company gets its own workspace on a shared database. Every record carries its workspace, and the API refuses to read or write across workspaces.' },
  { q: 'What is it built with?', a: 'Node and Express with Prisma on PostgreSQL for the server, and React with TypeScript and Tailwind for the app. You host it yourself.' },
  { q: 'Who can see what?', a: 'There are eight roles. The API checks the role on every request, and the app hides the pages a role can’t open.' },
  { q: 'Does posting to the ledger happen automatically?', a: 'For sales, receiving purchases, supplier payments, invoice payments and payroll, yes. Manual journal entries are rejected unless debits equal credits.' },
  { q: 'What isn’t included yet?', a: 'Email notifications, file attachments, multiple currencies, multi-step approval workflows and a platform admin screen for managing workspaces. Tenant isolation has automated tests; the business workflows don’t yet.' },
  { q: 'How do I try it?', a: 'Create a workspace, which makes you its administrator, and invite your team afterwards.' },
];

function Item({ q, a, open, onToggle, id }: { q: string; a: string; open: boolean; onToggle: () => void; id: string }) {
  const body = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useGSAP(
    () => {
      const el = body.current;
      if (!el) return;
      if (first.current) {
        first.current = false;
        gsap.set(el, { height: open ? 'auto' : 0 });
        return;
      }
      const reduce = !window.matchMedia(MOTION_OK).matches;
      gsap.to(el, { height: open ? 'auto' : 0, duration: reduce ? 0 : 0.5, ease: 'power3.inOut' });
    },
    { dependencies: [open] },
  );
  return (
    <div className="border-t border-carbon/80">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex w-full items-center justify-between gap-6 py-6 text-left">
          <span className="display-md text-[1.5rem] sm:text-[1.9rem]">{q}</span>
          <svg viewBox="0 0 24 24" className={`h-6 w-6 shrink-0 text-ink transition-transform duration-500 ${open ? 'rotate-45' : ''}`} aria-hidden>
            <path d="M12 3v18M3 12h18" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </button>
      </h3>
      <div ref={body} id={id} role="region" className="overflow-hidden" style={{ height: open ? 'auto' : 0 }}>
        <p className="max-w-2xl pb-7 text-lg text-graphite">{a}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-chalk py-28 lg:py-40">
      <div className="mx-auto grid max-w-[88rem] gap-14 px-5 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <LineHeading lines={['Questions,', 'answered plainly.']} className="text-[clamp(2.8rem,4.6vw,4.4rem)]" />
        </div>
        <div className="lg:col-span-8">
          {ITEMS.map((it, i) => (
            <Item key={it.q} id={`faq-${i}`} q={it.q} a={it.a} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
          <div className="border-t border-carbon/80" />
        </div>
      </div>
    </section>
  );
}
