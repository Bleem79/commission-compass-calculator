# Mobile-first cleanup, starting with Admin Yango

Goal: pages open and work correctly on phones. Desktop stays pixel-identical — all changes are inside mobile-only breakpoints (`sm:` and below) or non-visual performance work.

## Phase 1 — Admin Yango (do now)

The submissions page renders a 9-column table with fixed `px-4` cells inside a horizontal scroller. On a phone this means the user must scroll sideways to read one record, and the delete button sits off-screen.

- Add a mobile card list (below `sm`) showing each submission as a stacked card: Driver ID + name as the heading, then Contact / Nationality / HR Status / Smartphone / Monthly Data / Date-Time as label-value rows, with the delete button as a full-height 44x44 tap target.
- Keep the existing table exactly as-is, shown from `sm` upward.
- Stat cards: keep 2-up on mobile but reduce number size so long counts don't wrap.
- Filter bar: full-width search + date on mobile, clear button becomes full width.
- Pagination controls get 44px min height on mobile.
- Loading: the page currently blocks on sequential 1000-row batches plus lookup queries. Run the `yango_driver_list` and `driver_master_file` lookup chunks in parallel instead of sequentially so the page paints faster on mobile data.
- Same mobile card treatment for the Yango Driver List dialog table and Yango Income table, since they share the wide-table problem.

## Phase 2 — remaining worst offenders (separate turns, after you confirm Phase 1 looks right)

In order: Home, Driver Portal, Total Balance KPI, Total Outstanding, Admin Requests. Same recipe per page:

1. Wide tables get a mobile card view.
2. Dialogs get `max-h-[85vh] overflow-y-auto` so content is reachable on short screens.
3. Icon-only action buttons get 44x44 minimum touch targets.
4. Horizontal overflow audited so no page scrolls sideways.

## Technical notes

- No database, RLS, or business-logic changes. Filtering, export, delete and analytics behaviour stay identical.
- Mobile card markup is added alongside the table with `sm:hidden` / `hidden sm:block`, so desktop DOM output is unchanged.
- Existing `useIsMobile` hook is not used for this; CSS breakpoints avoid a render flash.
- Only file touched in Phase 1: `AdminYangoPage.tsx`, `YangoDriverListDialog.tsx`, `AdminYangoIncomePage.tsx`.
