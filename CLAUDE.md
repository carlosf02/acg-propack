# CLAUDE.md — ACG ProPack

## Project Overview

ACG ProPack is a warehouse and shipment management web application. It lets companies manage warehouse receipts, track packages, handle storage locations, create shipments, manage clients, and process billing—all in one system. It also provides a client portal so end customers can view their packages and shipments.

Key capabilities:
- Warehouse receipt and package tracking
- Storage location management
- Shipment creation and tracking
- Role-based access control (ADMIN/STAFF/CLIENT)
- Stripe-powered subscription billing and onboarding
- Client portal (separate UX from the admin dashboard)
- Consolidation management for multi-office operations

---

## Tech Stack

### Frontend
- **React 19** + **TypeScript 5** via **Vite 7**
- **React Router v7** for client-side routing
- **Stripe** (`@stripe/react-stripe-js`, `@stripe/stripe-js`) for payment forms
- **Vanilla CSS** — scoped `.css` files per feature, no Tailwind or CSS-in-JS

### Backend
- **Python 3** + **Django 6** + **Django REST Framework 3**
- **SQLite** (default dev database; production should use PostgreSQL)
- **django-cors-headers**, **django-filter**
- **Stripe Python SDK** for billing
- **pytest** + **pytest-django** for testing

### Auth
- Django session-based authentication (no JWTs)
- CSRF token management for SPA

---

## Folder Structure

```
acg-propack/
├── frontend/                  # React/TypeScript SPA
│   └── src/
│       ├── api/               # Centralized API client and endpoint definitions
│       │   ├── client.ts      # Fetch wrapper (CSRF, cookies, error handling)
│       │   ├── endpoints.ts   # Single source of truth for all API paths
│       │   └── types.ts       # Shared API types
│       ├── assets/            # Static images, logos
│       ├── components/        # Shared/reusable components
│       │   ├── icons/         # SVG icon components
│       │   └── public/        # Public-facing components (SetupBanner, StripePaymentForm)
│       ├── features/          # Feature modules (see below)
│       ├── layouts/           # Layout wrappers (AppLayout, PublicLayout)
│       └── pages/             # Top-level page components (dashboard, profile, etc.)
│           └── client/        # Client portal pages
└── backend/
    ├── api/v1/                # Auth endpoints, health check, CSRF bootstrap
    ├── billing/               # Stripe onboarding, invoices
    ├── clients/               # Client model, user profiles, client portal API
    ├── company/               # Company, CompanyMember, Office, RBAC permissions
    ├── consolidation/         # Consolidation operations
    ├── core/                  # TimeStampedModel, CompanyScopedViewSetMixin, status enums
    ├── inventory/             # InventoryBalance, InventoryTransaction
    ├── receiving/             # WarehouseReceipt, WarehouseReceiptLine
    ├── shipping/              # Shipment, ShipmentItem
    ├── warehouse/             # Warehouse, StorageLocation
    ├── config/                # Django settings, root URLs, WSGI/ASGI
    └── docs/                  # API, models, services, and testing reference docs
```

**Feature module layout** (consistent across all features):
```
features/<name>/
├── <name>.api.ts      # API call functions for this feature
├── types.ts           # TypeScript types
└── pages/             # Page components
    ├── List<Name>Page.tsx
    └── Create<Name>Page.tsx
```

---

## Running the Project

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add Stripe keys if needed
python manage.py migrate
python manage.py runserver
```

- API: `http://127.0.0.1:8000/api/v1/`
- Admin panel: `http://127.0.0.1:8000/admin/`
- Health check: `http://127.0.0.1:8000/api/v1/health/`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Dev server: `http://localhost:5173/`
- Vite proxies all `/api` requests to `http://localhost:8000` — no CORS issues in dev.

Other frontend scripts:
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build

---

## Coding Conventions

### Backend

**Models**
- All models extend `TimeStampedModel` (from `core/models.py`) for `created_at`/`updated_at`.
- Status enums use Django's `TextChoices` (e.g., `WRStatus`, `ShipmentStatus`).
- Use `on_delete=models.PROTECT` on ForeignKeys for master data—never silently cascade.
- Most models have a `company = ForeignKey('company.Company')` for multi-tenancy scoping.
- Soft deletes via `is_active = BooleanField(default=True)`; viewsets set `is_active=False` instead of calling `delete()`.

**ViewSets**
- Use `viewsets.ModelViewSet` for standard CRUD.
- Override `get_queryset()` to filter by company.
- Override `perform_create()` to auto-attach `company`.
- Use `CompanyScopedViewSetMixin` (from `core/mixins.py`) to apply company filtering automatically.
- Custom actions via `@action(methods=['post'], detail=True/False)`.
- Set `admin_only_writes = True` on a viewset to restrict POST/PATCH/PUT/DELETE to admins.

**Permissions**
- Permission classes live in `company/permissions.py`.
- Check `get_active_company_member(user)` (from `company/utils.py`) for membership + role.
- Superusers bypass company checks (fallback to first company in DB).

**Serializers**
- Use `ModelSerializer` with explicit `fields` in Meta.
- Use `SerializerMethodField` for computed/read-only values.

**API Response Shapes**
- Lists: `{"count": N, "results": [...]}` (DRF pagination)
- Errors: `{"detail": "message"}` or `{"field_name": ["error message"]}`

### Frontend

**API layer**
- All API calls go through `src/api/client.ts`. Use `apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete`.
- All endpoint URLs are defined in `src/api/endpoints.ts`—never hardcode paths in components.
- Errors throw `ApiError`; always `catch (err)` and check `err instanceof ApiError`.

**Components and pages**
- Functional components only, with hooks.
- File and component names are `PascalCase`.
- Each feature owns its API file, types, and pages—no cross-feature imports except through `src/api/`.
- CSS files are scoped per feature/page (e.g., `ListWarehousePage.css`).

**State management**
- Auth state is in `AuthContext` (`features/auth/AuthContext.tsx`); access via `useAuth()`.
- All other state is component-local `useState`. No Redux/Zustand.

**TypeScript**
- Strict mode is on. Avoid `any`.
- Define prop interfaces explicitly (e.g., `interface CreateWarehousePageProps { ... }`).

---

## Gotchas and Patterns

### Session Auth + CSRF in SPA
Django session cookies are used, not tokens. The frontend must:
1. Call `ensureCsrf()` (in `api/client.ts`) before any mutating request to bootstrap the `csrftoken` cookie.
2. The `apiPost`/`apiPatch`/etc. wrappers read `csrftoken` from `document.cookie` and send it as the `X-CSRFToken` header automatically.
3. All fetch calls include `credentials: "include"` so cookies are sent.
4. The Vite proxy is essential—it makes `/api` calls same-origin so cookies work.

### Multi-Tenancy
Every model that belongs to a company has a `company` FK. Never fetch data without scoping to the user's active company. Use `CompanyScopedViewSetMixin` to get this for free in ViewSets.

### Admin vs Client Portals
- `UserProfile.role` is either `ADMIN`/`STAFF` (company staff) or `CLIENT` (end customer).
- The `/me` endpoint returns `auth_role`. The frontend routes users to `/dashboard` or `/client/*` accordingly.
- `AuthGate` in `App.tsx` enforces this on every navigation.
- Client users have onboarding flags: `must_change_password`, `profile_completed`, `notifications_configured`.

### Billing & Onboarding Flow
- New companies sign up through a Stripe-backed checkout flow.
- `CreateOnboardingSessionView` is a public endpoint that creates an `OnboardingSession` and a Stripe `SetupIntent`.
- `FinalizeOnboardingView` creates the local `User` + `Company` after payment confirmation.
- Stripe keys must be in `.env` (see `.env.example`).

### Consolidation Validation
`Consolidation.clean()` enforces that the sending office is owned by the company and the receiving office is either own or an associate. Violations raise `ValidationError` before save.

### CORS and Trusted Origins
Allowed origins are hardcoded in `config/settings.py`:
- `localhost:5173`, `127.0.0.1:5173`, `localhost:5174`, `127.0.0.1:5174`

If you run the frontend on a different port, update `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS` in settings.

### Pagination
All list endpoints are paginated. Frontend code consuming list responses must use `.results` to get the array and `.count` for the total.

### Running Tests
```bash
cd backend
pytest
```
Config is in `backend/pytest.ini`. Tests are colocated with each app (e.g., `clients/tests.py`).

### Backend Docs
Detailed references live in `backend/docs/`:
- `API_REFERENCE.md` — endpoint inventory
- `MODELS_REFERENCE.md` — all models and fields
- `SERVICES_REFERENCE.md` — service layer functions
- `TESTING_REFERENCE.md` — test patterns
