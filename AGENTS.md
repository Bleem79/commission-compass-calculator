# Presentation architecture

- Preserve existing route guards, hooks, handlers, queries and business logic during presentation work; visual changes must not alter access or data flow.
- Define presentation roles as semantic HSL tokens in the global stylesheet and expose them through Tailwind; this keeps shared controls and custom shells consistent.
- Group existing permitted shortcut objects in a reusable presentation-only module list; derive navigation from those same objects so no new permission decisions are introduced.