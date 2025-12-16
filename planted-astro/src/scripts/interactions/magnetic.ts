/**
 * Magnetic Button Effect
 * Creates a subtle magnetic pull effect on hover
 * Brand-compliant with Planted's playful interaction style
 */

import { gsap } from '../smooth-scroll';

/**
 * Initialize magnetic effect on elements with data-magnetic attribute
 */
export function initMagneticButtons(): void {
  const magneticElements = document.querySelectorAll('[data-magnetic]');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  magneticElements.forEach((element) => {
    const el = element as HTMLElement;
    const strength = parseFloat(el.dataset.magneticStrength || '0.15');

    // Track mouse movement within element
    el.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Apply magnetic pull
      gsap.to(el, {
        x: deltaX * strength,
        y: deltaY * strength,
        duration: 0.3,
        ease: 'power2.out',
      });
    });

    // Reset on mouse leave
    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)',
      });
    });

    // Ensure keyboard accessibility - no visual effect needed
    el.addEventListener('focus', () => {
      el.style.outline = '2px solid var(--planted-purple)';
      el.style.outlineOffset = '4px';
    });

    el.addEventListener('blur', () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
  });
}

/**
 * Initialize hover lift effect on cards
 * Adds a subtle 3D lift on hover
 */
export function initCardHoverEffects(): void {
  const cards = document.querySelectorAll('[data-hover-lift]');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  cards.forEach((card) => {
    const el = card as HTMLElement;
    const lift = parseFloat(el.dataset.hoverLift || '6');

    el.addEventListener('mouseenter', () => {
      gsap.to(el, {
        y: -lift,
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.12)',
        duration: 0.3,
        ease: 'power2.out',
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        y: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
        duration: 0.4,
        ease: 'power2.out',
      });
    });
  });
}

/**
 * Initialize button press effect
 * Adds a satisfying press-down animation on click
 */
export function initButtonPressEffect(): void {
  const buttons = document.querySelectorAll('.btn, [data-button-press]');

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  buttons.forEach((button) => {
    const el = button as HTMLElement;

    el.addEventListener('mousedown', () => {
      gsap.to(el, {
        scale: 0.97,
        duration: 0.1,
        ease: 'power2.out',
      });
    });

    el.addEventListener('mouseup', () => {
      gsap.to(el, {
        scale: 1,
        duration: 0.2,
        ease: 'back.out(2)',
      });
    });

    el.addEventListener('mouseleave', () => {
      gsap.to(el, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out',
      });
    });
  });
}

/**
 * Initialize all magnetic and interactive effects
 */
export function initMagneticEffects(): void {
  initMagneticButtons();
  initCardHoverEffects();
  initButtonPressEffect();
}
