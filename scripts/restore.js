const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const BACKUP_DIR = path.join(__dirname, '../backups');
const DB_BACKUP_FILE = path.join(BACKUP_DIR, 'database-backup.json');

// ==========================================
// INITIALIZATION
// ==========================================
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error("❌ ERROR: serviceAccountKey.json not found in the scripts folder!");
    console.error("Please place your Firebase Service Account JSON file in: " + SERVICE_ACCOUNT_PATH);
    process.exit(1);
}

if (!fs.existsSync(DB_BACKUP_FILE)) {
    console.error("❌ ERROR: No database-backup.json file found in " + BACKUP_DIR);
    process.exit(1);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ==========================================
// RESTORE LOGIC
// ==========================================
async function restoreDatabase() {
    console.log("🚀 Starting Database Restoration...");
    console.log("Reading local backup file...");
    
    let rawData;
    try {
        rawData = fs.readFileSync(DB_BACKUP_FILE, 'utf-8');
    } catch (e) {
        console.error("Failed to read backup file.", e);
        process.exit(1);
    }

    const backupData = JSON.parse(rawData);
    
    const students = backupData.students || {};
    const requests = backupData.requests || {};
    const messages = backupData.messages || {};

    let restoredStudentsCount = 0;
    let restoredRequestsCount = 0;
    let restoredMessagesCount = 0;

    console.log("\n📡 Restoring 'students' collection...");
    for (const [docId, docData] of Object.entries(students)) {
        try {
            await db.collection('students').doc(docId).set(docData);
            restoredStudentsCount++;
            process.stdout.write("."); // loading indicator
        } catch (e) {
            console.error(`\n❌ Failed to restore student document ${docId}`, e);
        }
    }

    console.log("\n📡 Restoring 'requests' collection...");
    for (const [docId, docData] of Object.entries(requests)) {
        try {
            await db.collection('requests').doc(docId).set(docData);
            restoredRequestsCount++;
            process.stdout.write(".");
        } catch (e) {
            console.error(`\n❌ Failed to restore request document ${docId}`, e);
        }
    }

    console.log("\n📡 Restoring 'messages' collection...");
    for (const [docId, docData] of Object.entries(messages)) {
        try {
            await db.collection('messages').doc(docId).set(docData);
            restoredMessagesCount++;
            process.stdout.write(".");
        } catch (e) {
            console.error(`\n❌ Failed to restore message document ${docId}`, e);
        }
    }

    console.log(`\n\n🎉 Restoration Complete!`);
    console.log(`Restored ${restoredStudentsCount} student records.`);
    console.log(`Restored ${restoredRequestsCount} request records.`);
    console.log(`Restored ${restoredMessagesCount} message records.`);
    console.log(`Note: Local images in backups/images/ were safely retained during this process.`);
}

restoreDatabase().catch(console.error);
