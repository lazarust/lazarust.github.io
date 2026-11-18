import { navigate as astroNavigate } from 'astro:transitions/client';

export function navigate(href: string): void {
  if (typeof window === 'undefined') return;
  void astroNavigate(href);
}

export function openExternal(href: string): void {
  if (typeof window === 'undefined') return;
  window.open(href, '_blank', 'noopener,noreferrer');
}

export function isExternal(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
