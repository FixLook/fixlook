# FixLook MVP

FixLook is a marketplace MVP for ordering verified electricians and plumbers without phone calls. Customers create a service order, upload photos, admins assign professionals manually, professionals accept and complete jobs, customers pay with Stripe Checkout, and completed jobs can be rated.

## Stack

- Next.js 15 App Router with TypeScript
- Tailwind CSS with shadcn/ui-style local components
- Supabase Auth, PostgreSQL, Storage, and RLS
- Stripe Checkout in test mode
- Vercel deployment target

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill `.env.local`:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

## Supabase setup

1. Create a new project at Supabase.
2. Open SQL Editor.
3. Run `supabase/migrations/001_init.sql`.
4. Run `supabase/seed.sql`, or run the TypeScript seed:

   ```bash
   npm run seed
   ```

5. In Authentication settings, add the site URL:

   ```text
   http://localhost:3000
   ```

6. Add the callback URL:

   ```text
   http://localhost:3000/auth/callback
   ```

7. To make a user an admin after registration:

   ```sql
   update public.profiles
   set role = 'admin'
   where email = 'admin@example.com';
   ```

## Stripe setup

1. Create a Stripe account and use test mode.
2. Copy test publishable and secret keys into `.env.local`.
3. For local webhook testing:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the generated `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.
5. Use a Stripe test card such as `4242 4242 4242 4242`.

The app also confirms successful payments through the Stripe success URL, so local demos work even before webhook forwarding is configured.

## Main routes

- Public: `/`, `/login`, `/register`
- Customer: `/customer/dashboard`, `/customer/orders/new`, `/customer/orders/[id]`, `/customer/payments/[orderId]`, `/customer/ratings`, `/customer/profile`
- Professional: `/master/dashboard`, `/master/orders`, `/master/orders/[id]`, `/master/profile`
- Admin: `/admin/dashboard`, `/admin/orders`, `/admin/professionals`, `/admin/services`, `/admin/payments`

## MVP order flow

1. Customer creates an order. Status becomes `new`.
2. Admin assigns a professional. Status becomes `assigned`.
3. Professional accepts. Status becomes `accepted`.
4. Customer pays by Stripe Checkout. Status becomes `in_progress`.
5. Professional completes the job. Status becomes `completed`.
6. Customer leaves a rating.

## Deployment to Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables from `.env.example`.
4. Set `NEXT_PUBLIC_APP_URL` to your production URL.
5. In Supabase Auth settings, add your production URL and `/auth/callback` redirect URL.
6. In Stripe, add a webhook endpoint:

   ```text
   https://your-domain.com/api/stripe/webhook
   ```

7. Deploy.

## Notes

- Prices are stored in cents.
- Commission is calculated as 20% of the paid amount.
- `SUPABASE_SERVICE_ROLE_KEY` is only used server-side for payment sync and rating aggregate updates.
- Future AI diagnostics, automatic matching, referral rewards, mobile apps, and push notifications are intentionally excluded from this MVP.
