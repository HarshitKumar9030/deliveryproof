# DeliveryProof frontend

The user-supplied analytics screenshot establishes the compact hierarchy: greeting, three metrics, chart and project list, and a narrow attention/activity rail. The final steering supersedes its colors: graphite and restrained amber, Apple-like typography and squircle corners, generous horizontal button padding, restrained layered shadows and minimal outlines.

## Design system

The overview statistics panel switches between preserved record counts and received demo payments. Both views derive values directly from project state; shard links open evidence or project details. Faceted SVG bars reveal through per-instance clip paths with a short stagger, and the acknowledgement ring draws to the actual confirmed-project fraction. Initial totals are 14 records, $8,450 received, and 1 of 4 projects with an acknowledgement (25%). Animations run once on entry/metric change, require no canvas loop or animation library, and are disabled for reduced motion. Mobile cards adapt without horizontal page overflow.

Light: canvas #f3f2ee, paper #fdfcf9, surface #e7e5df, ink #292823, muted #716e64, accent #85672d. Dark: canvas #171715, paper #24241f, ink #f4f2e9, muted #b4b1a4, accent #d8be82. No purple tint or liquid-glass treatments remain. Heading 26px; body 12–14px; metrics 29px; control labels 12px. SF Pro Text/Display where available, then native Apple system fonts, then self-hosted Inter. SF Pro is absent on the current Windows host and is not represented as an embedded font.

Desktop sidebar is 260px wide, with space for the full search label and Ctrl K shortcut. Mobile retains the compact top navigation. The logo is an unboxed line icon; search and attention icons use plain solid surfaces. Backdrop filters and glass gradients have been removed. Hover backgrounds remain fixed. Evidence bars use narrow faceted SVG shards with visible counts and accessible project/count labels; heights still derive from preserved record counts.

Mobile navigation is accessed through a hamburger button with expanded state and a centered native dialog; route selection closes it, Escape restores trigger focus, and resizing to desktop dismisses it. Theme preference is persisted in a one-year SameSite=Lax cookie, validated by the server layout, and passed into the client provider before hydration. Missing/invalid preferences default to light. These pages render per request to honor the preference.

New project and Create project use a masked, partial conic-gradient edge. Only the border angle animates over seven seconds; the icon and button background stay fixed. Reduced motion keeps the edge static.

Buttons use 9px vertical/21px horizontal padding, 38px minimum height, 18px radius and CSS corner-shape: squircle. Panels use 28px squircle corners; dialogs use 32px and are centered horizontally and vertically, with a scrollable height limit on small screens. Browsers without corner-shape support retain rounded corners. Native focus outlines remain.

Hover feedback changes icon stroke color only. Interactive backgrounds remain fixed; icons do not rotate, shift, or scale on hover. Selection highlights remain for the active route and keyboard command selection. Press feedback, dialog transitions, and reduced-motion support are preserved.

Cards use theme-specific layered shadows, with slightly more depth when expanded. Dialogs have broader soft shadows, and primary buttons and the theme switch have restrained depth. Surface colors fade over 320ms when the theme changes. Primary controls settle by 1px and scale to 0.98 while pressed; reduced motion removes these transitions.

## Tailwind implementation

Tailwind v4 with @tailwindcss/postcss. globals.css is the single stylesheet entry, providing Tailwind theme tokens and the squircle utility. components.css and workspace-styles.css use Tailwind @apply for shared component patterns and responsive selectors. AppShell and Overview also use direct utility classes for composition. motion.css preserves the transition recipes; motion-integration.css handles their measured state and reduced-motion behavior. CSS custom properties retain theme switching and dynamic chart/progress dimensions.

## Functional demo

Create project → demo payment → delivery → acknowledgement. Restore expired delivery links. Select dispute records → inspect sources → edit/review draft → confirm review → prepare/export demo JSON. Ctrl/⌘K searches routes/projects and starts creation; arrow keys, Enter and Escape work. Native dialogs preserve focus. Changes survive navigation and reset on refresh. No external PayPal or Gemini calls.

Evidence chart bars show preserved record counts, not fabricated financial performance. Access records are distinguished from acceptance. Preparing a response preserves the open dispute and does not claim submission.

## Reference translation

1. Hierarchy retains the screenshot's compact metrics, chart, project rows and side rail.
2. Colors follow the user's later graphite/amber request rather than the screenshot's red accent.
3. Typography retains a small, quiet scale; Apple SF font preference is explicit and the Windows fallback is disclosed.
4. Shapes use squircles, tonal separation, and soft layered depth.
5. Controls use wider horizontal padding, subtle hover/selection/dialog transitions and reduced-motion support.

Copy is rewritten for DeliveryProof: payments, evidence counts, agreement/delivery/confirmation progress, and real demo issue labels replace social analytics and integration marketing. The chart shows 3/3/4/4 seed records. Initial payments total $8,450, three active projects, two attention items.

## Adaptive summary-card experiment

SummaryCards derives payments received, active projects, and attention counts from demo state. The cards use three columns on larger screens and stack as compact horizontal summaries on phones. On desktop, the opened card gains width while its content reveals smoothly; each card can expand to payment breakdowns, project statuses, or actionable issue links. Only one card expands at a time. Details retain visible counts, native buttons, aria-expanded/controls, inert collapsed content, keyboard activation, and visible focus. Reduced motion removes layout/reveal transitions. This adds responsive resizing without drag handles or fixed card dimensions.

## Response workspace and navigation polish

The response flow now has a distinct introduction, step descriptions, readable source excerpts, and select-all/clear controls. A four-part coverage strip reflects the selected record kinds without implying a confidence or win score. The review rail includes named reference buttons opening the actual source records. The editor shows word count and reference validation, and primary actions align to the end on desktop and span the available width on phones. Returning to source selection preserves edited wording when the selected sources are unchanged; changing the selection rebuilds the demo draft and requires fresh review.

Response preparation uses a rounded main panel and a desktop summary rail showing selected source counts, evidence coverage, review state, and submission state. The rail stacks beneath the content on smaller screens; source actions wrap on phones. Step changes use a short opacity/translation reveal without blur. The desktop command palette is wider, with a distinct input surface and truncated long result descriptions. Dialog motion explicitly preserves transform/opacity transitions instead of allowing theme fades to replace them: 180ms open, 120ms close. Dialog setup runs before paint, and native focus restoration remains intact. The mobile hamburger morphs into a cross: the outer SVG strokes meet diagonally and the middle stroke fades. The menu close control uses the same animated glyph, and closing restores the hamburger and trigger focus. Reduced motion disables these transitions.
