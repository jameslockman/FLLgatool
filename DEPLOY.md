# Deployment Guide

## Option 1: GitHub Pages (Recommended)

### Steps:

1. **Push your code to GitHub** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/FLLgatool.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click **Settings** → **Pages**
   - Under "Source", select **main** branch and **/ (root)** folder
   - Click **Save**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/FLLgatool/`

3. **That's it!** Your app is now live and accessible via the web.

## Option 2: Netlify (Easy Drag & Drop)

1. Go to [netlify.com](https://www.netlify.com)
2. Sign up/login (free)
3. Drag and drop your project folder onto Netlify
4. Your site is instantly live!

## Option 3: Google Sites

1. Go to [sites.google.com](https://sites.google.com)
2. Create a new site
3. Click **Insert** → **Embed**
4. You'll need to:
   - Inline your CSS and JavaScript into the HTML file
   - Or use an iframe embed (may have CORS issues with Google Sheets API)

**Note:** Google Sites may have limitations with external API calls. GitHub Pages or Netlify are better options.

## Option 4: Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

Your site will be at: `https://YOUR_PROJECT_ID.web.app`

