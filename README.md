# Product Sheet Design — Jewellery Business Management Software

Link to access the software: https://product-sheet-frontend.onrender.com/

A full-stack internal business management application built for a jewellery manufacturing and retail operation. It covers product cataloguing, inventory tracking, order management, workforce administration, customer KYC, and job-sheet workflows — all connected to a single deployed backend and database.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Backend Modules](#backend-modules)
5. [Frontend Pages & Features](#frontend-pages--features)
6. [Frontend API Routes](#frontend-api-routes)
7. [Reusable Components](#reusable-components)
8. [Accessing the Software](#accessing-the-software)
9. [Local Development Setup](#local-development-setup)
10. [Deployment (Render)](#deployment-render)
11. [Environment Variables](#environment-variables)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | Next.js 16 (React 19) | Server + client rendering, file-based routing, API routes |
| **Frontend Language** | TypeScript / JavaScript (JSX) | UI components and page logic |
| **Styling** | Tailwind CSS v3 | Utility-first responsive styling |
| **UI Component Library** | Radix UI + shadcn/ui | Accessible headless components (dialogs, dropdowns, checkboxes, etc.) |
| **Icons** | Lucide React | Consistent icon set across all pages |
| **File Parsing** | xlsx (SheetJS) | Parsing `.xlsx` / `.csv` files for bulk uploads |
| **PDF Parsing** | pdf-parse | Extracting text from picklist PDFs |
| **Charts** | Recharts | Dashboard and inventory visualisations |
| **Package Manager** | pnpm | Fast, disk-efficient package management |
| **Backend Framework** | Django 5 + Django REST Framework | REST API, models, business logic |
| **Backend Language** | Python 3.11 | All server-side logic and data processing |
| **Authentication** | djangorestframework-simplejwt | JWT access + refresh token auth |
| **Database** | PostgreSQL | Primary relational data store |
| **ORM** | Django ORM | Database queries and migrations |
| **API Schema** | drf-spectacular | Auto-generated OpenAPI docs |
| **Task Queue** | Celery + Redis | Async background tasks |
| **CORS** | django-cors-headers | Cross-origin request handling |
| **Web Server** | Gunicorn | WSGI production server |
| **Static Files** | WhiteNoise | Serving static files in production |
| **Deployment** | Render.com | Hosting both frontend and backend services |
| **Process File** | Procfile | Render process declaration |

---

## Architecture Overview

```
┌──────────────────────────────────────────────┐
│              Browser / Client                │
│  Next.js pages + React components            │
└────────────────────┬─────────────────────────┘
                     │ fetch (same-origin)
┌────────────────────▼─────────────────────────┐
│         Next.js API Routes (/api/*)           │
│  Proxy layer — handles JWT cookies,          │
│  token refresh, and request forwarding       │
└────────────────────┬─────────────────────────┘
                     │ HTTPS + Bearer token
┌────────────────────▼─────────────────────────┐
│       Django REST Framework Backend           │
│   https://product-sheet.onrender.com         │
│   9 apps: products, orders, workforce,        │
│           customers, jobs, inventory,        │
│           kyc, drafts, accounts              │
└────────────────────┬─────────────────────────┘
                     │
┌────────────────────▼─────────────────────────┐
│             PostgreSQL Database               │
└──────────────────────────────────────────────┘
```

All frontend API calls go through internal Next.js proxy routes that automatically attach and refresh JWT tokens — the browser never touches the backend directly.

---

## Project Structure

```
product-sheet-design/
│
├── backend/                        # Django backend
│   ├── accounts/                   # Custom user model + JWT auth
│   ├── common/                     # Shared abstract models & mixins
│   ├── config/                     # Django project settings + WSGI/ASGI
│   │   └── settings/
│   │       ├── base.py             # Common settings
│   │       ├── dev.py              # Local dev overrides
│   │       └── prod.py             # Production overrides
│   ├── customers/                  # B2B customer records
│   ├── drafts/                     # Draft form storage
│   ├── inventory/                  # Stock transactions & picklists
│   ├── jobs/                       # Job creation & assignment
│   ├── kyc/                        # KYC records linked to workforce
│   ├── orders/                     # Customer orders & order items
│   ├── products/                   # Product catalogue & SKUs
│   ├── workforce/                  # Team member records
│   ├── postman/                    # Postman collections for API testing
│   ├── requirements/
│   │   ├── base.txt                # Core dependencies
│   │   └── prod.txt                # Production-only additions
│   └── manage.py
│
├── frontend/                       # Next.js frontend
│   ├── app/
│   │   └── frontend/               # All app routes (remapped via rewrites)
│   │       ├── page.jsx            # Product Sheet (main entry)
│   │       ├── home/               # Dashboard
│   │       ├── login/              # Authentication
│   │       ├── drafts/             # Saved drafts manager
│   │       ├── orders/             # Orders list & create-job & job-sheet
│   │       ├── enrol-workforce/    # Workforce onboarding form
│   │       ├── enrol-customer/     # Customer enrollment form
│   │       ├── company-kyc/        # B2B company KYC form
│   │       ├── managers-dashboard/ # Manager job-card view
│   │       ├── master-product-sheet/    # All products table
│   │       ├── master-inventory-sheet/  # Live inventory + picklist
│   │       ├── master-job-sheet/        # All jobs table
│   │       ├── master-workforce-sheet/  # All workforce members
│   │       ├── master-customer-sheet/   # All customers table
│   │       └── master-kyc-sheet/        # All KYC records
│   │       └── api/                # Next.js proxy API routes
│   ├── components/                 # Reusable React components
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions
│   ├── styles/                     # Global CSS
│   ├── public/                     # Static assets
│   └── next.config.mjs
│
├── docs/                           # Internal documentation
│   └── UI_GUIDELINES.md
├── render.yaml                     # Render deployment config
├── Procfile                        # Process declarations
└── README.md
```

---

## Backend Modules

### `accounts` — Authentication
- Custom `User` model with role fields (admin / manager / staff)
- JWT login via `POST /api/v1/auth/login/`
- Token refresh via `POST /api/v1/auth/refresh/`
- Current user info via `GET /api/v1/auth/me/`

### `products` — Product Catalogue
- `Product` model: SKU, name, category, price, weight, die numbers, findings (JSON), is_active
- Full CRUD at `/api/v1/products/`
- Supports bulk create/update via the frontend bulk upload flow

### `inventory` — Stock Management
- `InventoryTransaction`: IN / OUT / ADJUST transactions per product
- `PicklistGroup` + `PicklistItem`: parsed picklist uploads grouped by date
- Endpoints: `/api/v1/inventory/`, `/api/v1/inventory/picklist-groups/`

### `orders` — Order Management
- `Order` + `OrderItem` models with status workflow: `draft → confirmed → shipped → delivered`
- Customer details, invoice info, and shipping address stored per order
- Actions: confirm, cancel, summary at `/api/v1/orders/`

### `workforce` — Team Members
- `WorkforceMember`: full_name, phone, whatsapp, email, DOB, gender, department, addresses (JSON), GST, languages, notes, active
- Full CRUD + search/filter at `/api/v1/workforce/`

### `kyc` — KYC Records
- `KYCRecord`: one-to-one with `WorkforceMember`, status (pending / approved / rejected), id_number
- CRUD at `/api/v1/kyc/`

### `customers` — B2B Customers
- `Customer`: company name, business type, GST/PAN, address, authorized person, bank details
- Full CRUD at `/api/v1/customers/`

### `jobs` — Job Assignment
- `Job`: title, product reference, assignee (workforce), status workflow: `created → assigned → in_progress → completed`
- CRUD at `/api/v1/jobs/`

### `drafts` — Draft Storage
- `Draft`: entity_type, payload (JSON), owner, status
- Submit/resume actions
- CRUD at `/api/v1/drafts/`

### `common` — Shared Utilities
- `TimeStampedModel`: `created_at` / `updated_at` on every model
- `AuditModel`: adds `created_by` / `updated_by` foreign keys
- `StandardizedSuccessResponseMixin`: uniform JSON response shape `{ success, data, message }`

---

## Frontend Pages & Features

| Page (URL) | Feature |
|-----------|---------|
| `/` (Product Sheet) | Create/edit product records — SKU, images, material, weight, die numbers, findings with location, live stock tracking per production stage, final stock, plating types, stone info, manufacturing notes, variations (color/enamel) |
| `/home` | Dashboard with quick navigation blocks, global search, summary stats |
| `/login` | JWT login with cookie-based session management and auto-redirect |
| `/orders` | Order list with create-order and job-sheet sub-views |
| `/orders/create-job` | New order form with customer lookup, product lines, invoice and shipping details |
| `/orders/job-sheet` | Detailed order view with status actions |
| `/enrol-workforce` | Workforce onboarding — personal details, current/permanent address, languages, department, notes, GST, documents (Aadhaar, PAN, GST) |
| `/enrol-customer` | B2B customer enrollment — company info, GST/PAN, address, authorized person, banking details |
| `/company-kyc` | Full B2B KYC form with document upload (PDF/JPG/PNG) connected to customer backend |
| `/drafts` | View all saved drafts across all modules; resume or delete |
| `/managers-dashboard` | Manager view of job cards with status filtering |
| `/master-product-sheet` | Full product table with search, sort, bulk upload (XLSX/CSV), delete, detail view |
| `/master-inventory-sheet` | Live inventory summary by product + picklist upload (PDF/XLSX) + picklist group management |
| `/master-job-sheet` | All jobs table with status, assignment, bulk upload |
| `/master-workforce-sheet` | All workforce members with search, filter, enroll, bulk upload, delete |
| `/master-customer-sheet` | All customers with search, bulk upload |
| `/master-kyc-sheet` | All KYC records with status + bulk upload |

---

## Frontend API Routes

All routes live under `frontend/app/frontend/api/` and proxy authenticated requests to the backend. JWT tokens are stored in HTTP-only cookies (`psd-access-token`, `psd-refresh-token`) and automatically refreshed.

| Route | Methods | Backend endpoint |
|-------|---------|----------------|
| `/api/auth/login` | POST | `/api/v1/auth/login/` |
| `/api/auth/session` | GET | `/api/v1/auth/me/` + refresh |
| `/api/auth/logout` | POST | Clears cookies locally |
| `/api/backend-info` | GET | Returns backend URL & mode |
| `/api/products` | GET, POST | `/api/v1/products/` |
| `/api/customers` | GET, POST | `/api/v1/customers/` |
| `/api/workforce` | GET, POST | `/api/v1/workforce/` |
| `/api/workforce/[id]` | GET, PATCH, DELETE | `/api/v1/workforce/{id}/` |
| `/api/jobs` | GET, POST | `/api/v1/jobs/` |
| `/api/orders` | GET, POST | `/api/v1/orders/` |
| `/api/inventory` | GET, POST | `/api/v1/inventory/` |
| `/api/inventory/[id]` | PATCH, DELETE | `/api/v1/inventory/{id}/` |
| `/api/kyc` | GET, POST | `/api/v1/kyc/` |
| `/api/kyc/[id]` | GET, PATCH, DELETE | `/api/v1/kyc/{id}/` |
| `/api/drafts` | GET, POST | `/api/v1/drafts/` |
| `/api/drafts/[id]` | PATCH, DELETE | `/api/v1/drafts/{id}/` |
| `/api/picklist-groups` | GET, POST, PATCH | `/api/v1/inventory/picklist-groups/` |
| `/api/inventory-summary` | GET | Aggregated stock per product |
| `/api/product-sheet` | GET, POST, DELETE | Product sheet save/load with live stock sync |
| `/api/bulk-upload` | POST | Parses XLSX/CSV and batch-saves to backend |
| `/api/picklist-upload` | POST | Parses PDF/XLSX picklists |

---

## Reusable Components

Located in `frontend/components/`:

| Component | Purpose |
|-----------|---------|
| `BulkUploadButton` | File picker + POST to `/api/bulk-upload` with status feedback; accepts `sheetType` prop |
| `EnrolWorkforceForm` | Full workforce enrollment dialog with draft save/load |
| `EnrollCustomerForm` | Full customer enrollment dialog with draft save/load |
| `CompanyKYCForm` | B2B KYC form with document upload connected to `/api/customers` |
| `MasterNavigationDrawer` | Side nav drawer shared across all master sheet pages |
| `GlobalSearchBar` | Cross-module search bar |
| `DraftsManager` | Context provider + hooks (`useDrafts`, `useDraftLoader`) for cross-page draft state |
| `CreateJobModal` | Modal for creating a new job linked to a product |
| `QuickEnrollModal` | Fast-enroll shortcut modal |
| `ReceiveJobModal` | Modal for receiving/confirming job completion |
| `PrintVoucherModal` | Voucher print dialog for orders |
| `DataSections` | Section wrapper for product sheet data panels |
| `StockSection` | Live/final stock table panel |
| `ProductFields` | Reusable product field inputs |
| `ProductHeader` | Product sheet top bar with save/delete/navigation |
| `ManagersDashboardJobCard` | Individual job card for the managers dashboard |
| `ImageUpload` | Drag-and-drop image uploader with preview |
| `DateTimeStamp` | Live date/time display component |
| `master_product_sheet` | Products master table with all CRUD and bulk upload |
| `master_inventory_sheet` | Inventory master table + picklist groups |
| `master_job_sheet` | Jobs master table |
| `master_workforce_sheet` | Workforce master table |
| `master-customer-sheet` | Customers master table |
| `master_kyc_sheet` | KYC master table |

---

## Accessing the Software

### Deployed (Production)

The software is deployed on Render.com. Access it at:

- **Frontend:** `https://<product-sheet-frontend>.onrender.com`
- **Backend API:** `https://product-sheet.onrender.com`
- **API Docs (OpenAPI):** `https://product-sheet.onrender.com/api/schema/`

> Ask the project owner for the exact frontend URL and admin credentials.

**Login steps:**
1. Open the frontend URL in your browser.
2. You will be redirected to `/login` automatically if not authenticated.
3. Enter your username and password and click **LOGIN**.
4. On success you are taken to `/home`.

---

### Navigation from Home

| Module | Where to find it |
|--------|----------------|
| Add / edit a product | Click **Product Sheet** or navigate to `/` |
| View all products | **Master Product Sheet** → `/master-product-sheet` |
| Track inventory / picklists | **Master Inventory Sheet** → `/master-inventory-sheet` |
| Jobs & job cards | **Master Job Sheet** → `/master-job-sheet` or **Managers Dashboard** |
| Enroll a worker | **Master Workforce Sheet** → click **Enroll** button |
| View all workers | **Master Workforce Sheet** → `/master-workforce-sheet` |
| Enroll / manage customers | **Enrol Customer** → `/enrol-customer` or **Master Customer Sheet** |
| See KYC status | **Master KYC Sheet** → `/master-kyc-sheet` |
| Company KYC | **Company KYC** → `/company-kyc` |
| View & resume drafts | **Drafts** → `/drafts` |
| Create an order | **Orders** → `/orders` → **Create Order** |

---

## Local Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- pnpm (`npm install -g pnpm`)
- PostgreSQL (running locally)

### 1. Clone the repo

```bash
git clone <repo-url>
cd product-sheet-design
```

### 2. Backend setup

```bash
# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r backend/requirements/base.txt

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your local PostgreSQL credentials

# Run migrations and start
cd backend
python manage.py migrate
python manage.py createsuperuser   # create your first admin user
python manage.py runserver         # runs at http://localhost:8000
```

### 3. Frontend setup

```bash
# From project root
cd frontend
pnpm install

# Set backend URL for local dev (optional — defaults to deployed backend)
# Create frontend/.env.local and add:
# BACKEND_BASE_URL=http://localhost:8000

pnpm dev    # runs at http://localhost:3000
```

### 4. Open the app

Go to `http://localhost:3000` — you will be redirected to `/login`.  
Log in with the superuser credentials you created in step 2.

---

## Deployment (Render)

Both services are defined in `render.yaml` at the project root.

**Backend service** (`product-sheet-backend`):
- Build: `pip install -r requirements/prod.txt && python manage.py migrate && python manage.py collectstatic`
- Start: `gunicorn config.wsgi:application`
- Settings: `config.settings.prod`

**Frontend service** (`product-sheet-frontend`):
- Build: `pnpm install --frozen-lockfile && pnpm build`
- Start: `pnpm start`
- Auto-receives `BACKEND_BASE_URL` from the backend service host

To deploy, push to the connected Git branch. Render auto-deploys on push.

---

## Environment Variables

### Backend (`backend/.env`)

```env
DJANGO_SETTINGS_MODULE=config.settings.dev
SECRET_KEY=your-secret-key
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/dbname
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend (`frontend/.env.local`)

```env
BACKEND_BASE_URL=http://localhost:8000
```

> In production on Render, `BACKEND_BASE_URL` is injected automatically from the backend service.

---

## Security Notes

- Never commit `backend/.env` — it is in `.gitignore`.
- Keep `SECRET_KEY` strong and unique per environment.
- JWT tokens are stored in HTTP-only cookies — not accessible from JavaScript.
- All frontend API calls go through the Next.js proxy layer, so the backend is never exposed directly to the browser.

```powershell
# Quick pre-commit check to ensure .env is not staged (PowerShell)
if (git diff --cached --name-only | Select-String '^backend/.env$') { Write-Error 'Remove backend/.env from staging before commit'; exit 1 } else { 'OK: backend/.env is not staged' }
```

