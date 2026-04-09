# Local secrets and configuration (team setup)

**Do not commit real passwords, connection strings, or API keys to Git.** Share production or shared dev credentials only through a password manager, encrypted channel, or your professor’s approved method—not in Slack history or issues.

## Backend (.NET User Secrets)

The API reads sensitive values from [.NET User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) (development) or environment variables / Azure App Service **Configuration** (deployment).

From the project directory:

```bash
cd backend/Intext2/Intext2
```

### Required keys

| Secret key | Purpose |
|------------|---------|
| `ConnectionStrings:DefaultConnection` | Azure SQL connection string |
| `GenerateDefaultIdentityAdmin:Email` | Seeded admin login email |
| `GenerateDefaultIdentityAdmin:Password` | Seeded admin password (**min 14 characters** per Identity policy) |
| `GenerateDefaultCaseManager:Email` | Seeded case manager login email |
| `GenerateDefaultCaseManager:Password` | Seeded case manager password (**min 14 characters**) |
| `GenerateDefaultDonor:Email` | Seeded donor login email |
| `GenerateDefaultDonor:Password` | Seeded donor password (**min 14 characters**) |

### Example commands (replace placeholders)

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "YOUR_AZURE_SQL_CONNECTION_STRING"
dotnet user-secrets set "GenerateDefaultIdentityAdmin:Email" "YOUR_ADMIN_EMAIL"
dotnet user-secrets set "GenerateDefaultIdentityAdmin:Password" "YOUR_ADMIN_PASSWORD_14PLUS_CHARS"
dotnet user-secrets set "GenerateDefaultCaseManager:Email" "YOUR_CASE_MANAGER_EMAIL"
dotnet user-secrets set "GenerateDefaultCaseManager:Password" "YOUR_CASE_MANAGER_PASSWORD_14PLUS_CHARS"
dotnet user-secrets set "GenerateDefaultDonor:Email" "YOUR_DONOR_EMAIL"
dotnet user-secrets set "GenerateDefaultDonor:Password" "YOUR_DONOR_PASSWORD_14PLUS_CHARS"
```

### SMTP (donation confirmation emails)

Configure via the same User Secrets store or Azure settings. Keys map to the `Smtp` section in configuration:

| Key | Purpose |
|-----|---------|
| `Smtp:Host` | SMTP server hostname |
| `Smtp:Port` | Port (often 587) |
| `Smtp:Username` | SMTP login |
| `Smtp:Password` | SMTP password or app password |
| `Smtp:FromAddress` | From email address |
| `Smtp:FromName` | Display name (optional) |
| `Smtp:EnableSsl` | `true` / `false` |

```bash
dotnet user-secrets set "Smtp:Host" "smtp.example.com"
dotnet user-secrets set "Smtp:Port" "587"
dotnet user-secrets set "Smtp:Username" "YOUR_SMTP_USER"
dotnet user-secrets set "Smtp:Password" "YOUR_SMTP_PASSWORD"
dotnet user-secrets set "Smtp:FromAddress" "noreply@yourdomain.org"
```

`appsettings.json` in the repo keeps **empty** placeholders for SMTP and connection strings so no credentials are committed.

Verify (shows keys and values locally—**never paste this output into Git or chat**):

```bash
dotnet user-secrets list
```

The project’s `UserSecretsId` is in `Intext2.csproj`; each machine has its own secret store tied to that ID.

## Database schema updates

After pulling, apply EF migrations (or run the SQL script if your team uses it):

```bash
cd backend/Intext2/Intext2
dotnet ef database update
```

Optional manual script (same intent as migration `AddPortalLinkColumns`): [`database/add_portal_link_columns.sql`](../database/add_portal_link_columns.sql).

On first run after seed config exists, the API will:

- Link the donor user to a `supporters` row (create one if needed).
- Assign residents without a case manager to the seeded case manager (demo data).

## Frontend

| Variable | Purpose |
|----------|---------|
| `VITE_API_BASE_URL` | Production build: HTTPS URL of the deployed API. |

Local `npm run dev` uses the Vite proxy to `/api` by default (see `frontend/vite.config.ts`). For production builds, set `VITE_API_BASE_URL` in your CI or `frontend/.env.production` (that file may point at Azure; **do not commit real secrets**—use pipeline variables when possible).

Root `.gitignore` includes `.env` so local overrides stay out of Git.

## CORS (deployed frontend URL)

The API allows cookie-based auth only from listed origins. Defaults include both common Static Web App hostnames (`…1.azurestaticapps.net` and `…5.azurestaticapps.net`). To add another preview or production URL without redeploying code, set **Configuration** entries:

- `Cors__AllowedOrigins__0` = `https://your-app.azurestaticapps.net`
- `Cors__AllowedOrigins__1` = … (increment index for more)

Or add the origin in `appsettings.json` under `Cors:AllowedOrigins` for local overrides only (do not commit real production-only URLs if your team prefers env-only).

If login fails in the browser with **No 'Access-Control-Allow-Origin'** on the preflight `OPTIONS` request, the backend is usually missing **`UseRouting()` before `UseCors`** (fixed in current `Program.cs`) or the deployed site’s exact origin (scheme + host, no trailing slash) is not in the allow list.

## Azure App Service (deployed API)

In **Configuration → Application settings**, add the same keys using **double underscores** for nesting, for example:

- `ConnectionStrings__DefaultConnection`
- `GenerateDefaultIdentityAdmin__Email`
- `GenerateDefaultIdentityAdmin__Password`
- `GenerateDefaultCaseManager__Email`
- `GenerateDefaultCaseManager__Password`
- `GenerateDefaultDonor__Email`
- `GenerateDefaultDonor__Password`
- `Smtp__Host`, `Smtp__Port`, `Smtp__Username`, `Smtp__Password`, `Smtp__FromAddress`, `Smtp__FromName`, `Smtp__EnableSsl`

## Portal logins (reminder)

Users sign in through **Admin**, **Case manager**, or **Donor** on the login page. Each account must have the matching **Identity role** (`Admin`, `CaseManager`, `Donor`). Seeding only runs when the email/password entries above are configured.
