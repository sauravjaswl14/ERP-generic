'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger, MOTION_OK } from '@/lib/gsap';
import { setLenis } from '@/lib/lenis';

/** Inertial scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync. Skipped for reduced motion. */
export default function SmoothScroll() {
  useEffect(() => {
    if (!window.matchMedia(MOTION_OK).matches) return;
    const lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    setLenis(lenis);
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);
  return null;
}
