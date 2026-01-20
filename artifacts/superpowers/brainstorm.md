# Superpowers Brainstorm: Activity Chart Implementation

## Goal
Implement a Strava-style weekly activity summary chart in the Training Log page to provide users with a visual representation of their training progress over time.

## Constraints
- **Tech Stack**: Next.js 14 (App Router), React 18, Tailwind CSS, Supabase.
- **Aesthetics**: Must match Strava's dark UI (vibrant orange, dark grays, minimalist layout).
- **Data Source**: Supabase `training_log` table.
- **Interaction**: Tap-to-view weekly details (Total Distance & Activities).
- **Library**: No existing chart library; need to add one (prefer `recharts` via `shadcn/ui`).

## Known context
- Target file: [page.tsx](file:///Users/elbruz/QINTOMB/Github/mtrprv/app/(dashboard)/training-log/page.tsx)
- Insert point: Above the existing container at line 125.
- Data schema: `training_log` includes `date`, `distance`, and `user_id`.
- Current theme: Dark mode with Strava-specific colors (`bg-strava-dark`, `bg-strava`).

## Risks
- **Dependency Management**: Adding `recharts` adds bundle weight.
- **Data Aggregation**: Grouping logs by ISO week across months requires careful date logic to match Strava's week-start conventions (Monday vs Sunday).
- **Responsiveness**: Chart must scale nicely on mobile devices without losing readability.
- **Performance**: Fetching several months of data should be efficient.

## Options (2–4)
### Option 1: Use Recharts (Standard)
- **Summary**: Install `recharts` and build a custom AreaChart or BarChart.
- **Pros**: Robust, well-documented, handles tooltips and responsiveness out of the box.
- **Cons**: Requires manual styling to reach the "premium Strava" feel.
- **Complexity**: Medium.

### Option 2: Shadcn/ui Chart Components (Recommended)
- **Summary**: Use `shadcn/ui`'s chart implementation which uses `recharts` but with a pre-styled, accessible layer.
- **Pros**: Matches the existing UI system, provides beautiful default themes that are easy to customize for Strava aesthetics.
- **Cons**: Adds most boilerplate compared to bare `recharts`.
- **Complexity**: Medium.

### Option 3: Custom SVG + Framer Motion
- **Summary**: Hand-roll a lightweight SVG chart with `framer-motion` for transitions.
- **Pros**: Zero dependencies (beyond `framer-motion` which might be used), maximum control.
- **Cons**: High effort for relatively standard functionality; harder to maintain.
- **Complexity**: High.

## Recommendation
I recommend **Option 2: Shadcn/ui Chart Components**. Since the project already uses `shadcn/ui` components (Button, Input, Card, etc.), this path maintains architectural consistency while delivering the high-fidelity Strava-like UI the user expects.

## Acceptance criteria
- [ ] "Activity" header with Strava-like styling.
- [ ] Weekly summary chart showing distance (y-axis) over time (x-axis, weekly points across months).
- [ ] Summary stats (Total Distance, Total Activities) displayed above the chart.
- [ ] Interactive "pins" or tooltip markers that show weekly details when tapped.
- [ ] Accurate data aggregation from Supabase `training_log` for the authenticated user.
- [ ] Mobile-responsive layout that fits within one screen view.
