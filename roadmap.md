# AMAN Taxi presentation redesign

## Yango driver list columns
- [x] Add nullable City, Area, Google Map storage without changing existing records or permissions
- [x] Include new columns in Excel template, upload parsing, desktop table and mobile list
- [ ] Verify column parsing and current page errors

## Safe Parking enhancement
- [x] Database, administrator-only writes and trusted validation
- [x] Excel preview, duplicate handling and administrator record management
- [x] Read-only directory, search, navigation and existing permission integration
- [x] Secure routing function deployed; 20 tests pass, XLS/XLSX parsing and desktop/phone signed-out guards checked
- [x] Map watermark "Demonstration only / Not final" over the map plus a plain-text note beneath it, sized and contrasted for phone screens
- [x] Safe Parking headings and descriptions reworded for heavy rain and flooding
- [ ] Signed-in desktop/mobile directory and Google Maps routing validation — external session unavailable; Maps requires user validation on deployed origin
- [ ] Authenticated end-to-end verification — external Supabase session unavailable

- [x] Add a persistent unread bell/count and reminder to Home for admin broadcasts; clear when Notifications opens.

- [ ] Shared semantic palette and existing UI controls
- [ ] Grouped Home and Driver Portal shortcuts with desktop/mobile navigation
- [ ] Consistent shared shell for all financial, request, management and reporting pages
- [ ] Custom login, calendar, install and documentation layouts
- [ ] Desktop/tablet/phone public-route checks and unchanged-logic review
- [ ] Authenticated workflow checks — blocked by external unmanaged sign-in
- [x] Message templates per nationality in admin SMS dialog (nationalities from yango_driver_list)
- [x] Named SMS templates with saved message contents and multiple nationalities (3 tests passed; authenticated save/send check unavailable on external sign-in)
- [x] Check nationality targeting and fix batch retries, message pagination, and notification reporting (9 tests passed; template matches 579 active drivers, 267 registered for push)
- [ ] Actual signed-in send and recipient receipt confirmation — blocked by external unmanaged sign-in; no unsolicited test messages sent