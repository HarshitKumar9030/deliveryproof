# DeliveryProof frontend

The user-supplied analytics screenshot establishes the compact hierarchy: greeting, three metrics, chart and project list, and a narrow attention/activity rail. The final steering supersedes its colors: graphite and muted plum, Apple-like typography and squircle corners, generous horizontal button padding, no decorative borders or shadows.

## Design system

Light: canvas #f0eef2, paper #faf9fb, surface #e6e1e9, ink #2c2630, muted #756b7b, accent #725580. Dark: canvas #1c1821, paper #28222f, ink #f0eaf4, muted #b0a3b9, accent #cfb5df. No red glow, blue, or sage in the active theme. Heading 26px; body 12–14px; metrics 29px; control labels 12px. SF Pro Text/Display where available, then native Apple system fonts, then self-hosted Inter. SF Pro is absent on the current Windows host and is not represented as an embedded font.

Buttons use 9px vertical/21px horizontal padding, 38px minimum height, 18px radius and CSS corner-shape: squircle. Panels use 28px squircle corners; dialogs use 32px and are centered horizontally and vertically, with a scrollable height limit on small screens. Browsers without corner-shape support retain rounded corners. Native focus outlines remain.

Hover feedback changes icon stroke color only. Interactive backgrounds remain fixed; icons do not rotate, shift, or scale on hover. Selection highlights remain for the active route and keyboard command selection. Press feedback, dialog transitions, and reduced-motion support are preserved.

## Tailwind implementation

Tailwind v4 with @tailwindcss/postcss. globals.css is the single stylesheet entry, providing Tailwind theme tokens and the squircle utility. components.css and workspace-styles.css use Tailwind @apply for shared component patterns and responsive selectors. AppShell and Overview also use direct utility classes for composition. motion.css preserves the transition recipes; motion-integration.css handles their measured state and reduced-motion behavior. CSS custom properties retain theme switching and dynamic chart/progress dimensions.

## Functional demo

Create project → demo payment → delivery → acknowledgement. Restore expired delivery links. Select dispute records → inspect sources → edit/review draft → confirm review → prepare/export demo JSON. Ctrl/⌘K searches routes/projects and starts creation; arrow keys, Enter and Escape work. Native dialogs preserve focus. Changes survive navigation and reset on refresh. No external PayPal or Gemini calls.

Evidence chart bars show preserved record counts, not fabricated financial performance. Access records are distinguished from acceptance. Preparing a response preserves the open dispute and does not claim submission.

## Reference translation

1. Hierarchy retains the screenshot's compact metrics, chart, project rows and side rail.
2. Colors follow the user's later graphite/plum request rather than the screenshot's red accent.
3. Typography retains a small, quiet scale; Apple SF font preference is explicit and the Windows fallback is disclosed.
4. Shapes use squircles and flat tonal separation rather than outlines/shadows.
5. Controls use wider horizontal padding, subtle hover/selection/dialog transitions and reduced-motion support.

Copy is rewritten for DeliveryProof: payments, evidence counts, agreement/delivery/confirmation progress, and real demo issue labels replace social analytics and integration marketing. The chart shows 3/3/4/4 seed records. Initial payments total $8,450, three active projects, two attention items.
