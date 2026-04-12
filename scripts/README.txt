=======================================
ALUMNI ARCHIVE - BACKUP SYSTEM
=======================================

These scripts provide offline differential backups of your entire cloud infrastructure.

PREREQUISITES
-------------
1. Go to Firebase Console -> Project Settings -> Service Accounts.
2. Click "Generate new private key".
3. Move the downloaded JSON file into this `scripts/` folder.
4. Rename it EXACLY to: `serviceAccountKey.json`.

(Note: Do not worry about accidentally pushing this key to GitHub. The root `.gitignore` has been strictly configured to completely ignore it).

HOW TO BACKUP
-------------
Whenever you want to archive your cloud database locally, run this in your terminal from the root of your project:
$ node scripts/backup.js

- It will pull down the latest `.json` database to `backups/database-backup.json`.
- It will smartly find all new Cloudinary profile IDs and download their raw image files securely to `backups/images/`.
- If an image already exists locally, it skips it to save bandwidth!

HOW TO RESTORE
--------------
If your cloud Firebase database gets wiped out completely:
$ node scripts/restore.js

- It will securely force-push every document back into the cloud exactly as it was when you last backed up.
