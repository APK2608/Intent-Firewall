# Deployment Notes

## Local Run

Backend:

```powershell
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Open `http://127.0.0.1:3001`.

## Supabase SQL

Run the SQL in `docs/supabase.sql` in the Supabase SQL Editor before deploying the backend with Supabase persistence enabled.

The backend also has an in-memory fallback, so the demo can still run if the tables are missing, but audit data will not persist across restarts until the SQL is applied.

## Railway Backend

1. Create a Railway service from the `backend` directory.
2. Set the start command to:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

3. Add environment variables in Railway using the existing local `backend/.env` values:

```text
OPENAI_API_KEY
GEMINI_API_KEY
SUPABASE_URL
SUPABASE_KEY
ARMORIQ_API_KEY
```

Do not delete or overwrite the local `.env` file. Keep deployment secrets in the Railway dashboard.

## Vercel Frontend

1. Create a Vercel project from the `frontend` directory.
2. Set the environment variable:

```text
NEXT_PUBLIC_API_URL=https://your-railway-backend-url
```

3. Deploy with the default Next.js build command:

```bash
npm run build
```

## Smoke Test

After deployment:

1. Generate an intent for `Fix the login authentication bug in our application.`
2. Run `read_codebase`; it should be allowed.
3. Run `drop_database`; it should be blocked with risk `10/10`.
4. Confirm both events appear in the timeline and audit center.
