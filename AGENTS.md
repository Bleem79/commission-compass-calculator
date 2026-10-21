# Presentation architecture

- Preserve existing route guards, hooks, handlers, queries and business logic during presentation work; visual changes must not alter access or data flow.
- Define presentation roles as semantic HSL tokens in the global stylesheet and expose them through Tailwind; this keeps shared controls and custom shells consistent.
- Group existing permitted shortcut objects in a reusable presentation-only module list; derive navigation from those same objects so no new permission decisions are introduced.
- SMS templates store multiple nationality assignments on each named template; legacy single-nationality assignments remain readable to preserve saved messages.
- Private-message sends track successful and failed recipient batches separately; notify only saved recipients and retain failures for retry to avoid duplicate deliveries.
- Scope private-message reads by recipient before pagination; shared pagination exhausts all pages so bulk sends cannot hide messages behind the Data API row limit.