# Start here (3 steps)

1. **Database:** open Supabase -> SQL Editor -> New query, paste all of `supabase/setup-all.sql`, click Run (once).
2. **Keys:** open `.env.local` in this folder and fill in the empty values (Clerk, Supabase, Gemini). Nothing else needs editing.
3. **Run** (Node.js 20.9 or newer):
   ```
   npm install
   npm run dev
   ```
   Then open http://localhost:3000  (if turbopack gives trouble: `npm run dev:webpack`)

Never share `.env.local`. Full documentation is in `README.md`.
