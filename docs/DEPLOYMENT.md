# Portfolio deployment checklist

This guide creates an independently owned deployment without relying on the original team's Supabase or Azure accounts. The public frontend and backend are deployed from one Render Blueprint.

## 1. Supabase project

1. Create a Supabase project under the portfolio owner's account.
2. Open the SQL editor and run `supabase/migrations/001_initial_schema.sql` once.
3. In **Authentication → URL Configuration**, set the production site URL.
4. Add these redirect URLs:
   - `http://localhost:3000/index.html`
   - `https://YOUR_FRONTEND.onrender.com/index.html`
5. Copy the project URL and public anonymous key. They are entered as Render build settings later and are not committed to Git.

Do not copy or expose the service-role key.

### Bootstrap the first administrator

After the portfolio owner signs in once, run this query in the Supabase SQL editor. Replace the email with the actual owner email.

```sql
update public.user_roles
set role = 'admin'
where user_id = (
  select id from public.profiles where lower(email) = lower('OWNER_EMAIL_HERE')
);
```

## 2. Google OAuth

1. Create a Google Cloud project.
2. Configure the OAuth consent screen.
3. Create a Web application OAuth client.
4. Use this authorised redirect URI:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

5. Add the Google client ID and client secret to the Google provider settings in Supabase.
6. Test sign-in from a private browser window.

## 3. Personal GitHub repository

Create an empty public repository under the portfolio owner's profile. Preserve the original contributor history when pushing this portfolio branch.

Recommended repository name:

```text
stokvel-management-platform
```

Before pushing, confirm that the remote points to the personal repository and not the original team repository.

## 4. Render frontend and backend

The repository's `render.yaml` creates both services together.

1. Sign in to Render and connect the personal GitHub repository.
2. Select **New → Blueprint** and choose this repository.
3. Confirm the `render.yaml` path and review the two free services:
   - `stokvel-platform-web` — static frontend.
   - `stokvel-platform-api` — Node/Express backend.
4. Enter these values when Render requests them for the frontend service:
   - `SUPABASE_URL` — the public Supabase project URL.
   - `SUPABASE_ANON_KEY` — the public anonymous key, never the service-role key.
5. Deploy the Blueprint and wait for both services to report **Live**.
6. Copy the static frontend URL into Supabase's site URL and redirect URL settings.
7. Confirm that subsequent pushes deploy only after the GitHub test workflow passes.

Render's free backend can sleep after inactivity, but the static frontend remains fast. The authenticated application stores its persistent data in Supabase, not on the Render service's temporary filesystem.

## 5. Release verification

- Landing page returns HTTP 200.
- The real landing page opens from the static frontend URL.
- A user can sign in and reach the correct role dashboard.
- `/api/health` returns `{ "status": "healthy" }`.
- Google sign-in returns to the production site.
- Sign-out clears the session.
- Browser console contains no errors.
- No service keys, publish profiles or `.env` files are tracked by Git.
- README contains the final live URL and screenshots.
