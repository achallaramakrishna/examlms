# Frontend production deploy (robodynamics.in)

App is served at **`/examlms/`**, API at **`/examlms-api/`**. Always build with both:

```bash
cd frontend
VITE_BASE_PATH=/examlms/ VITE_API_BASE_URL=/examlms-api/api npm run build
# then sync dist/ → /opt/examlms/frontend-dist/ on the server
```

| Missing env | Symptom |
|-------------|---------|
| `VITE_BASE_PATH=/examlms/` | White screen — JS/CSS 404 at `/assets/...` |
| `VITE_API_BASE_URL=/examlms-api/api` | Shell loads but Practice/Exams/Learn data empty — calls hit `/api` (404) |
