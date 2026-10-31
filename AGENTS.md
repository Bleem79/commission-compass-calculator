# Presentation architecture

- Preserve existing route guards, hooks, handlers, queries and business logic during presentation work; visual changes must not alter access or data flow.
- Define presentation roles as semantic HSL tokens in the global stylesheet and expose them through Tailwind; this keeps shared controls and custom shells consistent.
- Group existing permitted shortcut objects in a reusable presentation-only module list; derive navigation from those same objects so no new permission decisions are introduced.
- SMS templates store multiple nationality assignments on each named template; legacy single-nationality assignments remain readable to preserve saved messages.
- Message text uses native automatic direction with logical start alignment and plaintext bidi isolation so each language remains readable without changing stored content.
- Private-message sends track successful and failed recipient batches separately; notify only saved recipients and retain failures for retry to avoid duplicate deliveries.
- Scope private-message reads by recipient before pagination; shared pagination exhausts all pages so bulk sends cannot hide messages behind the Data API row limit.
- Broadcast notification reminders use per-user local read IDs, paginated reads and realtime with polling fallback; never use shared broadcast read_at as an individual read receipt.
- Safe Parking reuses protected page permissions and shared controls; all writes are protected by administrator RLS and database validation, and Excel imports use an atomic invoker RPC that skips duplicates without overwrites.
- Safe Parking routing uses an authenticated server function with a stored destination and bounded current-location input; Google Maps credentials stay server-side, and navigation remains usable if estimates fail.
- Yango driver-list uploads use a shared row parser with nullable location fields so legacy spreadsheets remain compatible and column mapping can be tested independently.
- Driver Residence reads through an admin-checked invoker RPC, deduplicates newest-first driver records, and reuses English Esri/Leaflet maps with validated uploaded coordinates; unresolved locations remain explicitly unmapped.
- Driver request daily quotas are enforced by an atomic, system-private slot ledger and insert trigger using server submission time; the driver page mirrors the quota with timezone-aware validation so simultaneous requests, backdating and deletion cannot bypass it.