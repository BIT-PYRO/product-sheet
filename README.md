# product-sheet-design
Product Sheet Design Application

## Django Backend (Day-1 Setup)

Backend lives in `backend/` and is configured to use PostgreSQL via environment variables.

### 1) Configure environment

- Copy `backend/.env.example` to `backend/.env` (already added for local development).
- Update PostgreSQL credentials if your local DB settings differ.

### 2) Install dependencies

From project root:

```bash
pip install -r backend/requirements/base.txt
```

### 3) Run Django checks and migrations

```bash
cd backend
python manage.py check
python manage.py migrate
python manage.py runserver
```

If PostgreSQL is not running, start PostgreSQL first and ensure database/user credentials in `backend/.env` are valid.
