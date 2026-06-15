# Supabase Setup — Email OTP Auth & Cloud Sync

Inferno works fully offline with no configuration (stats live in `localStorage`).
To enable **email sign-in (one-time code)** and **cross-device cloud sync**,
connect a Supabase project by following the steps below.

When the env vars are absent, the app silently stays in local-only mode: the
user menu is hidden and every cloud call is a no-op. Nothing crashes.

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**.
2. Note the project's **Project URL** and **anon public key**
   (Settings → API).

## 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

`.env.local` is git-ignored. Restart `npm run dev` after editing.

## 3. Apply the database schema

Open **SQL Editor** in the Supabase dashboard, paste the full contents of
[`supabase/schema.sql`](../supabase/schema.sql), and run it. This creates:

- Tables: `profiles`, `user_stats`, `game_sessions`, `achievements`,
  `user_achievements`, `daily_progress`
- **Row Level Security** on every user table (each user can only read/write
  their own rows; the `achievements` catalog is read-only to authenticated
  users)
- A trigger that auto-creates a `profile` + `user_stats` row on first signup
- The achievement catalog seed (kept in sync with
  `src/game/achievements.ts`)
- A `leaderboard_global` view + indexes for future leaderboards

The script is idempotent — safe to re-run.

## 4. Enable email (one-time code) auth

Email auth is enabled by default — no OAuth provider or redirect URIs needed.

1. In Supabase: **Authentication → Providers → Email** → ensure it's enabled.
   "Confirm email" can stay on; OTP works regardless.
2. Make the email deliver a **code** rather than just a magic link. Go to
   **Authentication → Email Templates → Magic Link** and ensure the template
   includes the token, e.g.:

   ```html
   <p>Your login code is: <strong>{{ .Token }}</strong></p>
   ```

   `{{ .Token }}` is the 6-digit code the app's "Enter code" field expects.
   (A magic-link `{{ .ConfirmationURL }}` can remain too, but the app uses the
   code.)
3. For local testing without real email delivery, use the **Inbucket** mailbox
   in `supabase start`, or read the code from **Authentication → Logs**. In
   production, configure SMTP under **Project Settings → Auth → SMTP**.

> No Google Cloud Console, OAuth client, or redirect URI configuration is
> required.

## 5. Run

```bash
npm install
npm run dev
```

Click **Sign in** in the top-right user menu, enter your email, then the code
from the email.

---

## How sync works

| Event | What happens |
| --- | --- |
| App start | Session is restored; auth changes are subscribed. |
| First sign-in | One-time migration uploads existing local stats **only if** the cloud profile is empty (never overwrites cloud). Then cloud stats hydrate the local view. |
| Session complete | `game_sessions` insert + `daily_progress` upsert + `user_stats` recompute (XP, level, streak) + new achievements inserted. All fire-and-forget; failures show a toast and the local save still stands. |
| Sign out | Auth state cleared; app returns to local-only behavior. |

### Streaks

`user_stats.current_streak` / `last_played_date` advance by one on consecutive
calendar days, hold on same-day replays, and reset after a missed day. Logic is
pure and unit-tested in `src/game/streak.ts`.

### Leaderboards (future)

`src/services/leaderboard.ts` exposes `getGlobalLeaderboard`,
`getWeeklyLeaderboard`, and `getDailyLeaderboard` against `game_sessions`
(+ `profiles`). Not yet surfaced in the UI, but the schema, indexes, and data
access are in place so they can be added without refactoring.

> Note: with RLS enabled, users only see their own `game_sessions`. To show a
> true global leaderboard, expose it via a `security definer` RPC or a public
> view/materialized view (the `leaderboard_global` view is provided as a
> starting point).

## Security notes

- The anon key is safe to ship in a client bundle; RLS is what protects data.
- All access is scoped to `auth.uid()`. A user can never read or modify another
  user's `profiles`, `user_stats`, `game_sessions`, `user_achievements`, or
  `daily_progress` rows.
