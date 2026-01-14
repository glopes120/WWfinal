# Vercel Webservice

This small project contains only serverless functions for the WiseWallet API. Deploy this folder to Vercel as a separate project.

How to deploy on Vercel:

1. Create a new Vercel Project → Import from GitHub.
2. Set the **Root Directory** to `vercel-webservice`.
3. Add Environment Variables in Vercel Settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`)
4. Deploy. Endpoints:
   - `/api/status`
   - `/api/expenses`
