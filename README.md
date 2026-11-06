# ReadAgora Web

The React and Next.js App Router frontend for ReadAgora. It uses the existing API configured for the mobile app and keeps application state, shared navigation, API access, and session handling in reusable React modules.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `READAGORA_API_URL` and `NEXT_PUBLIC_READAGORA_API_URL` to the backend base URL. They must match because server and browser requests both use the API.
3. Set `NEXT_PUBLIC_READAGORA_SUPABASE_URL` and `NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY` for browser-based Google sign-in. The anon key is public; never put a service-role key in a `NEXT_PUBLIC_` variable.
4. Run `npm install` and `npm run dev`.
5. Open <http://localhost:3002>.

The browser uses the public API URL for app data. The server uses `READAGORA_API_URL` for authentication proxy routes. Store purchases and native subscription management remain in the mobile app where the store checkout is available.

## Project structure

- `src/app`: App Router routes, metadata, authentication endpoints, and legacy URL aliases
- `src/components/application`: React application provider, shell, feature screens, and reusable UI
- `src/client` and `src/features`: retained legacy implementation for reference; not imported by production routes
- `src/components`: shared shell and reusable UI
- `src/lib/api`: server and browser API clients
- `src/lib/auth`: server-side session helpers
- `public`: static assets and browser runtime assets

## Checks and production

Run `npm ci`, `npm run typecheck`, and `npm run build`. The build creates `.next/standalone/server.js` and copies `public/` and `.next/static/` into the standalone output. For a Node.js host that requires a startup file, use the root `server.js`; it launches the standalone server and honors the host-provided `PORT`. Configure the API and Supabase variables in the hosting environment before building. For iPanel, set the application startup file to `server.js` and the working directory to the project root. The development server uses Next.js's default port unless `PORT` is set. Production hosting must be pointed to this Next.js application to complete the public-domain cutover.
