import { db } from './config.js';
import { collection, addDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { notifyDiscord } from './notify.js';

// --- CONFIG FOR CLOUDINARY ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqivrep05/image/upload";
const CLOUDINARY_PRESET = "alumni_upload";

// 1. Populate Search Years
const currentYear = new Date().getFullYear();
const searchYear = document.getElementById('searchYear');
for (let y = currentYear; y >= 2007; y--) {
    searchYear.add(new Option(y, y));
}

// 2. FETCH STUDENTS LOGIC
document.getElementById('btnFetch').addEventListener('click', async () => {
    const prog = document.getElementById('searchProg').value;
    const year = document.getElementById('searchYear').value;
    const nameSelect = document.getElementById('searchName');
    const btn = document.getElementById('btnFetch');

    if (!prog || !year) {
        alert("Please select Programme and Start Year first.");
        return;
    }

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Searching...';
        
        // Construct the search prefix (e.g. "Int. MSc. 2017")
        const prefix = `${prog} ${year}`;
        
        // Query: Batch starts with prefix
        // We use the range trick: >= prefix AND <= prefix + high char
        const q = query(
            collection(db, "students"),
            where("batch", ">=", prefix),
            where("batch", "<=", prefix + "\uf8ff")
        );

        const snapshot = await getDocs(q);
        
        // Reset Dropdown
        nameSelect.innerHTML = '<option value="" selected disabled>-- Select Name --</option>';
        
        if (snapshot.empty) {
            alert("No students found for this batch!");
            document.getElementById('nameSection').style.display = 'none';
        } else {
            snapshot.forEach(doc => {
                const s = doc.data();
                const opt = document.createElement('option');
                opt.value = doc.id; // Store Doc ID as value
                // Store entire student object in a data attribute to pre-fill later
                opt.dataset.student = JSON.stringify(s); 
                opt.textContent = s.name;
                nameSelect.appendChild(opt);
            });
            
            document.getElementById('nameSection').style.display = 'block';
        }

    } catch (e) {
        console.error(e);
        alert("Error fetching students: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-search"></i> Find Students';
    }
});

// 3. SHOW FORM ON NAME SELECT
document.getElementById('searchName').addEventListener('change', (e) => {
    const formSection = document.getElementById('formSection');
    const selectedOpt = e.target.selectedOptions[0];
    
    if (!selectedOpt.value) return;

    // Show form
    formSection.style.display = 'flex';
    
    // Pre-fill existing data (Optional: remove this if you want them to start fresh)
    const s = JSON.parse(selectedOpt.dataset.student);
    
    document.getElementById('originalDocId').value = selectedOpt.value;
    document.getElementById('originalBatch').value = s.batch;
    
    document.getElementById('inPos').value = s.position || '';
    document.getElementById('inInst').value = s.institute || '';
    document.getElementById('inEmail').value = s.email || '';
    document.getElementById('inInterests').value = s.researchInterests || '';
    document.getElementById('inWeb').value = s.website || '';
    document.getElementById('inInfo').value = s.additionalInfo || '';
    document.getElementById('inPhoto').value = s.photo || ''; // Keep old photo URL
});

// 4. SUBMIT UPDATE LOGIC
document.getElementById('btnSubmit').addEventListener('click', async () => {
    const btn = document.getElementById('btnSubmit');
    const status = document.getElementById('statusMsg');
    const fileInput = document.getElementById('inFile');
    const helpText = document.getElementById('uploadHelp');

    // Security Check
    const ans = document.getElementById('inSecAnswer').value.trim().toLowerCase();
    if (!ans.includes("pathani") && !ans.includes("samanta")) {
        alert("Incorrect Security Answer.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Processing...";

    // Handle Photo Upload (Same logic as Join page)
    let photoURL = document.getElementById('inPhoto').value; // Default to old photo

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 500 * 1024) {
            alert("File too large (Max 500KB).");
            btn.disabled = false;
            return;
        }

        try {
            helpText.innerText = "Uploading...";
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', CLOUDINARY_PRESET);
            
            const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
            const json = await res.json();
            photoURL = json.secure_url;
        } catch (e) {
            alert("Upload failed: " + e.message);
            btn.disabled = false;
            return;
        }
    }

    // Prepare Request Data
    const nameSelect = document.getElementById('searchName');
    const requestData = {
        type: "UPDATE", // Flag to tell Admin this is an update
        originalId: document.getElementById('originalDocId').value, // Which student to update
        
        // We send the FULL dataset needed to overwrite the document
        batch: document.getElementById('originalBatch').value, // Keep batch same
        name: nameSelect.options[nameSelect.selectedIndex].text, // Keep name same
        
        // Updated Fields
        position: document.getElementById('inPos').value,
        institute: document.getElementById('inInst').value,
        email: document.getElementById('inEmail').value,
        researchInterests: document.getElementById('inInterests').value,
        website: document.getElementById('inWeb').value,
        photo: photoURL,
        additionalInfo: document.getElementById('inInfo').value,
        
        submittedAt: new Date(),
        status: "pending"
    };

    try {
        await addDoc(collection(db, "requests"), requestData);

        // Build a clean serializable payload (Firestore mutates submittedAt in-place)
        const notifyPayload = { ...requestData };
        delete notifyPayload.submittedAt;
        delete notifyPayload.status;

        // Grab the original student data stored in the select option
        const nameSelect = document.getElementById('searchName');
        const selectedOpt = nameSelect.options[nameSelect.selectedIndex];
        const originalData = selectedOpt.dataset.student
            ? JSON.parse(selectedOpt.dataset.student)
            : null;

        notifyDiscord('update_request', { request: notifyPayload, original: originalData });
        
        status.innerHTML = `<div class="alert alert-success">✅ Update Request Sent! Admin will review it.</div>`;
        document.getElementById('formSection').style.display = 'none';
        
        setTimeout(() => { window.location.href = 'index.html'; }, 3000);

    } catch (e) {
        console.error(e);
        status.innerHTML = `<div class="alert alert-danger">Error: ${e.message}</div>`;
        btn.disabled = false;
        btn.innerText = "Submit Update";
    }
});