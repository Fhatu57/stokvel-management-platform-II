# Portfolio deployment checklist

This guide creates an independently owned deployment without relying on the original team's Supabase or Azure accounts.

## 1. Supabase project

1. Create a Supabase project under the portfolio owner's account.
2. Open the SQL editor and run `supabase/migrations/001_initial_schema.sql` once.
3. In **Authentication → URL Configuration**, set the production site URL.
4. Add these redirect URLs:
   - `http://localhost:3000/index.html`
   - `https://YOUR_AZURE_APP.azurewebsites.net/index.html`
5. Copy the project URL and public anonymous key into `frontend/config.js`.

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

## 4. Azure App Service

1. Create a Linux Node.js App Service using Node.js 24.
2. Set the startup command to `npm start` if Azure does not detect it automatically.
3. Configure the health check path as `/api/health`.
4. Download the App Service publish profile.
5. In the personal GitHub repository, create:
   - Variable `AZURE_WEBAPP_NAME` containing the App Service name.
   - Secret `AZURE_WEBAPP_PUBLISH_PROFILE` containing the complete publish profile.
6. Push or merge the portfolio branch into `main`.
7. Watch the **Deploy portfolio to Azure** workflow.

## 5. Release verification

- Landing page returns HTTP 200.
- Recruiter demo opens without authentication.
- Member, treasurer and administrator demo switches work.
- `/api/health` returns `{ "status": "healthy" }`.
- Google sign-in returns to the production site.
- Sign-out clears the session.
- Browser console contains no errors.
- No service keys, publish profiles or `.env` files are tracked by Git.
- README contains the final live URL and screenshots.
