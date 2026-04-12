import { db } from './config.js';
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- CONFIG FOR CLOUDINARY ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dm85dhitk/image/upload";
const CLOUDINARY_PRESET = "alumni";

// 1. Populate Years (Same as before)
const currentYear = new Date().getFullYear();
const startSelect = document.getElementById('inStart');
const endSelect = document.getElementById('inEnd');

for (let y = currentYear + 1; y >= 2007; y--) {
    startSelect.add(new Option(y, y));
    endSelect.add(new Option(y, y));
}

// 2. Submit Logic
document.getElementById('btnSubmit').addEventListener('click', async () => {
    const btn = document.getElementById('btnSubmit');
    const status = document.getElementById('statusMsg');
    const fileInput = document.getElementById('inFile');
    const helpText = document.getElementById('uploadHelp');
    
    // --- SECURITY CHECK ---
    const ans = document.getElementById('inSecAnswer').value.trim().toLowerCase();
    if (!ans.includes("pathani") && !ans.includes("samanta")) {
        alert("Incorrect Security Answer.");
        return;
    }

    // --- VALIDATION ---
    const prog = document.getElementById('inProg').value;
    const start = document.getElementById('inStart').value;
    const name = document.getElementById('inName').value;

    if (!prog || !start || !name) {
        alert("Please fill Name, Programme, and Start Year.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Processing...";

    // --- PHOTO UPLOAD LOGIC ---
    let photoURL = ""; // Default empty

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // 1. Check Size (300KB Limit)
        const maxSize = 500 * 1024; // 500KB
        if (file.size > maxSize) {
            alert("File is too large! Please use an image under 500KB.");
            helpText.classList.add("text-danger");
            btn.disabled = false;
            btn.innerText = "Submit Application";
            return; // Stop execution
        }

        // 2. Upload to Cloudinary
        try {
            helpText.innerText = "Uploading image...";
            helpText.classList.remove("text-danger");
            helpText.classList.add("text-primary");

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);

            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Image upload failed");

            const result = await response.json();
            photoURL = result.secure_url;
            
        } catch (err) {
            console.error(err);
            alert("Image Upload Error: " + err.message);
            btn.disabled = false;
            btn.innerText = "Submit Application";
            return;
        }
    }

    // --- PREPARE DATA ---
    const end = document.getElementById('inEnd').value;
    let batchStr = `${prog} ${start}`;
    if (end) batchStr += `-${end.slice(-2)}`;

    const data = {
        batch: batchStr,
        name: name,
        supervisor: document.getElementById('inSupervisor').value,
        position: document.getElementById('inPos').value,
        institute: document.getElementById('inInst').value,
        email: document.getElementById('inEmail').value,
        researchInterests: document.getElementById('inInterests').value,
        website: document.getElementById('inWeb').value,
        photo: photoURL, // <--- Attach the Cloudinary URL here
        additionalInfo: document.getElementById('inInfo').value,
        submittedAt: new Date(),
        status: "pending"
    };

    // --- SAVE TO FIRESTORE ---
    try {
        await addDoc(collection(db, "requests"), data);

        status.innerHTML = `<div class="alert alert-success">✅ Application Sent! An admin will review it shortly.</div>`;
        status.scrollIntoView();
        
        // Clear Form
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);

    } catch (e) {
        console.error(e);
        status.innerHTML = `<div class="alert alert-danger">Database Error: ${e.message}</div>`;
        btn.disabled = false;
        btn.innerText = "Submit Application";
    }
});
