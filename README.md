# ReadAgora Web

The Next.js frontend for ReadAgora. It uses the existing API configured for the mobile app and keeps page rendering, feature domains, shared navigation, API access, and session handling in separate modules.

## Run locally

1. Copy `.env.example` to `.env.local`.
2. Set `READAGORA_API_URL` and `NEXT_PUBLIC_READAGORA_API_URL` to the backend base URL. They must match because server and browser requests both use the API.
3. Set `NEXT_PUBLIC_READAGORA_SUPABASE_URL` and `NEXT_PUBLIC_READAGORA_SUPABASE_ANON_KEY` for browser-based Google sign-in. The anon key is public; never put a service-role key in a `NEXT_PUBLIC_` variable.
4. Run `npm install` and `npm run dev`.
5. Open <http://localhost:3002>.

The browser uses the public API URL for app data. The server uses `READAGORA_API_URL` for authentication proxy routes. Store purchases and native subscription management remain in the mobile app where the store checkout is available.

## Project structure

- `src/app`: App Router routes, metadata, authentication endpoints, and the shared legacy-route gate
- `src/client`: browser startup, route control, and page composition
- `src/components`: navigation, shared shell, and reusable UI
- `src/features`: domain modules for discovery, stories, reading, community, events, creators, workroom, profile, and authentication
- `src/lib/api`: server and browser API clients
- `src/lib/auth`: server-side session helpers
- `public`: static assets and browser runtime assets

## Checks and production

Run `npm run typecheck` and `npm run build`. Deploy as a Node.js Next.js application and configure the API and Supabase variables in the hosting environment. Start with `npm start`; Next.js uses the hosting platform's `PORT` environment variable (and defaults to port 3000 when it is unset). The development server remains on port 3002.
