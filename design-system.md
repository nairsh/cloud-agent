# Cloud Agent Handoff Design System

This document describes the current product UI so future agents can extend it without changing the visual language. The app is a dense control plane for running isolated coding-agent tasks, so the interface should feel quiet, functional, and fast to scan.

## Source Of Truth

- Global tokens and shared utility classes live in `app/globals.css`.
- The main shell lives in `components/app-frame.tsx`.
- Task creation, session detail, timelines, loading states, and recent activity live in `components/dashboard-client.tsx`.
- Settings surfaces live in `components/settings-client.tsx`.
- Reusable primitives include `components/setup-panel.tsx`, `components/status-pill.tsx`, and `components/running-grid.tsx`.
- Authentication pages are centered Clerk surfaces in `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`.

## Product Character

- Build a work-focused operational app, not a marketing page.
- Favor compact layouts, low-contrast neutral surfaces, restrained borders, and clear hierarchy.
- Keep repeated workflows ergonomic: users should quickly create tasks, inspect sessions, install GitHub access, manage providers, and send follow-ups.
- Prefer explicit data over decorative visuals. Icons are functional, not ornamental.
- Avoid large hero sections, gradients, decorative blobs, nested cards, and oversized display typography.

## Color Tokens

Always use CSS variables instead of hard-coded colors, except where the existing code uses white text on the accent avatar.

The palette is a **cool, neutral near-black dark theme** (the default) with a coherent
neutral light theme. Avoid warm/brown tints — surfaces should read as neutral grays.

| Token | Light | Dark | Usage |
| --- | --- | --- | --- |
| `--bg` | `#ffffff` | `#0e0e11` | Main content background |
| `--sidebar` | `#fbfbfa` | `#09090b` | Left navigation and sidebar header (near-black in dark) |
| `--border` | `#ececec` | `#232327` | Standard dividers and subtle item borders |
| `--text` | `#1a1a1c` | `#ededee` | Primary text and primary button background |
| `--text-soft` | `#3a3a3e` | `#c6c6ca` | Softer body text, sidebar rows |
| `--muted` | `#86868b` | `#8a8a90` | Secondary text, icons, labels |
| `--subtle` | `#a0a0a4` | `#5b5b62` | Section captions and least-prominent metadata |
| `--hover` | `#f1f1f0` | `#1a1a1d` | Hover backgrounds for quiet controls |
| `--active` | `#ececeb` | `#202024` | Selected sidebar row |
| `--card` | `#f7f7f6` | `#161618` | Panel/frame background |
| `--card-border` | `#ebebea` | `#2a2a2e` | Panel/frame border |
| `--input` | `#ffffff` | `#161618` | Input and ghost button background |
| `--input-border` | `#e3e3e2` | `#2c2c31` | Inputs and sticky composer border |
| `--accent` | `#2f6bed` | `#5b9bff` | **The single interactive accent** — running states, active dots, links, plus icons |
| `--cta` / `--cta-text` | `#c2823f` / `#fff` | `#d9a566` / `#1a1206` | Amber confirm/primary CTA (e.g. a question card's "Next") — used sparingly |
| `--code-bg` | `#f0f0ee` | `#1e1e22` | Inline code and tool-output background |
| `--success` | `#16855b` | `#5ac893` | Completed state |
| `--warning` | `#b26b00` | `#e5a84b` | Warning state if needed |
| `--danger` | `#c23131` | `#ff7777` | Failed, cancelled, destructive actions |
| `--shadow` | `0 1px 2px rgba(0, 0, 0, 0.04)` | `none` | Small lift on the sticky composer |

Keep accents to **one token**: `--accent` (blue) is the only interactive accent. `--cta`
(amber) is reserved for a single warm confirm button per surface; do not scatter it.

Theme switching is controlled by `document.documentElement.dataset.theme` and persisted in
`localStorage` under `cloud-agent-theme`. **Dark is the default** (light is opt-in). The
chat layout itself must look right in both themes (some references are light). Read the
stored theme with `useSyncExternalStore` (server snapshot `"dark"`), not a `useState`
initializer that branches on `typeof window` — the latter causes a hydration mismatch on
the theme toggle icon.

## Typography

- Primary font: Hanken Grotesk via `next/font/google`, exposed as `--font-hanken`.
- Fallback stack: `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`.
- Use antialiased text rendering.
- Keep type compact:
  - App title: 16px, weight 600.
  - Sidebar primary row: 15px, weight 600.
  - Sidebar session row: 14px, weight 500 or 600 when selected.
  - Panel headings: 15px.
  - Body copy: 14px, line-height 1.5 to 1.6.
  - Labels, metadata, and section captions: 12px.
- Do not scale font sizes with viewport width. Keep letter spacing at the browser default.

## Layout

The authenticated app uses a fixed-height shell:

- Root: `height: 100vh`, `display: flex`, `flex-direction: column`, `overflow: hidden`.
- Header: 52px tall.
- Sidebar: 332px wide, fixed, `var(--sidebar)`, right border `var(--border)`.
- Main content: scrollable, `var(--bg)`, padding `24px 30px`.
- Sidebar content scrolls independently with the `.scrl` scrollbar styling.
- Main content is constrained inside route-level wrappers:
  - Dashboard and session content: max width 1180px.
  - Settings content: max width 860px.
  - Setup-only content: max width 780px.
  - Auth fallback panel: `min(520px, calc(100vw - 32px))`, centered.

Use CSS grid for vertical stacks and forms. Common gaps are 8px, 10px, 12px, 16px, and 18px. Use flex rows for navigation items, headers, status/action clusters, and compact controls.

## Spacing, Radius, And Borders

- Default component radius is 8px.
- Icon buttons are 36px square with 8px radius.
- Standard buttons have `min-height: 36px`, horizontal padding 12px, and an 8px gap between icon and text.
- Inputs use 10px vertical and 12px horizontal padding.
- Panels use 18px padding.
- Timeline events use 13px vertical and 15px horizontal padding.
- Pills use 999px radius, 6px vertical and 9px horizontal padding.
- The follow-up composer is intentionally more rounded at 28px.
- Borders should usually be 1px and tokenized. Use `--border` for item boundaries, `--card-border` for panel frames, and `--input-border` for fields and composer surfaces.

## Surfaces

### App Shell

- Header and sidebar establish the app frame.
- The sidebar header contains muted 18px `PanelLeft` and `Search` icons.
- The main header title is a single-line ellipsis text label: `Cloud Agent Handoff`.
- Header actions sit on the right and use `.icon-button`.

### Sidebar

- The first row is `New Agent` with a blue plus icon.
- **Sessions are grouped by repository.** Each group is preceded by a lowercase
  `.sidebar-group` caption showing the repository `fullName` (e.g. `nairsh/cloud-agent`),
  in `var(--subtle)`, truncated with ellipsis. Do not uppercase these.
- Session rows (`.sidebar-item`) are 8px radius, vertically centered, single-line, and
  truncate the title with ellipsis. There is no second metadata line — the group header
  already names the repository.
- Selected session rows use `var(--active)` as a flat background block (no left accent bar).
- Each row leads with a status indicator in a fixed 16px slot: running/queued/cancel_requested
  use the animated `RunningGrid`; everything else uses a small `.session-dot`. Dots are
  restrained — neutral `var(--subtle)` by default, `var(--accent)` for active, a muted danger
  tint only for `failed`. No green/per-status rainbow.
- The account footer is separated by a top border, uses a 30px circular accent avatar, and includes the theme toggle.

### Panels

Use `.empty-panel` for primary content panels, setup messages, empty states, and form containers. Despite the class name, it is the standard framed panel treatment:

- Border: `1px solid var(--card-border)`.
- Radius: 8px.
- Background: `var(--card)`.
- Padding: 18px.
- `h2` and `h3`: 15px with tight bottom margin.
- Body copy: muted 14px text with 1.5 line-height.

Do not place `.empty-panel` inside another visually heavy card unless matching an existing state such as nested empty setup guidance.

## Controls

### Buttons

Use existing global classes:

- `.icon-button`: square icon-only action, muted icon color, hover background.
- `.ghost-button`: secondary action, `var(--input)` background, border `var(--border)`.
- `.primary-button`: main action, `var(--text)` background, `var(--bg)` text.
- `.danger-button`: destructive action, danger text and mixed danger border.

Buttons use inline-flex, centered content, 8px gap, 8px radius, and 36px minimum height. Disabled primary and ghost buttons use `opacity: 0.5` and `cursor: not-allowed`. Primary hover uses opacity 0.86; other quiet buttons use `var(--hover)`.

Use lucide-react icons at 14px to 18px depending on density. Pair command labels with icons when the action benefits from fast recognition: start task uses `ArrowUp`, cancel uses `Square`, external PR uses `ExternalLink`, GitHub access uses `GitBranch`, provider login uses `KeyRound`.

Two pill-shaped extras complement the standard buttons:

- `.pill-button`: a rounded, outlined, transparent quick action (optionally with a `<kbd>`
  shortcut chip). Used in `.composer-quick-actions` beneath the composer.
- `.cta-button`: the **single amber confirm** per surface, using `--cta` / `--cta-text`
  (e.g. a question card's "Next"). Reserve it for the one primary affirmative action;
  pair it with a borderless `.skip-button` for the secondary path.

### Interactive Question Card

When the agent asks the user to choose a direction, use `.question-card` — a single framed
card (`var(--card)`, 14px radius). It holds a muted `Questions` title with a `‹ N of M ›`
pager, a 15px medium prompt, and a `.question-options` list. Each `.question-option` is a
full-width borderless row that highlights on hover, led by a `.opt-key` letter badge
(rounded 22px square). The footer right-aligns `.skip-button` then `.cta-button`.

### Fields

Use the `.field` wrapper for label and input stacks:

- Wrapper: grid, 6px gap.
- Label: 12px, weight 600, `var(--muted)`.
- Inputs, selects, and textareas: full width, 8px radius, `var(--input)`, border `var(--input-border)`, text `var(--text)`.
- Textareas have a 116px minimum height and vertical resize.

Task creation forms use a two-column grid for repository and model: `minmax(0, 1fr) minmax(220px, 320px)`. If adapting for narrow screens, collapse this to one column while preserving field spacing and labels.

### Sticky Composer

Session follow-up input is a sticky bottom form:

- Display flex with 12px gap.
- Border `1px solid var(--input-border)`.
- Background `var(--input)`.
- Radius 28px.
- Padding `9px 10px 9px 16px`.
- Shadow `var(--shadow)`.
- Leading muted plus icon.
- Borderless transparent text input.
- Icon-only primary submit button with `ArrowUp`.

## Status And Feedback

Use `StatusPill` for session states. It renders lowercase status text with underscores replaced by spaces.

- Default pill: muted text, standard border.
- `running` and `queued`: accent text and a 40 percent accent mixed border.
- `completed`: success text and a 40 percent success mixed border.
- `failed` and `cancelled`: danger text and a 45 percent danger mixed border.

Use `RunningGrid` only for active navigation rows. It is a 3 by 3 set of 3px accent dots inside a 16px-wide grid, animated with `pulse-grid` over 1.2 seconds.

Loading panels are `.empty-panel` rows with a 16px `Loader2` icon and a short 14px message. Keep loading copy direct, for example `Loading session` or `Loading repositories and models`.

Setup states use `SetupPanel`:

- Missing configuration uses `AlertTriangle` and issue rows.
- Ready state uses `CheckCircle2`.
- Issue rows are bordered, 8px radius, muted 13px text, and 9px by 10px padding.

## Data Display

### Recent Activity

- Use compact bordered rows inside a panel.
- Rows use `display: flex`, 12px gap, `1px solid var(--border)`, 8px radius, and 10px by 12px padding.
- Title is strong primary text.
- Repository and model metadata are muted, 13px, block display.
- Status pill sits at the row end.

### Session Detail

- The summary panel uses a flex header: title and metadata on the left, status and actions on the right.
- Title should truncate only if needed through parent constraints.
- Metadata line is repository plus provider/model.
- Show `Cancel` only for running or queued sessions.
- Show `Pull request` only when a PR URL exists.

### Timeline Events

The chat reads as **flat, airy prose — not a stack of bordered cards**. Hierarchy
comes from spacing (`.timeline-list` uses an 18px gap) and a single frame on user
input, never from boxing every message.

- The uppercase meta label is gone (`.timeline-meta` is hidden). Do not reintroduce
  per-event captions like `PROMPT` / `TOOL REQUEST`.
- **Assistant / system events**: no border, no background, no padding box. Just text
  at 15px / line-height 1.65 (system events are muted and 14px).
- **User events** (`[data-role="user"]`): the only framed message — a single
  `1px solid var(--card-border)`, 12px radius, faint `var(--card)` fill, 14×16px padding.
- **Final assistant output** (`.result-panel`) is plain prose, not an accent-tinted box.
- **Inline code** inside prose uses `var(--code-bg)` with a 5px radius and monospace.
- **Tool calls** render in two tiers (Cursor Composer style), chosen by `isCommandTool`:
  - **Terminal commands** (bash/shell/exec/run) → a titled card (`.cmd-card`): a `>_`
    glyph + the command as the bold `.cmd-title`, with the output in a monospace
    `.cmd-card-output` region beneath a divider (scrollable, capped at 260px). Errors
    tint the border and output `var(--danger)`.
  - **Everything else** (reads/searches/greps) → a quiet inline line (`.tool-line`):
    a stronger leading `.verb` (`Read`, `Edited`, `Grepped`, `Searched`, `Fetched`,
    `Explored`) then the concrete target in muted `.tool-name` — e.g. `Read README.md L1-40`,
    `Grepped TODO in cloud-agent`. No icon, no output (errors excepted).
- Only surface a target when the args actually contain one; never fabricate file/line
  detail. Clean tool output through `extractToolText` so results show readable text, not
  raw `{ content: [...] }` JSON.

## Iconography

- Use `lucide-react`; do not hand-roll icons when lucide has an equivalent.
- Keep icons crisp and small: 14px for very compact destructive/status actions, 15px to 16px for buttons and row icons, 18px for toolbar/sidebar actions.
- Use `var(--muted)` for passive icons, `var(--accent)` for creation/running affordances, and semantic colors for destructive or status-specific states.
- Icon-only controls must have an accessible label.

## Motion

Motion is minimal. The only current animation is `pulse-grid` for running sessions:

- Dots scale from 0.65 to 1 and fade from 0.24 to 1.
- Duration is 1.2 seconds with staggered delays.
- Do not introduce broad page transitions or decorative animation without a clear workflow purpose.

## Copy

- Keep interface copy plain and operational.
- Use concrete nouns: repositories, models, provider credentials, session, task, pull request.
- Empty states should explain what is missing and what condition will make the data appear.
- Avoid promotional language and tutorial-like prose inside the app.
- Preserve product naming: `Cloud Agent Handoff`, `New Agent`, `Start a coding task`, `Recent activity`, `Pi provider credentials`.

## Responsive Guidance

The current implementation is desktop-first. When adding responsive behavior:

- Preserve the 332px sidebar on desktop.
- Keep the sidebar and main content independently scrollable when the shell is visible.
- Collapse form grids before reducing type size.
- Do not let buttons or status pills squeeze primary text; truncate session names and metadata first.
- Maintain minimum tap targets around 36px for controls.
- For auth and setup pages, keep the centered single-column layout with 16px viewport gutters.

## Implementation Rules For Future Agents

- Start with existing global classes before adding new ones.
- Add new design tokens to `app/globals.css` for both light and dark themes.
- Keep new component styling tokenized through `var(...)`.
- Match the existing 8px radius system unless implementing a pill or the sticky composer.
- Use `color-mix(...)` for semantic borders that need softer emphasis.
- Keep cards shallow. Prefer full-width panels, rows, and grids over decorative card stacks.
- If extracting inline styles into components, preserve current dimensions, spacing, and token usage unless intentionally changing the design.
- When introducing a new state, define its empty, loading, success, and error presentation using the same panel, pill, and button patterns.
