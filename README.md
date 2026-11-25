# ZOOL FOOD

Arabic-first, RTL multi-vertical delivery marketplace for restaurants, pharmacies and supermarkets.

## Stack
- Next.js 14 App Router + TypeScript
- Supabase Postgres, Auth and row-level security
- Vercel deployment target

## Local setup
1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anon key.
4. Run `npm run dev`.

## Implemented in this repository
- Responsive Arabic customer storefront with restaurant, pharmacy and supermarket discovery.
- Demo store/product catalogs, search, category filters, product selection and client-side cart.
- Approved-store listing from Supabase when public environment variables are configured.
- Login-protected merchant, courier and admin portal routes under `/portal`.
- Merchant product creation and order status controls, courier availability/job claiming, and admin store approval UI.
- Supabase schema for profiles, addresses, stores, catalogs, orders, delivery, transactions, reviews and notifications.
- RLS policies for customer/merchant/courier/admin access, protected role and store-approval fields, atomic server-side order pricing/VAT/stock checks, status transitions and courier job claiming.
- Security advisor check completed with no security lint findings.

## Not yet production-ready
This is an implementation foundation and customer/operations UI, not a launched delivery service. No Vercel project/deployment has been created yet. Before taking real orders:
- Configure Supabase URL and publishable key in Vercel project environment.
- Configure and test Auth providers, redirect URLs, and customer/merchant/courier/admin accounts.
- Run end-to-end tests for every RLS policy and workflow using separate test accounts.
- Connect a Saudi payment provider and signed payment webhooks.
- Configure SMS/OTP, maps/geocoding, push notifications and real-time courier location.
- Build the full prescription upload/review flow and obtain required pharmacy/regulatory approvals.
- Complete operational policies for refunds, cancellations, merchant onboarding, courier onboarding, monitoring, backups and privacy/legal compliance.

No service-role key, payment secret or other credential is committed. Never expose the Supabase service-role key to browser code.
