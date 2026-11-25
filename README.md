# ZOOL FOOD

Arabic-first, RTL multi-vertical delivery marketplace for restaurants, pharmacies and supermarkets.

## Stack
- Next.js 14 App Router + TypeScript
- Supabase Postgres, Auth and RLS
- Vercel deployment target

## Local setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anon key.
4. Run `npm run dev`.

## Implemented
- Responsive Arabic customer storefront with restaurant, pharmacy and supermarket verticals.
- Store discovery, search and demo product catalogs.
- Product selection and cart quantity controls.
- Supabase approved-store loading when public environment variables are configured.
- Database foundation for profiles, stores, products, addresses, orders, deliveries, payments, reviews and notifications.
- RLS-protected catalog ownership, protected admin-controlled account/store approval fields, atomic order placement with server-side price calculation, VAT and stock checks, controlled order state transitions, courier job claiming.

## Production launch requirements
This repository is a working foundation, not yet a production-ready delivery business. Before accepting customers:
- Add Supabase URL and publishable key to the Vercel project environment.
- Configure Auth providers, email/SMS templates and redirect URLs.
- Test the full RLS matrix with customer, merchant, courier and admin accounts.
- Build and verify merchant, courier and admin user interfaces and operational workflows.
- Integrate a Saudi payment gateway and signed webhooks; configure maps, address geocoding, SMS/OTP and push notifications.
- Configure secure prescription image storage and pharmacist review with local regulatory approval.
- Add order tracking/live courier location, cancellation/refund rules, monitoring, backups and automated tests.
- Complete legal, tax, privacy and marketplace onboarding requirements.

No service-role key, payment secret or other credential is committed. Never expose Supabase service-role keys in browser code.
