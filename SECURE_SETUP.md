# Secure API Key Setup Guide

There are several ways to securely store your Google Sheets API key. Choose the option that works best for you:

## Option 1: GitHub Secrets + GitHub Actions (Recommended for GitHub Pages)

This keeps the API key out of your repository but injects it during build. **Note:** The key will still be visible in the browser, but it won't be in your git history.

### Steps:

1. **Add API Key to GitHub Secrets:**
   - Go to your repository: `https://github.com/jameslockman/FLLgatool/settings/secrets/actions`
   - Click "New repository secret"
   - Name: `GOOGLE_SHEETS_API_KEY`
   - Value: Your Google Sheets API key
   - Click "Add secret"

2. **The GitHub Actions workflow is already set up** (`.github/workflows/deploy.yml`)
   - It will automatically inject the API key into `config.js` during deployment
   - The key will be available as `window.API_KEY` in your app

3. **Push your changes:**
   ```bash
   git add .
   git commit -m "Add secure API key setup"
   git push
   ```

4. **Enable GitHub Pages** (if not already done):
   - Go to Settings → Pages
   - Source: GitHub Actions

## Option 2: Netlify Functions (Best Security)

This keeps the API key completely server-side and never exposes it to the browser.

### Steps:

1. **Deploy to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login
   - Connect your GitHub repository
   - Or drag & drop your project folder

2. **Add API Key to Netlify Environment Variables:**
   - Go to Site settings → Environment variables
   - Add variable: `GOOGLE_SHEETS_API_KEY`
   - Value: Your Google Sheets API key
   - Click "Save"

3. **Update config.js:**
   - Create `config.js` in your project root:
   ```javascript
   window.API_PROXY_URL = 'https://your-site-name.netlify.app/.netlify/functions/api-proxy';
   ```
   - Replace `your-site-name` with your actual Netlify site name

4. **Deploy:**
   - Netlify will automatically deploy when you push to GitHub
   - Or manually deploy via Netlify dashboard

The serverless function (`netlify/functions/api-proxy.js`) will handle all API calls server-side, keeping your key secure.

## Option 3: Manual Entry (Current)

Users can still enter the API key manually in the Settings tab. This is stored locally in their browser's localStorage.

## Security Notes:

- **Option 1 (GitHub Actions):** Key is visible in browser but not in git repo
- **Option 2 (Netlify Functions):** Key is never exposed to browser (most secure)
- **Option 3 (Manual):** Key is stored in user's browser only

For production use, **Option 2 (Netlify Functions)** is the most secure option.

