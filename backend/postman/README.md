# Postman Auth Flow Quick Guide

This folder contains Postman assets for Day-3 auth flow testing.

## Files
- `auth-flow.postman_collection.json`
- `local.postman_environment.json`
- `dev.postman_environment.json`
- `staging.postman_environment.json`

## Import in Postman
1. Open Postman.
2. Click **Import**.
3. Import `auth-flow.postman_collection.json`.
4. Import one environment file (`local`, `dev`, or `staging`).
5. Select the imported environment from the top-right environment dropdown.

## Configure variables
Open the selected environment and verify/update:
- `baseUrl` (e.g., `http://127.0.0.1:8000`)
- `username`
- `password`

Leave these empty initially (they are auto-filled by request scripts):
- `accessToken`
- `refreshToken`

## Run order
Run requests in this exact order:
1. **Auth - Login**
2. **Auth - Refresh**
3. **Auth - Me**

## Expected behavior
- **Auth - Login** stores `accessToken` and `refreshToken`.
- **Auth - Refresh** updates `accessToken`.
- **Auth - Me** uses `Authorization: Bearer {{accessToken}}` and returns user profile data.

## Common issues
- 401 on `Auth - Me`: run `Auth - Login` again to refresh tokens.
- 404 on auth endpoints: ensure backend route prefix is `/api/v1/auth/`.
- Connection error: verify `baseUrl` and backend server status.
