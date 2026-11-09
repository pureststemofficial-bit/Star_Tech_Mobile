# Startech Mobile

Electronics store website (phones, accessories, gaming, laptops and repairs) built from `story_board.jpeg`, with a full admin panel.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16** (App Router, React Server Components, Server Actions) |
| Language | **TypeScript** (strict) |
| UI | **shadcn/ui** components (Radix UI) + **Tailwind CSS v4**, lucide icons, sonner toasts, self-hosted Geist and Instrument Serif fonts |
| Database | **SQLite** via Node's built-in `node:sqlite` (no database server to install) |
| Images | **sharp**: uploads are validated, resized and converted to WebP |

Requires **Node.js 22.13+** (Node 24 recommended).

## Run it

```bash
npm install
npm run build
npm start                # http://localhost:3000   (development: npm run dev)
```

On the first request the app creates `data/store.db` with a demo catalogue and an admin account, and prints the admin password **once** in the terminal. To choose your own, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env` before the first start, or at any time run:

```bash
npm run create-admin -- you@yourshop.co.uk "a-long-passphrase-123"
```

Admin panel: **/admin**

Set `SITE_URL` in `.env` so the sitemap and social previews use your real address.

Other scripts: `npm test` (library tests), `npm run typecheck`, `npm run generate-art` (regenerates the demo SVG artwork).

## Languages

The storefront is available in **English** and **European Portuguese**. First-time visitors get the language their browser prefers; the EN/PT switch in the header saves their choice in a cookie. The admin panel stays in English.

- Interface text: `src/lib/i18n/messages.ts`
- Shop content: each product, category, page and setting has Portuguese fields in the admin panel (**Portuguese version**). A blank field falls back to English.
- Prices are in euros in both languages.

## Project structure

```
src/
  app/(site)/        storefront pages: home, shop, product, cart, checkout, repairs, account…
  app/admin/         admin login + (panel)/ dashboard, products, orders, repairs, settings…
  app/uploads/       route that serves uploaded images
  actions/           Server Actions (all form submissions)
  components/ui/     shadcn/ui components
  components/        site, product, shop, admin and form components
  lib/               database, sessions, auth, cart, catalogue, validation, images
  proxy.ts           per-request Content-Security-Policy nonce
data/                SQLite database + uploaded images (created at runtime; back this up)
```

## What the admin panel controls

| Section | What you can do |
|---|---|
| Dashboard | Revenue, orders today, new repairs, low stock, 14-day revenue chart |
| Orders | Filter/search, status (Processing → Shipped → Out for delivery → Delivered / Cancelled), payment status, tracking number. Cancelling returns stock. |
| Products | Add/edit/hide/delete; price, "was" price (sale badge), stock, features, specs, colours, storage options with extra cost, best-seller flag, multiple images |
| Categories | Name, menu label, order, show in menu, show as home tile, tile image |
| Repairs | All bookings; status, quote (shown to the customer), internal notes |
| Messages | Contact-form messages, reply by email |
| Reviews | Customer reviews stay hidden until approved |
| Customers | List, spend, disable/enable accounts |
| Blog | Write, hide and delete articles in English and Portuguese, with a cover image, publication date and an optional button linking to a shop or repair page |
| Pages | About, Why Choose Us, Terms, Privacy, Returns, Delivery, FAQs |
| Settings | Store name, home banner text/button/image, feature strip, banners, repair options, contact details, map, social links, delivery charges, checkout payment options |

## Speed

- Pages are rendered on the server, and only the interactive parts (add to cart, gallery, filters, menus) ship JavaScript
- HTML is gzip-compressed to about 30–33 KB per page; server render time is about 25–90 ms locally
- Uploaded images are resized and converted to WebP in two sizes, lazy-loaded, and cached by browsers for a year
- SQLite runs in WAL mode with indexed, prepared queries; settings and categories are cached in memory

## Security

- **Passwords:** scrypt with a random salt; timing-safe comparison; login takes the same time whether or not an email exists
- **Sessions:** a random 256-bit ID in an HttpOnly, SameSite=Lax cookie (Secure in production); only a SHA-256 hash is stored in the database. The ID is rotated on login, and other sessions are revoked on a password change or when an account is disabled
- **CSRF:** Next.js Server Actions only accept same-origin POST requests
- **XSS:** React escapes all output; a strict Content-Security-Policy with a per-request nonce means only the app's own scripts can run; admin page text uses a safe formatter (HTML is never rendered); admin links must be `https://` or site paths
- **Headers:** HSTS (production), `frame-ancestors 'none'` / X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP
- **SQL injection:** every query is parameterised; sort orders and filters come from fixed whitelists
- **Rate limiting:** login, registration, checkout, contact, repair, review and cart actions; contact and repair forms also have honeypot spam traps
- **Uploads:** admin only. Each file is decoded to check it's a real image, size-limited, re-encoded to WebP (which strips metadata and payloads), and given a random name. They're served with a sandboxing CSP
- **Access control:** every admin page *and* every admin Server Action checks the admin role; customers only see their own orders and addresses; guest order tracking needs the order number *and* email; redirect targets are validated
- **Money:** prices and stock are always read from the database at checkout; stock is decremented in a transaction, so it can't oversell

Note: `style-src` allows inline styles because Radix UI and sonner position elements with them. Scripts remain strictly nonce-based.

## Deploying to production

1. `cp .env.example .env` and set the values (see comments in the file).
2. `npm ci && npm run build && npm start`, or use a process manager such as `pm2 start npm --name startech -- start`.
3. Serve it over **HTTPS** behind Nginx, Caddy or Cloudflare, and set `TRUST_PROXY=1`.
4. Back up the `data/` folder regularly; it holds the database and uploaded images.
5. Sign in to `/admin`, change the password, then replace the demo products and artwork with your own.

The rate limiter and SQLite database are designed for a single server, which suits most shops. To run several servers, move to a shared database and a Redis rate limiter.

## Online card payments

With `STRIPE_SECRET_KEY` set in `.env`, checkout offers **Card** alongside the options configured in **Settings**. Card details are entered on Stripe's hosted page. The order takes its stock when placed, becomes *Paid* when Stripe confirms payment, and is cancelled with its stock returned if the customer backs out or the 30-minute payment window ends. Other payment options still arrive as *Unpaid* for you to mark *Paid* in the admin.

**Before going live**, set `SITE_URL`, then in the Stripe dashboard add a webhook endpoint for `https://your-domain/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`. Without the webhook, a customer who pays but closes the tab before returning stays *Unpaid*, and abandoned payments keep their stock reserved.

## shadcn/ui

The components in `src/components/ui` are standard shadcn/ui components, themed with the design tokens in `src/app/globals.css`. `components.json` is set up, so you can add more with `npx shadcn@latest add <component>`.
