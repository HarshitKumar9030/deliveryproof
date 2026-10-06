/** The same strokes move between menu and close states, without rotating the icon. */
export function NavigationGlyph({ open }: { open: boolean }) {
  return (
    <svg className="navigation-glyph" data-open={open} width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path className="navigation-line navigation-line-top" d="M5 6h14" />
      <path className="navigation-line navigation-line-middle" d="M5 12h14" />
      <path className="navigation-line navigation-line-bottom" d="M5 18h14" />
    </svg>
  );
}
