# Render Deployment Guide

## Backend Deployment (Django)

### 1. Prepare Django Settings
Update `backend/config/settings/prod.py` (or create if missing):

```python
# Ensure these are set:
DEBUG = False
ALLOWED_HOSTS = ['your-backend.onrender.com', 'localhost']

DATABASES = {
    'default': dj_database_url.config(conn_max_age=600)
}

CORS_ALLOWED_ORIGINS = [
    "https://your-frontend.onrender.com",
    "http://localhost:3000",
]

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
WHITENOISE_AUTOREFRESH = True

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
```

### 2. Create Django Web Service on Render

1. Go to **render.com** → **Dashboard** → **New +** → **Web Service**
2. Connect your GitHub repository
3. Fill in:
   - **Name**: `product-sheet-backend`
   - **Environment**: `Python 3.11`
   - **Build Command**: `cd backend && pip install -r requirements/prod.txt && python manage.py migrate && python manage.py collectstatic --noinput`
   - **Start Command**: `cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT`

4. Set Environment Variables:
   - `DJANGO_SETTINGS_MODULE`: `config.settings.prod`
   - `SECRET_KEY`: (generate a secure random string)
   - `DEBUG`: `False`
   - `DATABASE_URL`: (Render provides this if you attach a PostgreSQL database)
   - `CORS_ALLOWED_ORIGINS`: `https://your-frontend.onrender.com`

5. Click **Create Web Service**

---

## Frontend Deployment (Next.js)

### 1. Create Next.js Web Service on Render

1. Go to **render.com** → **Dashboard** → **New +** → **Web Service**
2. Connect your GitHub repository
3. Fill in:
   - **Name**: `product-sheet-frontend`
   - **Environment**: `Node`
   - **Build Command**: `cd frontend && pnpm install && pnpm build`
   - **Start Command**: `cd frontend && pnpm start`

4. Set Environment Variables:
   - `BACKEND_BASE_URL`: `https://your-backend.onrender.com` (the URL from your Django service)
   - `NODE_ENV`: `production`

5. Click **Create Web Service**

---

## Step-by-Step Instructions

### 1. Push to GitHub (if not done already)
```bash
git add .
git commit -m "Deploy to Render"
git push origin main
```

### 2. Create PostgreSQL Database on Render (Optional but Recommended)
1. **Dashboard** → **New +** → **PostgreSQL**
2. Set:
   - **Name**: `product-sheet-db`
   - **Region**: Choose closest to you
3. Connect it to your Django service in the web service settings

### 3. Get Your Backend URL
Once the backend service is deployed:
- Copy the service URL (e.g., `https://product-sheet-backend.onrender.com`)
- Update the frontend environment variable `BACKEND_BASE_URL`

### 4. Update Frontend to Point to Backend
In `frontend/.env.production`:
```
BACKEND_BASE_URL=https://product-sheet-backend.onrender.com
```

Or set it in Render's environment variables for the frontend service.

### 5. Deploy

Render automatically deploys when you:
- Edit environment variables
- Push to GitHub (if auto-deploy is enabled)
- Manually click **Deploy** in the dashboard

---

## Troubleshooting

**Backend won't start?**
- Check build logs: `Settings` → `Build Logs`
- Verify `DATABASE_URL` is set
- Ensure migrations run: check `Logs` tab

**Frontend shows 404 errors?**
- Check `BACKEND_BASE_URL` matches your actual backend URL
- Clear browser cache or open in incognito

**CORS errors?**
- Update `CORS_ALLOWED_ORIGINS` in Django settings
- Rebuild backend after changing

**Static files not loading?**
- Ensure `collectstatic` runs in build command
- Check frontend Build Logs

---

## Costs
- First 750 hours per month on free tier (should cover one service running 24/7)
- Both services fit comfortably in free tier initially
- Upgrade to paid tier only when needed

