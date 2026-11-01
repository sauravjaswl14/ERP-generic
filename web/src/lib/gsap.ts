import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

/** Animations only run for people who have not asked the OS for reduced motion. */
export const MOTION_OK = '(prefers-reduced-motion: no-preference)';
export const DESKTOP = '(min-width: 1024px)';
