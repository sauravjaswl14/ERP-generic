import { SITE, LINKS } from '@/lib/site';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="bg-carbon py-14 text-chalk">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-10 px-5 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div className="text-white">
          <Logo />
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Companies, names and figures on this page are samples made up for illustration.
          </p>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-[0.95rem]">
          <a className="hover:underline" href={LINKS.login}>Sign in</a>
          <a className="hover:underline" href={LINKS.signup}>Create a workspace</a>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-[88rem] px-5 text-xs text-white/50 sm:px-8">© {new Date().getFullYear()} {SITE.name}</p>
    </footer>
  );
}
