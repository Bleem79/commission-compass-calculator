# AMAN Taxi Portal — Complete Presentation Redesign

## Design direction
Use the existing AMAN Taxi logo with a restrained blue-and-white palette, crisp readable typography, compact cards, consistent icons, and subtle borders and shadows. Replace large gradient tiles with smaller grouped shortcuts. Keep financial information, requests, messages, and performance easy to find.

The uploaded brief references two images, but this message includes only the brief. Use the existing branding and previously supplied mobile reference as the starting point, without copying its yellow background.

## What will change
1. **Shared design system:** unify colors, spacing, buttons, inputs, selectors, tables, dialogs, pagination, loading indicators, and empty/error feedback. Ensure solid, high-contrast dialog surfaces and reachable controls.
2. **Home and Driver Portal:** introduce a clean branded header, existing notification counts, a concise driver profile, and logically grouped shortcut sections. Preserve every currently available module, including those controlled by role permissions and Portal Settings.
3. **Navigation:** add a compact desktop navigation layout and mobile drawer using only shortcuts already available to that user. Preserve current back/close actions and all URLs; do not add or change permissions.
4. **Every existing page:** work through calculators and financial reports; driver requests and messages; management and upload pages; surveys, Yango, badges and calendars; maps, tutorials and guides; login and remaining custom layouts. Improve tables and filters without removing columns or actions. Keep wide tables scrolling within their own area rather than widening the whole page.
5. **Responsive review:** check desktop, tablet and phone layouts, long names, crowded action bars, dialogs and pagination. Retain pinch-to-zoom and minimum 44px touch targets.

## Protection rules
- No changes to authentication, logout, access rules, database schemas, stored procedures, queries, integrations, secrets, or deployment settings.
- Keep all calculations, validation rules, handlers, routes, existing data and workflows intact.
- Reuse the existing React, Tailwind, shadcn and icon tools; no new UI framework or unnecessary dependencies.
- Make controlled changes in page groups and check each group before proceeding.

## Verification and delivery
- Establish a baseline of existing routes, modules, calculation code and current preview errors before edits.
- Verify public pages in the browser and review changes to confirm that business logic and permissions remain untouched.
- Check desktop, tablet and phone rendering, navigation controls and dialog scrolling where accessible.
- Check the automatically generated build result after changes. There is currently no project test suite.
- Authenticated driver/admin flows, login/logout, database reads/writes and notifications will be reported as unverified unless an authorized test session is available. This project's external sign-in service currently prevents authenticated browser checks in the sandbox; credentials will not be requested.
- Finish with a concise list of changed file groups, pages redesigned, checks actually performed, and any remaining blockers. Do not publish automatically.

## Technical approach
Keep the current application architecture, route wrappers, permission context and data hooks. Start with semantic HSL tokens and existing shared controls, then update `PageLayout` and the custom Home/Driver Portal layouts. Handle custom calendar, install and documentation pages explicitly rather than forcing them into an unsuitable shell. Track page-group completion in a lean roadmap.