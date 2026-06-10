# Clerk setup for admin.curvvtech.com

Your admin panel was sending users to Clerk’s **Account Portal** (blessed-sawfish-57.accounts.dev) for sign-in, then back to admin.curvvtech.com. That can cause redirect loops or landing on the wrong page. Use the steps below so sign-in happens **on your admin domain** instead.

---

## Option 1: Sign-in on your admin domain (recommended)

Keep users on **admin.curvvtech.com** for sign-in and sign-up so there are no cross-domain redirects.

### 1. Set the host Clerk should use

In Clerk Dashboard → **Configure** → **Paths**:

1. Find **“Fallback development host”** (under “Development host”).
2. Enter: **`https://admin.curvvtech.com`**
3. Save if there’s a Save button.

### 2. Use your app’s sign-in/sign-up pages

Still under **Configure** → **Paths**, scroll to **“Component paths”**:

1. **`<SignIn />`**  
   - Select **“Sign-in page on development host”** (instead of “Sign-in page on Account Portal”).

2. **`<SignUp />`**  
   - Select **“Sign-up page on development host”** (instead of “Sign-up page on Account Portal”).

3. **“Signing Out”**  
   - Select **“Page on development host”** (instead of “Sign-in page on Account Portal”).

Save. After this, when someone goes to admin.curvvtech.com and isn’t signed in, they’ll see your admin panel’s own sign-in page (with the Clerk form) instead of being sent to accounts.dev. After sign-in they stay on admin.curvvtech.com and see the dashboard.

---

## Option 2: Keep Account Portal and fix redirects

If you prefer to keep using the Account Portal (blessed-sawfish-57.accounts.dev):

1. In Clerk Dashboard, look under **Configure** for **“Redirect URLs”**, **“Allowed redirect URLs”**, or **“Domains”** (exact name depends on your Clerk version).
2. Add **`https://admin.curvvtech.com`** (and optionally **`https://admin.curvvtech.com/`**) to the allowlist so Clerk can redirect back after sign-in.
3. In your admin panel, ensure **VITE_CLERK_PUBLISHABLE_KEY** is set in Vercel so the app can establish the session when the user lands back on admin.curvvtech.com.

---

## After changing settings

- Reload or redeploy the admin panel.
- Try signing in again in an incognito/private window to avoid old redirect or session state.
