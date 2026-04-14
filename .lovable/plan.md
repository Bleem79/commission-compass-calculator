

## Plan: Show Multiple Batches with Differences in Driver Portal

### What This Does
When a driver has records from multiple upload batches, each batch is shown as a separate receipt card labeled with its batch date. Additionally, a **difference row** is displayed on each card (except the oldest) showing the change (increase/decrease) for every financial column compared to the previous batch.

### Changes

**File: `src/pages/TotalOutstandingPage.tsx`**

1. **Group driver records by batch date** — Instead of rendering one card per raw record, group records by `created_at` date (YYYY-MM-DD). Each group becomes one receipt card with the batch date displayed prominently.

2. **Add batch date label** — Show the formatted date (e.g. "14 Apr 2026") at the top of each driver receipt card as a badge/tag.

3. **Calculate differences** — Sort batches by date (newest first). For each batch (except the oldest), compute the difference for: Accident, Traffic Fines, SHJ RTA Fines, Total External Fines, Internal & Misc, and Total Balance compared to the previous (older) batch.

4. **Display difference row** — Below each fines table, add a "Change" row showing the difference values with color coding:
   - Green with ▼ arrow for decreases (good — balance went down)
   - Red with ▲ arrow for increases (bad — balance went up)
   - Gray "—" for no change
   - The oldest batch shows no difference row

5. **Handle multiple records per batch per driver** — If a driver has multiple records in the same batch date (unlikely but possible), sum them or take the latest. The plan will use the latest record per batch date per driver.

### Technical Details

- Records are already sorted by `created_at DESC` and filtered by `emp_cde` for drivers
- Group records by date string from `created_at`, take one record per date per driver
- Build an array of `{ record, prevRecord }` pairs for rendering
- Difference calculation: `current.field - previous.field` for each numeric field
- Internal & Misc diff = `(current.total_outstanding - current.total_external_fines) - (prev.total_outstanding - prev.total_external_fines)`

### No database changes required.

