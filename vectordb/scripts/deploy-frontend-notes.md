# Frontend production deploy (robodynamics.in)

App is served at **`/examlms/`**. Always build with the base path:

```bash
cd frontend
VITE_BASE_PATH=/examlms/ npm run build
# then sync dist/ → /opt/examlms/frontend-dist/ on the server
```

If you build without `VITE_BASE_PATH`, `index.html` points at `/assets/...` and the site renders blank (404 on JS/CSS).
