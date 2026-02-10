# Adaptive Command Center

Production management dashboard for Adaptive by Design.

## Stack
- **Next.js 14** — React framework
- **Supabase** — Authentication
- **Google Drive API** — Vendor document management
- **Vercel** — Hosting

## Setup

1. Clone this repo
2. Copy `.env.local.example` to `.env.local` and fill in credentials
3. `npm install`
4. `npm run dev`

## Environment Variables

Set these in Vercel (Settings → Environment Variables):

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase secret key |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email |
| `GOOGLE_PRIVATE_KEY` | Google service account private key |
| `GOOGLE_PROJECT_ID` | Google Cloud project ID |

## Deployment

Connected to Vercel at `commandcenter.adaptivebydesign.com`. Auto-deploys on push to `main`.
