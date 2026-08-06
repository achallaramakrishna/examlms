# ExamLMS — Production Deployment

Production runs on the same VPS as the other RoboDynamics products (`robodynamics.in`), sharing nginx but with its own systemd service, its own PostgreSQL database, and its own directory tree under `/opt/examlms`. It is **not** Docker in production — Docker Compose (`docker-compose.yml`) is dev-only.

## 1. Server layout

| Component | Location |
|---|---|
| Backend code | `/opt/examlms/backend` |
| Backend build output | `/opt/examlms/backend/dist` |
| Backend env file | `/opt/examlms/backend/.env` (root-only, `600`) |
| Uploaded question images | `/opt/examlms/backend/public/question-images` |
| Frontend static build | `/opt/examlms/frontend-dist` |
| systemd unit | `/etc/systemd/system/examlms-backend.service` |
| nginx config | `/etc/nginx/sites-enabled/default` (the site actually served — **not** `sites-available/robodynamics.in`, which is unused) |
| Node runtime | `/opt/nvm/versions/node/v20.20.2` (scoped via nvm, separate from any system Node) |
| Database | PostgreSQL 16 + pgvector, DB `examlms`, user `examlms`, `localhost:5432` |
| Cache/queue | Redis, `localhost:6379` |

Backend listens on **port 4010** internally; it is never exposed directly, only through the nginx proxy below.

## 2. nginx routing

```nginx
location ^~ /examlms-api/ {
    proxy_pass http://127.0.0.1:4010/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /examlms {
    return 301 /examlms/;
}

location ^~ /examlms/ {
    alias /opt/examlms/frontend-dist/;
    try_files $uri $uri/ /examlms/index.html;
}
```

`/examlms-api/` strips to the backend root, so the backend's own `/api` mount means the frontend must call `/examlms-api/api/...`. The frontend build bakes this in via `VITE_API_BASE_URL` (see below) — it is not something nginx rewrites.

## 3. systemd service

```ini
[Unit]
Description=ExamLMS Backend (Express API)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
WorkingDirectory=/opt/examlms/backend
ExecStart=/opt/nvm/versions/node/v20.20.2/bin/node /opt/examlms/backend/dist/server.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/examlms/backend/.env
User=root

[Install]
WantedBy=multi-user.target
```

Manage it with `systemctl {status,restart,stop} examlms-backend`.

## 4. Backend `.env` keys

The file lives only on the server (`/opt/examlms/backend/.env`), never in git. Keys required (see `backend/.env.example` for the shape):

```
NODE_ENV=production
PORT=4010
CORS_ORIGIN=https://robodynamics.in
DATABASE_URL=
DB_HOST=localhost
DB_PORT=5432
DB_USER=examlms
DB_PASSWORD=
DB_NAME=examlms
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=
PUBLIC_ASSET_BASE_URL=https://robodynamics.in/examlms-api
```

`OpenAI`/`JWT`/`Google` secrets must be generated or copied by you directly on the server — never paste API keys or credentials into a chat session or have an assistant transfer them between environments.

## 5. Deploying a backend change

Run locally in `backend/`, then on the server:

```bash
# Local: build first, verify tsc has no errors
npm run build
```

```bash
# Package and upload (adjust paths/tar name as needed)
tar -czf /tmp/examlms-backend.tar.gz -C backend dist package.json package-lock.json
scp -i ~/.ssh/robodynamics_id /tmp/examlms-backend.tar.gz root@robodynamics.in:/tmp/
```

```bash
# On the server
ssh -i ~/.ssh/robodynamics_id root@robodynamics.in
cd /opt/examlms/backend
tar -xzf /tmp/examlms-backend.tar.gz
npm ci --omit=dev
npm run migration:run          # only if new migrations were added
systemctl restart examlms-backend
systemctl status examlms-backend --no-pager
```

Migrations run against the same `src/config/database.ts` data source (`typeorm-ts-node-commonjs migration:run -d src/config/database.ts`), so `ts-node` and dev dependencies must be present when running migrations — do not `npm prune` before that step.

## 6. Deploying a frontend change

The frontend is a static Vite build; there's no frontend process to restart, just files to replace.

```bash
# Local, in frontend/ — VITE_BASE_PATH and VITE_API_BASE_URL are what make the
# build work under the /examlms/ subpath instead of at domain root
VITE_BASE_PATH=/examlms/ VITE_API_BASE_URL=/examlms-api/api npm run build
```

```bash
tar -czf /tmp/examlms-frontend.tar.gz -C frontend/dist .
scp -i ~/.ssh/robodynamics_id /tmp/examlms-frontend.tar.gz root@robodynamics.in:/tmp/
ssh -i ~/.ssh/robodynamics_id root@robodynamics.in "rm -rf /opt/examlms/frontend-dist/* && tar -xzf /tmp/examlms-frontend.tar.gz -C /opt/examlms/frontend-dist"
```

No nginx reload or service restart needed — nginx serves the new static files immediately.

## 7. Post-deploy verification

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://robodynamics.in/examlms/
curl -s -o /dev/null -w "%{http_code}\n" https://robodynamics.in/examlms-api/api/exams
ssh -i ~/.ssh/robodynamics_id root@robodynamics.in "systemctl status examlms-backend --no-pager | head -10"
```

Then load `https://robodynamics.in/examlms/` in a browser and exercise the actual change — an HTTP 200 proves the server responded, not that the feature works.

## 8. Dev-before-prod discipline

Always build and verify in the local Docker dev stack (`docker-compose.yml`; containers `examlms-frontend`, `examlms-backend`, `examlms-postgres`, `examlms-redis`) before touching production. Docker's hot-reload is unreliable on Windows — `docker restart examlms-frontend` / `examlms-backend` after source changes if you don't see them reflected.
