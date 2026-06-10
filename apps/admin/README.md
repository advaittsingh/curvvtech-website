# CurvvTech Admin Panel

Internal dashboard for CurvvTech (blogs, leads, clients, invoices, team, analytics). Built with React, Vite, Clerk, and the CurvvTech backend API.

## Deploying to Vercel (admin.curvvtech.com)

Deploy the admin panel as a **new Vercel project** so **admin.curvvtech.com** serves this app (separate from the main site).

**→ See [DEPLOY.md](./DEPLOY.md)** for step-by-step instructions (Dashboard or CLI).

Summary:
- **New project** from the same repo, with **Root Directory** = `admin panel ` (or `admin-panel` if you rename the folder).
- **Env vars:** `VITE_BACKEND_URL`, `VITE_CLERK_PUBLISHABLE_KEY`.
- **Domain:** Add **admin.curvvtech.com** to this project; remove it from the frontend project if it’s there.

## Getting Started (local)

1. Clone Repository
```
git clone https://github.com/themewagon/material-shadcn.git
```
2. Install Dependencies
```
npm i
```
3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Author 
```
Design and code is completely written by Creative Tim and development team. 
```

## License

 - Design and Code is Copyright &copy; <a href="https://www.creative-tim.com/?_ga=2.122857986.824184694.1756119169-640723978.1626445283" target="_blank">Creative Tim</a>
 - Licensed cover under [MIT]
 - Distributed by <a href="https://themewagon.com" target="_blank">ThemeWagon</a>
