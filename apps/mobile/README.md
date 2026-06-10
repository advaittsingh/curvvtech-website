# Follow Up mobile (Expo)

This app lives at `apps/mobile` and is **not** part of the root npm workspaces (Expo manages its own install).

```bash
cd apps/mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` in `apps/mobile/.env` to your `services/api` origin (see `src/config/apiBaseUrl.ts`).
