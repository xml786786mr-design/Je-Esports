# How to Publish Your Website (JE Esports)

Since your project is built with **Next.js**, the best and easiest way to publish it is using **Vercel** (the creators of Next.js).

## Step 1: Push your code to GitHub
1. Make sure all your latest changes are committed.
2. Push your code to a repository on GitHub.

## Step 2: Create a Vercel Account
1. Go to [vercel.com](https://vercel.com) and sign up (you can continue with GitHub).

## Step 3: Import Project
1. On your Vercel dashboard, click **"Add New..."** -> **"Project"**.
2. Select your GitHub repository (`jeesports` or whatever you named it).
3. Click **Import**.

## Step 4: Configure Environment Variables (Crucial!)
Before clicking "Deploy", you must add your environment variables. Vercel needs to know your Firebase keys.

1. Open your local `.env.local` file on your computer.
2. In the Vercel deployment screen, look for the **"Environment Variables"** section.
3. Copy each variable from your `.env.local` and paste it into Vercel.
   - Example: Key: `NEXT_PUBLIC_FIREBASE_API_KEY`, Value: `your-api-key`
   - Do this for ALL variables in your `.env.local`.

## Step 5: Deploy
1. Click **Deploy**.
2. Vercel will build your site. This might take a minute or two.
3. Once done, you will get a live URL (e.g., `jeesports.vercel.app`).

## Step 6: Verify Cron Jobs
Your project includes a `vercel.json` file configured to run a cron job (`/api/update-tournament-states`) every minute.
- Once deployed, Vercel will automatically detect this and start running the job to keep your tournament statuses updated.

## Troubleshooting
- **Build Errors**: If the build fails, check the logs in Vercel. It usually points to TypeScript errors or missing variables.
- **Firebase Issues**: If data doesn't load, double-check that you copied the Environment Variables correctly.
