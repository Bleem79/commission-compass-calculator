# AMAN Taxi presentation redesign

## Safe Parking enhancement
- [ ] Database, administrator-only writes and trusted validation
- [ ] Excel preview, duplicate handling and administrator record management
- [ ] Read-only directory, search, navigation and existing permission integration
- [ ] Real routing estimates when configured; unit and desktop/mobile checks
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