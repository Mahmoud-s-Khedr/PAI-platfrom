# Authentication and admin access

Learning content remains public. Google and email/password sign-in are both
available. `/admin` and every `/api/admin/*` endpoint require an authenticated
user whose role is currently granted as `admin`.

## Google Cloud setup

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. In **Google Auth Platform** → **Branding**, set the application name,
   support email, and developer contact details.
3. Set the audience to **External**. Until the app is published, add each
   developer account under **Test users**. Include
   `mahmoud.s.khedr.2@gmail.com` if it will administer the platform.
4. In **Google Auth Platform** → **Clients**, create an OAuth client of type
   **Web application**.
5. Add this local authorized redirect URI exactly:

   ```text
   http://localhost:5173/api/auth/google/callback
   ```

6. Before production, add this exact production redirect URI, replacing the
   placeholder with the deployed hostname:

   ```text
   https://<production-host>/api/auth/google/callback
   ```

   The scheme, hostname, path, case, and trailing slash behavior must exactly
   match the redirect URI configured in Google. This application uses a server
   redirect flow, so no authorized JavaScript origin is required.
7. Copy the generated **Client ID** and **Client secret**. They are Worker
   secrets: never expose them as `VITE_*` values or commit them to Git.

The client requests only `openid email profile`. The Worker uses the
authorization-code flow with PKCE, validates the OAuth state, and verifies the
Google ID token issuer, audience, signature, expiry, and verified-email claim.

## Local development

Copy the ignored template and fill in the Worker secrets and initial admin
credentials:

```bash
cp .dev.vars.example .dev.vars
openssl rand -hex 32
```

Use the generated random value for `SESSION_SECRET`:

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=the-output-of-openssl-rand-hex-32
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a-unique-password-with-at-least-12-characters
```

`ADMIN_EMAIL` and `ADMIN_PASSWORD` are consumed only by the local bootstrap
command. It writes a salted PBKDF2-SHA-256 hash to D1, creates or updates the
admin grant, and invalidates that account's existing sessions. They are not
Worker runtime secrets and must not be committed.

Then migrate the local D1 database, seed only the clearly marked demo learning
content, bootstrap the administrator, and start the app:

```bash
npm run db:migrate:local
npm run db:seed:local
npm run db:bootstrap-admin:local
npm run dev
```

Open `http://localhost:5173` (not `127.0.0.1`, unless that URI is also added
to Google). Use the email/password form with the bootstrap credential, or sign
in with a configured Google test user. Google users whose normalized email has
an `admin` grant can also administer the platform.

## Production setup

After the remote D1 migration has been deliberately applied following the
production deployment guide, set the Worker secrets interactively:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

Use a separate, strong production `SESSION_SECRET`. Confirm the production
redirect URI is registered in Google before deploying; otherwise Google returns
`redirect_uri_mismatch`.

After applying the remote migration, bootstrap the production administrator
from a protected CI environment or an interactive shell. Do not put the values
in `wrangler.jsonc` or Worker secrets because the Worker never needs the
plaintext password:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='a unique production password' npm run db:bootstrap-admin:remote
```

## Roles and sessions

`role_grants` is the authorization source of truth. Roles are checked from that
table on every authenticated request, so removing an admin grant takes effect
immediately for existing sessions. Google accounts are linked by their
immutable `sub`; an email/password admin can later use Google with the same
email and remain the same local user.

Sessions are opaque, HttpOnly, SameSite=Lax cookies valid for seven days. Only
their SHA-256 hashes are stored in D1. Passwords are never stored directly;
only salted PBKDF2-SHA-256 hashes are retained. Cookies are `Secure` outside
`localhost`; logout deletes the current D1 session and clears the browser cookie.

`/admin` and `/admin/*` are deliberately Worker-first asset routes. A guest is
redirected to `/login?returnTo=/admin`; a signed-in student receives a localized
403 page before the SPA shell is served. API requests keep the JSON error shape:
`401 ADMIN_AUTH_REQUIRED` for no valid session and `403 ADMIN_ACCESS_DENIED`
for a non-admin user.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `redirect_uri_mismatch` | The URI in Google exactly matches the local or production callback above. |
| Google blocks the sign-in | The account is a configured test user, or the consent screen has been published. |
| Sign-in returns a configuration error | `.dev.vars` has the Google values and `SESSION_SECRET` is at least 32 characters. |
| Email/password sign-in fails | Run the bootstrap command after migration; confirm the email and password in the command environment match the intended credential. |
| Signed-in user cannot open `/admin` | The user is a student. Confirm the normalized email has an `admin` entry in `role_grants`; the authorization change already applies to the current session. |
