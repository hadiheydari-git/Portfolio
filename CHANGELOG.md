# Performance changes

## 2026-09-08

- `src/components/page/home-page-client.tsx` — removed the full-screen loading overlay and `visibility:hidden` asset gate. Targets Lighthouse LCP, FCP, and mobile accessibility (content is available to paint and assistive technology immediately). The existing asset context remains for reveal animation coordination.
- `src/app/layout.tsx` — removed four below-the-fold project thumbnail preloads and the non-LCP portrait preload. Targets Lighthouse LCP and network contention; the hero headshot remains the sole image preload.
- `src/app/layout.tsx` — added `metadataBase`, canonical URL, and absolute Open Graph URL/image metadata. Targets Lighthouse SEO metadata and social preview audits.

Validation: `npm run build` passes and `/` remains statically prerendered. Lighthouse before/after was not run locally.
