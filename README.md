# 🗞️ Daily News Automation Setup Guide

This project automates the creation of professional news cards and uploads them to Google Drive daily.

## 📁 Project Structure
```text
/frontend
  - index.html    (Modern UI)
  - style.css     (Premium Styling)
  - script.js     (Manual Generator)
  - news-bg.png   (Card Background)
/backend
  - upload.js     (Main Automation Logic)
  - credentials.json (Google API Keys)
  - package.json
/images
  - news-image.png (Latest generated image)
```

---

## 🌎 Step 0: Get News API Key (New)
1. Go to [NewsAPI.org](https://newsapi.org/).
2. Create a free account and copy your **API Key**.
3. Paste it into `backend/upload.js` at `NEWS_API_KEY`.

## 🛠️ Step 1: Google Cloud Setup (Drive API)
1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a **New Project**.
3. Enable the **Google Drive API**.
4. Go to **Credentials** > **Create Credentials** > **Service Account**.
5. Give it a name and click **Create and Continue**.
6. Select Role: **Editor** (or Drive File Creator).
7. Go to the newly created service account, click **Keys** > **Add Key** > **Create New Key** (JSON).
8. Save this file as `backend/credentials.json` in your project.

### 🔓 Important: Share the Folder
1. Copy the `client_email` from your `credentials.json`.
2. Go to Google Drive and create a folder where images should go.
3. **Share** that folder with the `client_email` and give it "Editor" access.
4. Copy the **Folder ID** from the URL (the string of characters after `/folders/`).
5. Paste it into `backend/upload.js` at `DRIVE_FOLDER_ID`.

---

## 🚀 Step 2: Local Installation
Open your terminal in the project root:
```bash
cd backend
npm install
```

---

## 🧪 Step 3: Test the Automation
Run the script manually to see it in action:
```bash
node upload.js
```
*It will open a headless browser, capture the card, and upload it to your Drive.*

---

## ⏰ Step 4: Automate Daily

### Windows (Task Scheduler)
1. Open **Task Scheduler**.
2. Click **Create Basic Task**.
3. Trigger: **Daily**.
4. Action: **Start a Program**.
5. Program/script: `node` (provide full path, e.g., `C:\Program Files\nodejs\node.exe`).
6. Add arguments: `upload.js` (provide full path to the file).
7. Start in: (provide full path to the `backend` folder).

### Linux / Mac (Cron)
1. Open crontab: `crontab -e`
2. Add a line to run at 9 AM every day:
```bash
0 9 * * * /usr/local/bin/node /absolute/path/to/backend/upload.js >> /var/log/news_automation.log 2>&1
```

---

## 📦 Required NPM Packages
The `backend/package.json` includes:
- `googleapis`: Official Google API client.
- `puppeteer`: Headless Chrome for UI screenshotting.
- `fs-extra`: Extended file system utilities.
