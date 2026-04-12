# ⚙️ Developer & Deployment Guide

This document outlines the core architecture of the NISER Alumni Hub and guides developers looking to fork or migrate this application to their own environments.

## 🏗 System Architecture

This project strictly follows a **Serverless / Backend-as-a-Service (BaaS)** architecture. There is no Node.js/Python server running. Everything lives statically in the browser and speaks directly to Google APIs via ES6 Modules.

*   **Database & Auth:** Firebase Firestore (NoSQL).
*   **Media Storage:** Cloudinary (Using Unsigned Upload Presets).
*   **DOM Manipulation:** Vanilla Native Javascript (No React/Vue frameworks).
*   **Design System:** Vanilla CSS (`css/style.css`) augmented heavily by standard Bootstrap 5.3 CDN classes.

---

## 🛠 Firebase Migration / Setup

If you are setting this up from scratch, you must orchestrate your own Firebase console instance.

### 1. Initialize Firestore
*   Create a project at [Firebase Console](https://console.firebase.google.com).
*   Enable **Authentication** -> Turn on **Email/Password**.
*   Manually add your Admin email/password via the "Users" tab.
*   Enable **Firestore Database**.

### 2. Configure Security Rules
By default, Firebase locks everything or exposes everything. You MUST configure your Firestore Rules to match the frontend logic. 

**Navigate to Firestore > Rules and paste this verbatim:**
```javascript
rules_version = '2';
service cloud.firestore {
    match /databases/{database}/documents {
        
        // 1. Core Student Directory
        match /students/{document=**} {
            allow read: if true;                               // Public can view the directory
            allow write: if request.auth != null;              // ONLY Admins can edit/delete
        }

        // 2. Unauthenticated Queues (Joining/Updating/DMing)
        match /requests/{document} {
            // Allows the public 'join.html' and 'update.html' to blindly submit requests.
            allow create: if true; 
            
            // Prevents public snooping. Approving/Deleting requires Admin auth.
            allow read, update, delete: if request.auth != null;
        }

        match /messages/{document} {
            allow create: if true; 
            allow read, update, delete: if request.auth != null;
        }
    }
}
```

### 3. Connect the API Keys
In your codebase, edit `js/config.js` and paste the config object provided by Firebase:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
```

---

## 📸 Cloudinary Setup

Storing images directly in Firebase Storage requires setting up custom auth-token validation pipes, which gets messy for public forms. We pipe image uploads directly to Cloudinary instead.

1.  Make a free account at Cloudinary.com.
2.  Go to Settings > **Upload**.
3.  Add an **Upload Preset**.
    *   **CRITICAL:** Set "Signing Mode" precisely to **Unsigned**.
    *   Keep the preset name handy.
4.  Open `js/admin.js`, `js/join.js`, and `js/update.js`. At the top of those files, update the endpoints:
    ```javascript
    const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload";
    const CLOUDINARY_PRESET = "your_unsigned_preset_name";
    ```
5.  *Note on File Size:* All upload scripts enforce a **500KB** maximum file size before making the network request, to prevent abuse and preserve Cloudinary resources.

---

## 💾 Local Backup & Restore

The repository includes a Node.js-based backup system in the `scripts/` directory that creates a full offline copy of your Firebase database and Cloudinary images.

### Prerequisites
*   Node.js must be installed (this project uses NVM — run `nvm use --lts` if needed).
*   Install dependencies from the project root: `npm install`
*   A **Firebase Service Account Key** (JSON file) must be placed at `scripts/serviceAccountKey.json`.
    1. Go to **Firebase Console → Project Settings → Service Accounts**.
    2. Click **Generate new private key**.
    3. Rename the downloaded file to `serviceAccountKey.json` and move it into the `scripts/` folder.

> **Security:** `serviceAccountKey.json` and the `backups/` folder are both listed in `.gitignore` and will never be committed to GitHub.

### Running a Backup
From the project root directory, run:
```bash
node scripts/backup.js
```
This will:
- Pull all `students`, `requests`, and `messages` documents from Firestore into `backups/database-backup.json`.
- Scan all Cloudinary photo URLs in the database and download any images not already present in `backups/images/` (differential — skips what you already have).

### Restoring from a Backup
In the event of accidental data loss, run:
```bash
node scripts/restore.js
```
This will:
- Read `backups/database-backup.json`.
- Push every document back to their respective Firestore collections, preserving original document IDs.
- Local images in `backups/images/` are not re-uploaded to Cloudinary (they remain as your local archive).

---

## 🚀 Deployment

Since the entire application is an assortment of static `.html`, `.js`, and `.css` files, you do not need Vercel or Heroku.

**To deploy to GitHub Pages:**
1.  Push the entire repository to GitHub.
2.  Navigate to your Repo Settings -> Pages.
3.  Set the Source to `Deploy from a branch` -> Select `main` root.
4.  Your Alumni Directory is officially live globally.
