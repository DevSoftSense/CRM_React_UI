# SoftOnCloud CRM — React UI (`CRM_React_UI`)

Velzon shell + SoftOnCloud login (same pattern as Appointment).

## Env files (like Appointment — only 2)

| File | When used | Product API | SoftOnCloud | App id |
|------|-----------|-------------|-------------|--------|
| `.env` | `npm start` (**local**) | `http://localhost:5191` | `https://api.softoncloud.com` | **28** |
| `.env.production` | `npm run build` (**live**) | `https://crmapi.softoncloud.com` | `https://api.softoncloud.com` | **28** |

Key vars:

```
REACT_APP_DEFAULTAUTH=crm
REACT_APP_CRM_PRODUCT_ID=28
REACT_APP_API_URL=...
REACT_APP_SOFTONCLOUD_API_URL=https://api.softoncloud.com
```

## Run (local)

1. Start CRM API: `CRM_API/CRM.API` → http://localhost:5191  
2. UI:

```bash
cd CRM_UI/CRM_React_UI
npm start
```

3. Browser opens → **`/`** → landing (`/landing`); click **Sign in** → `/login`  
4. Enter SoftOnCloud **Organisation ID**, admin **email**, **password** → Sign In  
5. After success → `/dashboard-crm` with JWT (CRM product **28** access required)

## Login flow

```
UI /login
  → SoftOnCloud POST /api/auth/login
  → SoftOnCloud GET /api/auth/resolve-context?productId=28
  → CRM API POST /api/auth/session-renew
  → store JWT → /dashboard-crm
```

Admin must have SoftOnCloud access to product **28** (CRM).
