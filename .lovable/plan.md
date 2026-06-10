## Collect Payment (QR + Stripe) — Plan

A new page for drivers where they type an amount (AED), tap one button to generate a QR code that opens a Stripe payment page, and the customer scans it to pay. Each generated QR is saved as a history record, and its status flips to **Paid** automatically once the customer completes payment.

### User flow
```text
Driver Portal ─▶ "Collect Payment" card
        │
        ▼
 Enter amount (AED)   ← date & time captured automatically
        │
 [Generate QR Code]   ← button hidden until a valid amount is entered
        │
        ▼
 QR code shown  +  Total amount, date & time below
        │
 Customer scans QR ─▶ opens Stripe checkout ─▶ pays
        │
        ▼
 Record marked "Paid" (auto, via Stripe webhook)
```

### What gets built

**1. New page `/driver-collect-payment`**
- Reachable from a new card in the Driver Portal (drivers only).
- Amount input in AED; live date/time display (auto, read-only).
- "Generate QR Code" button only appears once a valid amount (> 0) is entered.
- On generate: calls an edge function, then renders the QR code (using the existing `qrcode.react` library already in the project) encoding the Stripe checkout URL, with the total amount, date, and time shown below it.
- A "Submitted Collections" history list below (amount, date/time, Pending/Paid badge), styled like the existing Entry Pass page.

**2. Database — new table `payment_collections`**
- Columns: `id`, `driver_id`, `driver_name`, `amount` (numeric), `currency` (default `AED`), `status` (`pending`/`paid`, default `pending`), `stripe_session_id`, `checkout_url`, `created_at`.
- RLS: drivers see/insert only their own rows; service role full access (for the webhook). Standard GRANTs included.

**3. Edge function `create-payment-collection`**
- Validates the authenticated driver and the amount.
- Creates a Stripe Checkout Session (mode `payment`, dynamic AED line item built from the entered amount).
- Inserts a `payment_collections` row (status `pending`) and returns the checkout URL to encode in the QR.

**4. Edge function `stripe-payment-webhook`**
- Public endpoint (no JWT) that verifies the Stripe signature and, on `checkout.session.completed`, updates the matching record to `paid`.

### Stripe setup — what you need to do
Because this project is on an external Supabase (not Lovable Cloud), the no-account seamless Stripe option isn't available, so we use your own Stripe account:
1. Create a free account at https://dashboard.stripe.com/register.
2. Copy your **Secret key** (starts with `sk_test_...` for testing, `sk_live_...` for real payments) from Developers → API keys.
3. After the webhook function is deployed, add a webhook endpoint in Stripe (Developers → Webhooks) pointing to the function URL, subscribe to `checkout.session.completed`, and copy its **Signing secret** (`whsec_...`).

I'll request these as secrets (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) at the right step and give you the exact webhook URL to paste into Stripe.

### Technical notes
- QR encodes Stripe's hosted checkout `session.url`, so no custom payment page is needed — scanning opens Stripe directly.
- AED amounts are sent to Stripe in fils (amount × 100).
- The webhook function will have `verify_jwt = false` in `supabase/config.toml`.
- Reuses existing patterns: `PageLayout`, `useDriverCredentials`, `qrcode.react`, sonner toasts.

### Out of scope (unless you want it)
- Admin dashboard/reporting across all drivers' collections.
- Refunds or partial payments.
