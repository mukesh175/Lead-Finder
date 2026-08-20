# LeadFinder

Turn **any keyword** into a lead database. LeadFinder searches the public web for
relevant businesses, analyses their websites for publicly listed contact details,
scores every prospect, stores it in PostgreSQL and exports it to CSV.

Nothing in the architecture is niche-specific: `Shopify developer`,
`dentist New York`, `lawyer in London` and `restaurant owner Dubai` all run
through exactly the same code path.

---

## What LeadFinder does — and does not — do

LeadFinder discovers **publicly available business and professional contact
information**. It does **not** provide private information about individual
search-engine users.

- Search engines do not expose who searched for a keyword, and LeadFinder never
  claims a person searched for anything unless the source itself shows that intent.
- Every stored contact keeps the exact public **source URL** and the **method**
  used to obtain it (`search_result_metadata` or `public_website_page`).
- Emails are never guessed or generated. If no public address is found, the field
  stays empty.
- Website analysis is a small, polite, same-domain crawl (5 pages per lead by
  default) with timeouts, rate limiting and SSRF protection.
- Search results come from an approved search API. Google result pages are never
  scraped.

---

## Tech stack

| Layer      | Choice                                             |
| ---------- | -------------------------------------------------- |
| Framework  | Next.js (App Router), React, **JavaScript** (no TS) |
| UI         | Bootstrap 5 (no Tailwind)                           |
| Database   | Neon PostgreSQL via Prisma ORM                      |
| Auth       | Email + password, bcrypt hash, signed JWT cookie    |
| Hosting    | Vercel (serverless-friendly, free-tier first)       |

---

## 1. Install dependencies

```bash
npm install
```

## 2. Configure Neon

1. Create a free project at [neon.tech](https://neon.tech).
2. Copy the **pooled** connection string (it contains `-pooler`).
3. Put it in `DATABASE_URL` — keep `?sslmode=require`.

## 3. Configure environment variables

```bash
cp .env.example .env
```

| Variable                     | Required                | Purpose                                                            |
| ---------------------------- | ----------------------- | ------------------------------------------------------------------ |
| `DATABASE_URL`               | yes                     | Neon PostgreSQL connection string.                                  |
| `NEXTAUTH_SECRET`            | yes                     | Secret used to sign session cookies (`openssl rand -base64 32`).    |
| `SEARCH_PROVIDER`            | yes                     | `mock` (offline development data) or `google`.                      |
| `SEARCH_API_KEY`             | only for `google`       | Google Programmable Search API key.                                 |
| `SEARCH_ENGINE_ID`           | only for `google`       | Programmable Search engine id (`cx`).                               |
| `EMAIL_VERIFICATION_API_KEY` | no                      | Enables real email verification. Without it, emails show *Not checked*. |

Optional tuning variables (limits, crawl settings and every lead-scoring weight)
are listed in `.env.example` with their defaults.

## 4. Run the Prisma migration

```bash
npx prisma generate
npx prisma migrate dev
```

For an existing production database (Vercel/Neon):

```bash
npx prisma migrate deploy
```

## 5. Start local development

```bash
npm run dev
```

Open <http://localhost:3000>, create an account and run your first search. With
`SEARCH_PROVIDER=mock` the entire pipeline — extraction, scoring, dedupe,
persistence, export — runs offline without consuming any API credits.

## 6. Deploy to Vercel

1. Push this repository to GitHub and import it in Vercel.
2. Add the environment variables from step 3 in **Project → Settings → Environment Variables**.
3. Deploy. `npm run build` runs `prisma generate` first, which is what Prisma
   needs on Vercel's build cache.
4. Run `npx prisma migrate deploy` once against your production `DATABASE_URL`
   (locally or from a Vercel build/CI step).

Production build:

```bash
npm run build
```

---

## Product flow

```
keyword (+ optional location, result count)
   -> public web search (provider abstraction)
   -> per-result website analysis (same-domain, bounded, SSRF-safe)
   -> public email / phone / social / address extraction
   -> normalisation + deduplication
   -> lead scoring (0-100)
   -> PostgreSQL
   -> dashboard, filters, CSV export
```

### Search jobs

A search never runs as one long serverless request:

1. `POST /api/search` creates the `Search` (status `PROCESSING`) and queues the
   provider results.
2. The client calls `POST /api/search/{id}/run` repeatedly; each call processes a
   small bounded batch (`SEARCH_BATCH_SIZE`, default 5) and returns live progress.
3. When the queue empties the search flips to `COMPLETED` (or `FAILED`).

Because the batch entry point is a plain function (`processBatch` in
`lib/leads/pipeline.js`), the same job can later be driven by a background queue
worker without touching the UI or the API contract.

### Lead scoring

| Signal                        | Default weight | Env var                 |
| ----------------------------- | -------------- | ----------------------- |
| Website found                 | +15            | `SCORE_WEBSITE`         |
| Public email found            | +25            | `SCORE_EMAIL`           |
| Public phone found            | +10            | `SCORE_PHONE`           |
| Keyword match                 | +20            | `SCORE_KEYWORD_MATCH`   |
| Location match                | +10            | `SCORE_LOCATION_MATCH`  |
| Contact page found            | +5             | `SCORE_CONTACT_PAGE`    |
| Business identified           | +10            | `SCORE_COMPANY`         |
| Verified on the source site   | +5             | `SCORE_RELEVANT_SOURCE` |

Categories: `80-100 Hot`, `60-79 Warm`, `40-59 Potential`, `0-39 Low`.

### Free-tier limits

| Limit                  | Default | Env var                  |
| ---------------------- | ------- | ------------------------ |
| Searches per day       | 10      | `MAX_SEARCHES_PER_DAY`   |
| Max results per search | 100     | `MAX_RESULTS_PER_SEARCH` |
| Max pages per website  | 5       | `MAX_PAGES_PER_LEAD`     |

Remaining quota is shown in the top bar and on the settings page.

---

## API

All routes return the same envelope:

```json
{ "success": true, "data": {}, "error": null }
{ "success": false, "data": null, "error": { "code": "SEARCH_LIMIT_REACHED", "message": "Daily search limit reached." } }
```

| Route                        | Methods            | Purpose                                    |
| ---------------------------- | ------------------ | ------------------------------------------ |
| `/api/auth/register`         | POST               | Create an account and sign in.             |
| `/api/auth/login`            | POST               | Sign in.                                   |
| `/api/auth/logout`           | POST               | Sign out.                                  |
| `/api/auth/me`               | GET                | Current user.                              |
| `/api/search`                | POST               | Start a search job.                        |
| `/api/search/{id}`           | GET, DELETE        | Read or delete a search.                   |
| `/api/search/{id}/status`    | GET                | Progress without doing work.               |
| `/api/search/{id}/run`       | POST               | Process the next batch.                    |
| `/api/searches`              | GET                | Search history.                            |
| `/api/leads`                 | GET, PATCH         | Filtered/paginated list, bulk actions.     |
| `/api/leads/{id}`            | GET, PATCH, DELETE | Single lead.                               |
| `/api/leads/export`          | GET                | CSV export (all / filtered / selected).    |
| `/api/keywords`              | GET, POST, DELETE  | Saved keywords with lead counts.           |
| `/api/settings`              | GET, PATCH         | Preferences and integration status.        |
| `/api/stats`                 | GET                | Dashboard counters.                        |

Every protected route calls `requireUser()` server-side — route protection is
never left to the frontend — and every mutating route validates the request
origin and its JSON body with Zod.

---

## Security

- bcrypt password hashing, HTTP-only `SameSite=Lax` session cookies (secure in production).
- Server-side authentication **and** authorization on every API route; all lead
  queries are scoped to the signed-in user.
- Zod validation on every request body and query string.
- In-memory rate limiting per IP plus a durable daily search quota.
- Prisma parameterised queries (no raw SQL string building).
- SSRF protection when fetching discovered URLs: scheme allow-list, blocked
  hostnames, DNS resolution checks against private/link-local/metadata ranges,
  redirect re-validation, request timeouts and a maximum response size.
- CSV export escapes spreadsheet formula characters.
- `X-Frame-Options`, `X-Content-Type-Options` and `Referrer-Policy` response headers.

---

## Project structure

```
app/
  page.js                 landing page
  login/ register/        authentication
  (app)/                  authenticated shell (sidebar + top bar)
    dashboard/ find-leads/ leads/ leads/[id]/ searches/ keywords/ settings/
  api/                    REST-style route handlers
components/               Sidebar, Topbar, SearchForm, LeadTable, Filters, ...
lib/
  prisma.js auth.js api.js config.js rateLimit.js
  search/    searchProvider.js googleProvider.js mockProvider.js
  email/     extractor.js verifier.js
  leads/     pipeline.js scorer.js dedupe.js query.js csv.js serialize.js
  crawler/   crawler.js safeFetch.js parse.js
  validation/schemas.js
prisma/schema.prisma
```

### Swapping providers

`lib/search/searchProvider.js` exposes `search({ keyword, location, limit })` and
returns `{ title, url, snippet, displayLink }`. To add a provider, implement that
interface, register it in the `providers` map and set `SEARCH_PROVIDER`.
`lib/email/verifier.js` works the same way for email verification.
