# Cost-per-use tracker

A personal asset tracker that answers one question about everything you own: **what has this
actually cost you per day, or per use?**

Not a shopping list. Each item carries a purchase price, a resale value once it is sold, and
either a holding period or a usage count — so a camera bought for ¥6,000, used 40 times, and
resold for ¥3,500 reports ¥75 per use rather than ¥6,000 of sunk cost. Items you have not
bought yet sit in a watch state and are excluded from every total until they become real.

It replaced a Markdown table I maintained by hand in Obsidian. The table worked until the
arithmetic did not — recomputing cost-per-use across sixty rows after every sale is not
something to do by hand — so this keeps the data in Postgres and still imports from and
exports back to that Markdown format.

> The interface is in Chinese. Item states are 观望中 (watching), 持有中 (owned),
> 已退役 (retired), 咸鱼ing (listed for resale), 已卖出 (sold); pricing is 按天 (per day)
> or 按次 (per use).

---

## Stack

Next.js 15 (App Router, Server Actions) · React 19 · TypeScript · Supabase (Postgres, Auth,
Row Level Security) · Tailwind · deployed on Vercel

---

## Three decisions worth explaining

### Money is integer cents, never floating point

Every amount — purchase price, resale value, derived net cost — is stored and computed as
`integer` cents. Cost-per-use divides one integer by another and rounds once, at the end.
Floating-point currency produces totals that are off by a cent and disagree with themselves
depending on the order you sum them; the fix is to never introduce the float.

### An item cannot be attached to another user's category — structurally

Row Level Security already restricts every read and write to `auth.uid() = user_id`, and the
insert and update policies additionally check that the target category belongs to the caller.

The schema then enforces the same rule a second time, independently:

```sql
constraint categories_user_id_id_key unique (user_id, id)

constraint items_user_category_fk
  foreign key (user_id, category_id)
  references public.categories(user_id, id)
  on delete restrict
```

Because the foreign key spans `(user_id, category_id)` rather than `category_id` alone, an
item pointing at a category owned by somebody else is not a policy violation to be caught at
runtime — it is a row Postgres will not accept. RLS is the door; this is the wall. A bug in
the application layer cannot produce cross-tenant data, and neither can a direct SQL session
that bypasses the app entirely.

### The migration refuses to run on data it would corrupt

Adding those constraints to a table that already holds rows is where migrations quietly
destroy things. [`202604250001_harden_inventory_constraints.sql`](supabase/migrations/202604250001_harden_inventory_constraints.sql)
opens by *looking for the violations first* — orphaned categories, items owned by one user
pointing at another user's category, negative amounts — and raises an exception if it finds
any, before altering anything. Every `alter` is guarded by an existence check against
`pg_constraint`, so re-running it is a no-op rather than an error, and the whole thing is one
transaction.

A migration that fails loudly on bad data is worth more than one that succeeds and leaves you
to discover the damage later.

---

## Run it

Requires a Supabase project.

```bash
cp .env.example .env.local     # fill in the three required values
npm install
npm run dev
```

Apply the schema in the Supabase SQL editor:

```text
supabase/schema.sql                                        # tables, RLS, triggers
supabase/migrations/202604250001_harden_inventory_constraints.sql
```

| Variable | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `ADMIN_EMAIL` | The single address allowed to sign in. Unset means nobody gets in. |
| `DATABASE_URL` | Optional, only for applying migrations from a local shell |

`ADMIN_EMAIL` is a deliberate single-tenant gate: the deployment is public on the internet,
and the app is for one person, so sign-in is allowlisted to one address rather than open to
anyone who completes the OAuth flow.

```bash
npm run lint        # eslint, zero warnings tolerated
npm run typecheck   # tsc --noEmit
npm test            # node --test
```

See [`docs/APP_AND_DEPLOYMENT.md`](docs/APP_AND_DEPLOYMENT.md) for the full field reference
and the Vercel deployment steps.

## Licence

MIT
