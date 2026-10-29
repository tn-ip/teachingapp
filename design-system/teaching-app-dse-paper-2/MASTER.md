# Teaching App DSE Paper 2 — design system (adapted from UI UX Pro Max)

Source: nextlevelbuilder/ui-ux-pro-max-skill (MIT). Override for S4–S6 exam prep (not children's apps).

## Direction
- **Style:** Soft UI Evolution (subtle depth, 8–12px radius, soft multi-layer shadows). Prefer over Claymorphism/kids styles for secondary DSE.
- **Pattern:** Clear stage map + quiz focus (not marketing landing pages).
- **Colors:** Primary `#4F46E5`, secondary `#818CF8`, accent/CTA `#059669` (correct/progress), destructive `#DC2626`, background `#F8FAFC`, foreground `#0F172A`, card `#FFFFFF`, border `#E2E8F0`, muted `#F1F5F9`.
- **Typography:** Poppins (headings) + Open Sans (body) — Modern Professional. Avoid Baloo 2 / Comic Neue for this product.
- **Effects:** Soft press 200ms ease-out; respect prefers-reduced-motion; visible focus ring `#4F46E5`.
- **iPad:** Touch targets ≥44px, ≥8px gaps; readable KaTeX; stage tiles scannable.

## Anti-patterns
- Dark mode first
- Kids/display fonts
- Emoji as icons
- Tiny desktop-only hit targets on tablet
- Purple AI-gradient chrome that fights math content

## Checklist
- cursor-pointer on clickables; hover 150–300ms
- Contrast ≥4.5:1
- Keyboard focus visible
- Responsive 375 / 768 / 1024 / 1440
