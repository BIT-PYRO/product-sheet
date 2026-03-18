# 🚀 Quick Deploy to Render Guide

## Prerequisites
1. **GitHub**: Push your code to GitHub
2. **Render Account**: Create free account at https://render.com
3. **PostgreSQL**: Render provides free tier

---

## **Step 1: Generate Secret Keys** 

Run this in your terminal to generate secure keys:

```bash
# Generate Django SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Generate JWT key (32 chars)
openssl rand -base64 32
```

Keep these values safe—you'll need them in Step 3.

---

## **Step 2: Push Code to GitHub**

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

Make sure all files are committed, including:
- `render.yaml`
- `frontend/.env.production`
- `RENDER_DEPLOYMENT.md`
- `Procfile`

---

## **Step 3: Create Services on Render**

### **Option A: Using render.yaml (Recommended)**

1. Go to **https://dashboard.render.com**
2. Click **New +** → **Blueprint**
3. Select your GitHub repository
4. Render auto-detects `render.yaml` and creates both services
5. Set environment variables (see below)
6. Click **Apply** to deploy

### **Option B: Manual Service Creation**

#### **A. Backend Service**

1. **Dashboard** → **New +** → **Web Service**
2. Connect GitHub repository
3. Choose your branch (main/master)
4. Configure:
   - **Name**: `product-sheet-backend`
   - **Environment**: `Python 3.11`
   - **Region**: Choose closest to you
   - **Build Command**: 
     ```
     cd backend && pip install -r requirements/prod.txt && python manage.py migrate && python manage.py collectstatic --noinput
     ```
   - **Start Command**: 
     ```
     cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
     ```

5. **Environment Variables** (add these under Settings → Environment):
   ```
   DJANGO_SETTINGS_MODULE = config.settings.prod
   DEBUG = False
   SECRET_KEY = (paste your generated key)
   JWT_SIGNING_KEY = (paste your generated key)
   CORS_ALLOWED_ORIGINS = https://product-sheet-frontend.onrender.com
   ```

6. Click **Create Web Service**

**Wait for deployment to finish** (5-10 minutes). Note the backend URL: 
```
https://product-sheet-backend.onrender.com
```

---

#### **B. PostgreSQL Database (Optional but Recommended)**

1. **Dashboard** → **New +** → **PostgreSQL**
2. Configure:
   - **Name**: `product-sheet-db`
   - **Region**: Same as backend
   - **PostgreSQL Version**: 15
3. Click **Create Database**

4. Copy the `Internal Database URL` (shown in info panel)

5. Go back to **Backend Service** → **Settings** → **Environment Variables**

6. Add:
   ```
   DATABASE_URL = (paste the Internal URL)
   ```

7. Manually trigger deploy by clicking **Manual Deploy** or push a new commit

---

#### **C. Frontend Service**

1. **Dashboard** → **New +** → **Web Service**
2. Connect GitHub repository
3. Configure:
   - **Name**: `product-sheet-frontend`
   - **Environment**: `Node`
   - **Region**: Same as backend
   - **Build Command**: 
     ```
     cd frontend && pnpm install && pnpm build
     ```
   - **Start Command**: 
     ```
     cd frontend && pnpm start
     ```

4. **Environment Variables**:
   ```
   NEXT_PUBLIC_BACKEND_BASE_URL = https://product-sheet-backend.onrender.com
   NODE_ENV = production
   ```

5. Click **Create Web Service**

**Wait for deployment** (3-5 minutes). Once complete, you'll get:
```
https://product-sheet-frontend.onrender.com
```

---

## **Step 4: Verify Deployment**

### Test Backend
```bash
curl https://product-sheet-backend.onrender.com/

# Should return:
# {"success": true, "message": "Product Sheet backend is running.", "docs": "/api/docs/swagger/"}
```

### Test Frontend
Visit: https://product-sheet-frontend.onrender.com

You should see your app load!

---

## **Step 5: Post-Deployment Setup**

### Update Backend CORS
If you get CORS errors, update your backend environment variable:

1. Backend Service → **Environment**
2. Update `CORS_ALLOWED_ORIGINS`:
   ```
   https://product-sheet-frontend.onrender.com,http://localhost:3000
   ```
3. Save and trigger **Manual Deploy**

### Create Admin User
```bash
# Click "Shell" on your backend service
python manage.py createsuperuser
```

Then visit: `https://product-sheet-backend.onrender.com/admin/`

### Run Migrations (If Needed)
```bash
# In backend service Shell
python manage.py migrate
```

---

## **Common Issues & Fixes**

| Problem | Solution |
|---------|----------|
| **Frontend shows blank page** | Check browser console for errors. Ensure `BACKEND_BASE_URL` is correct |
| **Backend returns 502 Error** | Check build logs. Usually a missing package or migration error |
| **Database connection failed** | Verify `DATABASE_URL` is set. Re-paste the connection string |
| **Static files 404** | Ensure `collectstatic` ran in build. Check Logs tab |
| **CORS errors** | Update `CORS_ALLOWED_ORIGINS` in backend environment variables |

---

## **Costs**

- **Free Tier**: 750 hours/month = 1 service running 24/7 ✅
- Both services fit in free tier initially
- Database: 90-day free trial on PostgreSQL
- Upgrade only when you exceed limits

---

## **Enable Auto-Deploy**

Both services auto-deploy when you push to GitHub. To disable or configure:
- Service → **Settings** → **Auto-Deploy** toggle

---

## **Useful Commands**

View backend logs:
```bash
# In Render dashboard → Backend Service → Logs
```

View build output:
```bash
# Render dashboard → Backend Service → Build Logs
```

SSH into backend:
```bash
# Click "Shell" tab in service
```

---

## **Success Checklist**

- ✅ Backend service deployed and running
- ✅ Frontend service deployed and running  
- ✅ Database connected (if using PostgreSQL)
- ✅ Environment variables set correctly
- ✅ CORS configured for frontend origin
- ✅ Admin user created
- ✅ Migrations run successfully
- ✅ Frontend loads and connects to backend

---

## **Next Steps**

1. Monitor logs for any errors
2. Test all features
3. Set up monitoring/alerts (optional)
4. Consider custom domain (Render provides free SSL)

**Happy deploying! 🎉**
