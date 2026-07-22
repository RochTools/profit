# Weekly Profit Calculator

## Local development
```
npm install
npm run dev
```

## Build
```
npm run build
```
Output goes to the `dist` folder — this is what you deploy.

## Deploy to Cloudflare Pages
1. Push this folder to a GitHub repository.
2. Go to the Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repository.
4. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Click **Save and Deploy**. Cloudflare installs dependencies, builds, and hosts it automatically — you'll get a `*.pages.dev` URL.

Notes:
- This app has no backend — all data is stored in the browser (`localStorage`), so static hosting is all it needs.
- `components.json` is kept so you can add shadcn/ui components later with `npx shadcn add <component>` if needed; it isn't required for the app to run as-is.
