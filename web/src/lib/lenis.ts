import type Lenis from 'lenis';

/** The active smooth-scroll instance, so anchor links can use it. Null when motion is reduced. */
let instance: Lenis | null = null;
export const setLenis = (l: Lenis | null) => {
  instance = l;
};

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instance) instance.scrollTo(el, { offset: -8, duration: 1.4 });
  else el.scrollIntoView({ behavior: 'auto', block: 'start' });
}
