import { db, auth } from './config.js';
import { collection, addDoc, getDocs, getDoc, doc, deleteDoc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- CONFIG FOR CLOUDINARY ---
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dqivrep05/image/upload";
const CLOUDINARY_PRESET = "alumni_upload";

// --- 0. POPULATE YEARS AUTOMATICALLY ---
const currentYear = new Date().getFullYear();
const startSelect = document.getElementById('inStart');
const endSelect = document.getElementById('inEnd');

for (let y = currentYear + 5; y >= 2007; y--) {
    let opt1 = new Option(y, y);
    let opt2 = new Option(y, y);
    startSelect.add(opt1);
    endSelect.add(opt2);
}

// --- AUTH ---
onAuthStateChanged(auth, (user) => {
    const loginSec = document.getElementById('login-section');
    const dashSec = document.getElementById('dashboard-section');
    const btnLogout = document.getElementById('btnLogout');
    const btnChangePass = document.getElementById('btnChangePass'); // <--- Select the button

    if (user) {
        // User is Logged In
        loginSec.style.display = 'none';
        dashSec.style.display = 'block';
        document.getElementById('adminSidebar').style.display = 'flex';
        document.getElementById('mainWrapper').style.marginLeft = 'var(--sidebar-width)';
        document.getElementById('adminMobileHeader').style.display = '';
        
        loadTable();
        loadInbox();
        loadApprovals();
    } else {
        // User is Logged Out
        loginSec.style.display = 'block';
        dashSec.style.display = 'none';
        document.getElementById('adminSidebar').style.display = 'none';
        document.getElementById('mainWrapper').style.marginLeft = '0';
        document.getElementById('adminMobileHeader').style.display = 'none';
    }
});

document.getElementById('btnLogin').addEventListener('click', () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, e, p).catch(err => alert("Login Failed: " + err.message));
});

document.getElementById('email').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('password').focus(); // Move to password box
    }
});

document.getElementById('password').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('btnLogin').click();
    }
});

document.getElementById('btnLogout').addEventListener('click', () => signOut(auth));

// --- CHANGE PASSWORD LOGIC ---
document.getElementById('btnSavePass').addEventListener('click', async () => {
    const btn = document.getElementById('btnSavePass');
    const msg = document.getElementById('passMsg');
    const p1 = document.getElementById('newPass').value;
    const p2 = document.getElementById('confirmPass').value;

    // Validation
    if (p1.length < 6) {
        msg.innerText = "Password must be at least 6 characters.";
        return;
    }
    if (p1 !== p2) {
        msg.innerText = "Passwords do not match.";
        return;
    }

    try {
        btn.disabled = true;
        btn.innerText = "Updating...";
        
        const user = auth.currentUser;
        
        if (user) {
            await updatePassword(user, p1);
            alert("Success! Please login with your new password.");
            
            // Close Modal
            const modalEl = document.getElementById('passwordModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            
            // Clear fields
            document.getElementById('newPass').value = "";
            document.getElementById('confirmPass').value = "";
            msg.innerText = "";
            
            // Optional: Logout user to force re-login
            await signOut(auth);
        } else {
            throw new Error("No user logged in.");
        }

    } catch (e) {
        console.error(e);
        // Firebase requires "Recent Login" for sensitive actions.
        if (e.code === 'auth/requires-recent-login') {
            msg.innerText = "Security: Please logout and login again to change password.";
        } else {
            msg.innerText = "Error: " + e.message;
        }
    } finally {
        btn.disabled = false;
        btn.innerText = "Update Password";
    }
});

// Global variable
let adminData = []; 

// 1. Populate Admin Year Filter
const adminYearSelect = document.getElementById('adminFilterYear');
for (let y = new Date().getFullYear(); y >= 2007; y--) {
    adminYearSelect.add(new Option(y, y));
}

// 2. Updated Load Table
async function loadTable() {
    const tbody = document.getElementById('admin-table-body');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
    const q = query(collection(db, "students"), orderBy("batch", "desc"));
    const snapshot = await getDocs(q);
    
    adminData = [];
    snapshot.forEach(doc => {
        adminData.push({ id: doc.id, ...doc.data() });
    });

    applyAdminFilters();
}

function getBadgeClass(position) {
    if (!position) return '';
    const pos = position.toLowerCase();
    if (pos.includes('phd') || pos.includes('doctoral')) return 'badge-phd';
    if (pos.includes('faculty') || pos.includes('professor') || pos.includes('assist')) return 'badge-faculty';
    if (pos.includes('postdoc') || pos.includes('post doc')) return 'badge-postdoc';
    if (pos.includes('msc') || pos.includes('master')) return 'badge-msc';
    return 'badge-default';
}

function applyAdminFilters() {
    const term = document.getElementById('adminSearch').value.toLowerCase();
    const prog = document.getElementById('adminFilterProg').value;
    const year = document.getElementById('adminFilterYear').value;
    const tbody = document.getElementById('admin-table-body');
    const sidebar = document.getElementById('sidebar-nav');

    const filtered = adminData.filter(s => {
        const match = s.batch.match(/^(.*)\s+(\d{4})(?:-(\d{2,4}))?$/);
        const sProg = match ? match[1] : "";
        const sStart = match ? match[2] : "";

        if (prog && sProg !== prog) return false;
        if (year && sStart !== year) return false;

        if (term) {
            const content = [s.name, s.batch, s.institute, s.email, s.position].join(" ").toLowerCase();
            if (!content.includes(term)) return false;
        }
        return true;
    });

    // Group Results
    const grouped = {};
    filtered.forEach(s => {
        if (!grouped[s.batch]) grouped[s.batch] = [];
        grouped[s.batch].push(s);
    });

    tbody.innerHTML = '';
    
    if (sidebar) sidebar.innerHTML = '';

    function getProgPriority(batchStr) {
        const str = batchStr.toLowerCase();
        if (str.includes('int') && str.includes('msc') && !str.includes('phd')) return 1;
        if (str.includes('int') && str.includes('phd')) return 2;
        if (str.includes('msc-phd') || str.includes('msc - phd')) return 2;
        if (str.includes('phd')) return 3;
        if (str.includes('postdoc') || str.includes('post-doc')) return 4;
        if (str.includes('faculty')) return 5;
        if (str.includes('staff')) return 6;
        return 99;
    }

    const batches = Object.keys(grouped).sort((a, b) => {
        const pA = getProgPriority(a);
        const pB = getProgPriority(b);
        if (pA !== pB) return pA - pB;
        
        const yA = a.match(/\s+(\d{4})/) ? parseInt(a.match(/\s+(\d{4})/)[1]) : 0;
        const yB = b.match(/\s+(\d{4})/) ? parseInt(b.match(/\s+(\d{4})/)[1]) : 0;
        return yB - yA;
    });
    
    batches.forEach(batchName => {
        const students = grouped[batchName];
        const safeId = "batch-" + batchName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

        // Populate Sidebar
        if (sidebar) {
            sidebar.innerHTML += `<a class="nav-link" href="#${safeId}">${batchName}</a>`;
        }

        // Add Header Row
        const headerRow = document.createElement('tr');
        headerRow.id = safeId;
        headerRow.className = "table-light";
        headerRow.innerHTML = `<td colspan="8" class="fw-bold text-dark py-3 border-bottom"><i class="fas fa-folder-open text-primary me-2"></i> ${batchName} <span class="badge bg-secondary ms-2">${students.length}</span></td>`;
        tbody.appendChild(headerRow);

        // Add Students
        students.forEach(s => {
            const row = document.createElement('tr');
            
            const avatarHtml = s.photo
                ? `<img src="${s.photo}" class="avatar" alt="Photo" style="width: 40px; height: 40px;">`
                : `<div class="avatar-placeholder" style="width: 40px; height: 40px;"><i class="fas fa-user text-muted"></i></div>`;

            let contactHtml = '';
            if (s.email) contactHtml += `<a href="mailto:${s.email}" class="icon-btn mb-1" title="Email"><i class="fas fa-envelope"></i></a>`;
            if (s.website) contactHtml += `<a href="${s.website}" target="_blank" class="icon-btn" title="Website"><i class="fas fa-globe"></i></a>`;
            
            const badgeClass = getBadgeClass(s.position);
            const positionHtml = s.position
                ? `<span class="badge rounded-pill badge-custom ${badgeClass} d-block mb-1" style="width: fit-content;">${s.position}</span>`
                : '';

            row.innerHTML = `
                <td width="60">${avatarHtml}</td>
                <td>
                    <div class="fw-bold text-dark">${s.name}</div>
                </td>
                <td>
                    <div class="fw-bold">${s.supervisor || '-'}</div>
                </td>
                <td>
                    <div class="small text-dark">${s.researchInterests || '-'}</div>
                </td>
                <td>
                    ${positionHtml}
                    <small class="text-muted d-block">${s.institute || ''}</small>
                </td>
                <td>${contactHtml}</td>
                <td class="text-muted small">${s.additionalInfo || ''}</td>
                <td class="text-end" style="min-width: 90px;">
                    <button class="btn btn-sm btn-light text-primary me-1 btn-edit shadow-sm border" title="Edit Record"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-light text-danger btn-delete shadow-sm border" title="Delete Record"><i class="fas fa-trash"></i></button>
                </td>
            `;
            
            row.querySelector('.btn-delete').addEventListener('click', () => deleteStudent(s.id, s.name));
            row.querySelector('.btn-edit').addEventListener('click', () => startEdit(s.id, s));
            tbody.appendChild(row);
        });
    });
}

// 4. Listeners
document.getElementById('adminSearch').addEventListener('input', applyAdminFilters);
document.getElementById('adminFilterProg').addEventListener('change', applyAdminFilters);
document.getElementById('adminFilterYear').addEventListener('change', applyAdminFilters);

// --- LOAD TABLE ---
// async function loadTable() {
//     const tbody = document.getElementById('admin-table-body');
//     tbody.innerHTML = '<tr><td colspan="4" class="text-center">Loading...</td></tr>';
    
//     const q = query(collection(db, "students"), orderBy("batch", "desc"));
//     const snapshot = await getDocs(q);
    
//     tbody.innerHTML = '';
//     snapshot.forEach(docSnap => {
//         const s = docSnap.data();
//         const row = document.createElement('tr');
//         row.innerHTML = `
//             <td class="fw-bold">${s.name}</td>
//             <td><span class="badge bg-secondary">${s.batch}</span></td>
//             <td><small>${s.institute || '-'}</small></td>
//             <td class="text-end">
//                 <button class="btn btn-sm btn-outline-primary me-1 btn-edit"><i class="fas fa-edit"></i></button>
//                 <button class="btn btn-sm btn-outline-danger btn-delete"><i class="fas fa-trash"></i></button>
//             </td>
//         `;
//         row.querySelector('.btn-delete').addEventListener('click', () => deleteStudent(docSnap.id, s.name));
//         row.querySelector('.btn-edit').addEventListener('click', () => startEdit(docSnap.id, s));
//         tbody.appendChild(row);
//     });
// }

// --- DELETE ---
async function deleteStudent(id, name) {
    if(confirm(`Delete ${name}?`)) {
        await deleteDoc(doc(db, "students", id));
        loadTable();
    }
}

// --- EDIT FUNCTION ---
function startEdit(id, data) {
    document.getElementById('editDocId').value = id;
    
    // Parse Batch
    if (data.batch) {
        const match = data.batch.match(/^(.*)\s+(\d{4})(?:-(\d{2,4}))?$/);
        if (match) {
            document.getElementById('inProg').value = match[1];
            document.getElementById('inStart').value = match[2];
            if (match[3]) {
                const endY = match[3].length === 2 ? "20" + match[3] : match[3];
                document.getElementById('inEnd').value = endY;
            }
        }
    }

    // Fill Fields
    document.getElementById('inName').value = data.name || '';
    document.getElementById('inSupervisor').value = data.supervisor || '';
    document.getElementById('inInterests').value = data.researchInterests || '';
    document.getElementById('inPos').value = data.position || '';
    document.getElementById('inInst').value = data.institute || '';
    document.getElementById('inEmail').value = data.email || '';
    document.getElementById('inWeb').value = data.website || '';
    document.getElementById('inInfo').value = data.additionalInfo || '';
    
    // Photo Logic
    document.getElementById('inPhoto').value = data.photo || '';
    document.getElementById('uploadStatus').innerText = data.photo ? "Has existing photo" : "No file chosen";
    document.getElementById('inFile').value = ""; // Reset file picker

    // UI Updates
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-user-edit text-primary me-2"></i> Edit Record';
    document.getElementById('btnSave').classList.replace('btn-primary-custom', 'btn-warning');
    
    // Open Modal
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('recordModal'));
    modal.show();
}

// --- SAVE ENTRY ---
document.getElementById('btnSave').addEventListener('click', async () => {
    const btn = document.getElementById('btnSave');
    const status = document.getElementById('uploadStatus');
    const fileInput = document.getElementById('inFile');
    
    btn.disabled = true;
    btn.innerText = "Processing...";

    let photoURL = document.getElementById('inPhoto').value; 

    // 1. Upload to Cloudinary if file selected
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];

        // --- NEW: SIZE RESTRICTION (1MB = 1024 * 1024 bytes) ---
        const maxSize = 500 * 1024; // 500KB
        
        if (file.size > maxSize) {
            alert("File is too large! Max size is 500KB.");
            status.innerText = "Upload failed: File too large";
            
            // Reset button and stop everything
            btn.disabled = false;
            btn.innerText = "Save Entry";
            return; 
        }
        // -------------------------------------------------------

        status.innerText = "Uploading to Cloudinary...";
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);

        try {
            const response = await fetch(CLOUDINARY_URL, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            const result = await response.json();
            photoURL = result.secure_url; 
            status.innerText = "Upload complete!";
            
        } catch (err) {
            console.error(err);
            alert("Image Upload Failed. Check Cloud Name/Preset.");
            btn.disabled = false;
            btn.innerText = "Save Entry";
            return;
        }
    }

    // 2. Prepare Data
    const prog = document.getElementById('inProg').value;
    const start = document.getElementById('inStart').value;
    const end = document.getElementById('inEnd').value;

    if (!prog || !start) { alert("Programme and Start Year required!"); btn.disabled = false; return; }

    let batchStr = `${prog} ${start}`;
    if (end) batchStr += `-${end.slice(-2)}`;

    const data = {
        batch: batchStr,
        name: document.getElementById('inName').value,
        supervisor: document.getElementById('inSupervisor').value,
        researchInterests: document.getElementById('inInterests').value,
        position: document.getElementById('inPos').value,
        institute: document.getElementById('inInst').value,
        email: document.getElementById('inEmail').value,
        website: document.getElementById('inWeb').value,
        photo: photoURL, // Save the Cloudinary Link
        additionalInfo: document.getElementById('inInfo').value,
        lastUpdated: new Date()
    };

    if(!data.name) { alert("Name required!"); btn.disabled = false; return; }

    // 3. Save to Firestore
    try {
        const id = document.getElementById('editDocId').value;
        if (id) {
            await updateDoc(doc(db, "students", id), data);
        } else {
            await addDoc(collection(db, "students"), data);
        }
        
        const modalEl = document.getElementById('recordModal');
        const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
        if (modal) modal.hide();
        
        loadTable();
        alert("Saved Successfully!");
    } catch (e) {
        console.error(e);
        alert("Database Error: " + e.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save me-2"></i> Commit Save';
    }
});

// 3. ADD THE INBOX LOGIC
async function loadInbox() {
    const container = document.getElementById('inbox-container');
    container.innerHTML = '<div class="text-center text-muted small">Checking...</div>';

    try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<div class="text-center text-muted small">No new messages.</div>';
            return;
        }

        let html = '<ul class="list-group list-group-flush">';
        
        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            const date = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
            
            html += `
                <li class="list-group-item d-flex justify-content-between align-items-start bg-light mb-2 rounded border">
                    <div class="ms-2 me-auto">
                        <div class="fw-bold text-dark">
                            ${msg.name} 
                            <span class="badge bg-secondary rounded-pill fw-normal small">${msg.batch || 'N/A'}</span>
                        </div>
                        <p class="mb-1 text-secondary small">${msg.message}</p>
                        <small class="text-muted" style="font-size: 0.75rem;">Sent: ${date}</small>
                    </div>
                    <button class="btn btn-sm text-danger btn-delete-msg" data-id="${docSnap.id}" title="Dismiss">
                        <i class="fas fa-times"></i>
                    </button>
                </li>
            `;
        });

        html += '</ul>';
        container.innerHTML = html;

        // Attach Delete Events
        document.querySelectorAll('.btn-delete-msg').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm("Dismiss this message?")) {
                    await deleteDoc(doc(db, "messages", id));
                    loadInbox(); // Refresh inbox
                }
            });
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-danger small">Error loading inbox.</div>';
    }
}

// 4. Attach Refresh Button
document.getElementById('btnRefreshInbox').addEventListener('click', loadInbox);

async function loadApprovals() {
    const container = document.getElementById('approvals-container');
    container.innerHTML = '<div class="text-center small text-muted">Checking...</div>';

    try {
        const q = query(collection(db, "requests"), orderBy("submittedAt", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = '<div class="text-center small text-muted">No pending approvals.</div>';
            return;
        }

        // Fetch original docs for UPDATE requests
        const items = [];
        for (const docSnap of snapshot.docs) {
            const req = docSnap.data();
            let original = null;
            if (req.type === 'UPDATE' && req.originalId) {
                try {
                    const origSnap = await getDoc(doc(db, 'students', req.originalId));
                    if (origSnap.exists()) original = origSnap.data();
                } catch(_) {}
            }
            items.push({ docSnap, req, original });
        }

        let html = '<div class="list-group list-group-flush">';

        items.forEach(({ docSnap, req, original }) => {
            const dataString = encodeURIComponent(JSON.stringify(req));
            const originalString = original ? encodeURIComponent(JSON.stringify(original)) : '';
            const isUpdate = req.type === 'UPDATE';

            const badgeHtml = isUpdate
                ? '<span class="badge bg-warning text-dark me-2">Update Request</span>'
                : '<span class="badge bg-success me-2">New Join</span>';

            const viewChangesBtn = isUpdate
                ? `<button class="btn btn-sm btn-outline-secondary btn-view-diff"
                        data-id="${docSnap.id}"
                        data-entry="${dataString}"
                        data-original="${originalString}"
                        data-name="${req.name}">
                        <i class="fas fa-eye me-1"></i>Changes
                   </button>`
                : '';

            html += `
                <div class="list-group-item bg-light mb-2 rounded border">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            ${badgeHtml}
                            <strong>${req.name}</strong>
                            <small class="text-muted">(${req.batch})</small>
                            ${!isUpdate ? `<div class="small text-secondary mt-1">${req.position || ''} ${req.institute ? 'at ' + req.institute : ''}</div>` : ''}
                        </div>
                        <div class="d-flex gap-2 flex-shrink-0">
                            ${viewChangesBtn}
                            <button class="btn btn-sm btn-success btn-approve" data-id="${docSnap.id}" data-entry="${dataString}">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger btn-reject" data-id="${docSnap.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Listeners
        document.querySelectorAll('.btn-reject').forEach(btn => {
            btn.addEventListener('click', (e) => rejectRequest(e.currentTarget.dataset.id));
        });
        document.querySelectorAll('.btn-approve').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const data = JSON.parse(decodeURIComponent(e.currentTarget.dataset.entry));
                approveRequest(id, data);
            });
        });
        document.querySelectorAll('.btn-view-diff').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const b = e.currentTarget;
                const req = JSON.parse(decodeURIComponent(b.dataset.entry));
                const original = b.dataset.original ? JSON.parse(decodeURIComponent(b.dataset.original)) : null;
                showDiffModal(b.dataset.id, req, original);
            });
        });

    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="text-danger small">Error loading approvals.</div>';
    }
}

// --- DIFF MODAL ---
const FIELD_LABELS = {
    position: 'Position',
    institute: 'Institute',
    email: 'Email',
    researchInterests: 'Research Interests',
    website: 'Website',
    additionalInfo: 'Notes',
    photo: 'Photo'
};

function showDiffModal(docId, req, original) {
    document.getElementById('diffModalName').textContent = req.name + ' (' + req.batch + ')';

    let bodyHtml = '';

    if (original) {
        const changedRows = Object.entries(FIELD_LABELS)
            .filter(([key]) => {
                const oldVal = (original[key] || '').toString().trim();
                const newVal = (req[key] || '').toString().trim();
                return newVal && oldVal !== newVal;
            })
            .map(([key, label]) => {
                const oldVal = original[key] || '—';
                const newVal = req[key];
                if (key === 'photo') {
                    return `<tr>
                        <td class="text-muted fw-bold small align-middle" style="width:28%">${label}</td>
                        <td>
                            <img src="${oldVal}" style="height:48px;border-radius:6px;object-fit:cover;" onerror="this.style.display='none'">
                            <i class="fas fa-arrow-right text-muted mx-2 small"></i>
                            <img src="${newVal}" style="height:48px;border-radius:6px;object-fit:cover;">
                        </td>
                    </tr>`;
                }
                return `<tr>
                    <td class="text-muted fw-bold small align-middle" style="width:28%">${label}</td>
                    <td>
                        <span class="text-danger text-decoration-line-through me-2">${oldVal}</span>
                        <i class="fas fa-arrow-right text-muted small mx-1"></i>
                        <span class="text-success fw-semibold ms-2">${newVal}</span>
                    </td>
                </tr>`;
            }).join('');

        if (changedRows) {
            bodyHtml = `<table class="table table-sm table-borderless mb-0">${changedRows}</table>`;
        } else {
            bodyHtml = '<p class="text-muted fst-italic mb-0">No field differences detected.</p>';
        }

        const unchangedFields = Object.entries(FIELD_LABELS)
            .filter(([key]) => {
                const oldVal = (original[key] || '').toString().trim();
                const newVal = (req[key] || '').toString().trim();
                return !newVal || oldVal === newVal;
            }).map(([,label]) => label);

        if (unchangedFields.length) {
            bodyHtml += `<p class="text-muted small mt-3 mb-0"><strong>Unchanged:</strong> ${unchangedFields.join(', ')}</p>`;
        }
    } else {
        bodyHtml = '<p class="text-muted fst-italic">Original student record not found — it may have been deleted.</p>';
    }

    document.getElementById('diffModalBody').innerHTML = bodyHtml;

    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('diffModal'));

    // Clone to remove stale event listeners
    const approveBtn = document.getElementById('diffModalApprove');
    const rejectBtn  = document.getElementById('diffModalReject');
    const freshApprove = approveBtn.cloneNode(true);
    const freshReject  = rejectBtn.cloneNode(true);
    approveBtn.replaceWith(freshApprove);
    rejectBtn.replaceWith(freshReject);

    freshApprove.addEventListener('click', () => { modal.hide(); approveRequest(docId, req); });
    freshReject.addEventListener('click',  () => { modal.hide(); rejectRequest(docId); });

    modal.show();
}


// --- REJECT ACTION ---
async function rejectRequest(id) {
    if(!confirm("Reject and delete this application?")) return;
    try {
        await deleteDoc(doc(db, "requests", id));
        loadApprovals(); // Refresh list
    } catch(e) {
        alert("Error rejecting: " + e.message);
    }
}

// --- APPROVE ACTION (Handles both NEW and UPDATE) ---
async function approveRequest(id, data) {
    const isUpdate = (data.type === "UPDATE");
    const actionText = isUpdate ? "Overwrite existing entry" : "Create new entry";
    
    if(!confirm(`Approve ${data.name}? This will ${actionText}.`)) return;

    try {
        // 1. Prepare Data for Main Database
        const studentData = { ...data };
        
        // Remove request-specific metadata (we don't want these in the student profile)
        delete studentData.submittedAt; 
        delete studentData.status;
        delete studentData.type;       
        delete studentData.originalId; 
        
        studentData.lastUpdated = new Date();

        // 2. Write to Database
        if (isUpdate && data.originalId) {
            // CASE A: Update Existing Student (Overwrite)
            await updateDoc(doc(db, "students", data.originalId), studentData);
        } else {
            // CASE B: New Student (Create)
            await addDoc(collection(db, "students"), studentData);
        }

        // 3. Delete from Requests Queue
        await deleteDoc(doc(db, "requests", id));

        alert("Approved successfully!");
        loadApprovals(); // Refresh approvals list
        loadTable();     // Refresh main database table
    } catch (e) {
        console.error(e);
        alert("Error approving: " + e.message);
    }
}

// Attach Refresh Button
document.getElementById('btnRefreshApprovals').addEventListener('click', loadApprovals);