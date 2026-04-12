const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// ==========================================
// CONFIGURATION
// ==========================================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const BACKUP_DIR = path.join(__dirname, '../backups');
const IMAGES_DIR = path.join(BACKUP_DIR, 'images');
const DB_BACKUP_FILE = path.join(BACKUP_DIR, 'database-backup.json');

// Ensure directories exist
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);

// ==========================================
// INITIALIZATION
// ==========================================
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("❌ ERROR: serviceAccountKey.json not found in the scripts folder!");
    console.error("Please place your Firebase Service Account JSON file in: " + SERVICE_ACCOUNT_PATH);
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==========================================
// BACKUP LOGIC
// ==========================================
async function downloadImage(url, filename) {
    const filePath = path.join(IMAGES_DIR, filename);
    
    // Differential Check: If image already exists locally, skip it!
    if (fs.existsSync(filePath)) {
        console.log(`⏩ Skipped (Already Downloaded): ${filename}`);
        return;
    }

    try {
        console.log(`⏳ Downloading: ${filename}...`);
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (err) {
        console.error(`❌ Failed to download ${url}: ${err.message}`);
    }
}

async function backupDatabase() {
    console.log("🚀 Starting Differential Backup...");

    const backupData = {
        students: {},
        requests: {},
        messages: {},
        timestamp: new Date().toISOString()
    };

    // 1. Fetch Students Collection
    console.log("📡 Fetching 'students' collection...");
    const studentsSnapshot = await db.collection('students').get();
    studentsSnapshot.forEach(doc => {
        backupData.students[doc.id] = doc.data();
    });

    // 2. Fetch Requests Collection
    console.log("📡 Fetching 'requests' collection...");
    const reqSnapshot = await db.collection('requests').get();
    reqSnapshot.forEach(doc => {
        backupData.requests[doc.id] = doc.data();
    });

    // 3. Fetch Messages Collection
    console.log("📡 Fetching 'messages' collection...");
    const msgSnapshot = await db.collection('messages').get();
    msgSnapshot.forEach(doc => {
        backupData.messages[doc.id] = doc.data();
    });

    // 4. Save JSON Backup
    fs.writeFileSync(DB_BACKUP_FILE, JSON.stringify(backupData, null, 2));
    console.log(`✅ Database JSON successfully exported to: ${DB_BACKUP_FILE}`);

    // 5. Download Remote Images Differentially
    console.log("\n📸 Scanning for Cloudinary Images...");
    let imageCount = 0;

    const allProfiles = Object.values(backupData.students).concat(Object.values(backupData.requests));

    for (const profile of allProfiles) {
        if (profile.photo && profile.photo.startsWith('http')) {
            imageCount++;
            
            // Generate a clean filename from the URL structure or use random hash
            const urlObj = new URL(profile.photo);
            const pathname = urlObj.pathname;
            const extension = path.extname(pathname) || '.jpg';
            // Use the Cloudinary unique ID as the filename
            const cleanFilename = path.basename(pathname, extension) + extension;

            await downloadImage(profile.photo, cleanFilename);
        }
    }

    console.log(`\n🎉 Backup Complete! Synced ${studentsSnapshot.size} students, ${reqSnapshot.size} requests, ${msgSnapshot.size} messages, and verified ${imageCount} local images.`);
}

backupDatabase().catch(console.error);
