import { db } from './config.js';
import { collection, getDocs, orderBy, query, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { notifyDiscord } from './notify.js';

// --- GLOBAL VARIABLES ---
let allStudents = []; // Store all data here for client-side filtering

// 1. Populate Filter Dropdowns (Start Year & End Year)
const startSelect = document.getElementById('filterStart');
const endSelect = document.getElementById('filterEnd');
const currentYear = new Date().getFullYear();

// Loop backwards from Next Year down to 2007
for (let y = currentYear + 1; y >= 2007; y--) {
    if (startSelect) startSelect.add(new Option(y, y));
    if (endSelect) endSelect.add(new Option(y, y));
}

// --- LOAD DATA ---
async function loadAlumni() {
    const container = document.getElementById('alumni-container');
    const sidebar = document.getElementById('sidebar-nav');

    // Optional: Update Stats if elements exist
    const statAlumni = document.getElementById('total-alumni');
    const statBatches = document.getElementById('total-batches');

    try {
        const q = query(collection(db, "students"), orderBy("batch", "desc"));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            container.innerHTML = `<div class="text-center mt-5"><h3 class="text-muted">No records found.</h3></div>`;
            sidebar.innerHTML = '';
            return;
        }

        // 1. Store Data Globally
        allStudents = [];
        snapshot.forEach(doc => {
            allStudents.push(doc.data());
        });

        // 2. Update Hero Stats (if present)
        if (statAlumni) statAlumni.innerText = allStudents.length;
        if (statBatches) statBatches.innerText = [...new Set(allStudents.map(s => s.batch))].length;

        // 3. Initial Render (Apply empty filters)
        applyFilters();

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="alert alert-danger m-5">Error loading data: ${error.message}</div>`;
    }
}

// --- HELPER: SMART FUZZY MATCH ---
function isFuzzyMatch(text, query) {
    // 1. Clean and split into words (tokens)
    // Remove dots (K. L. -> K L) and lowercase everything
    const cleanText = text.toLowerCase().replace(/\./g, ' ');
    const cleanQuery = query.toLowerCase().replace(/\./g, ' ');

    const textTokens = cleanText.split(/\s+/).filter(t => t.length > 0);
    const queryTokens = cleanQuery.split(/\s+/).filter(t => t.length > 0);

    // 2. Check if ALL query tokens find a match in text tokens
    // We want "Kamal Lochan" to match "K L Patra"
    // So for every word the user typed...
    return queryTokens.every(qToken => {
        // ...does it match ANY word in the database name?
        return textTokens.some(tToken => {
            // Match if:
            // A) Exact match or Substring (standard search)
            // B) Query starts with Text (e.g. Query "Kamal" matches Text "K")
            // C) Text starts with Query (e.g. Query "K" matches Text "Kamal")

            return tToken.includes(qToken) ||
                qToken.startsWith(tToken) ||
                tToken.startsWith(qToken);
        });
    });
}

// --- FILTER LOGIC (Updated) ---
function applyFilters() {
    const term = document.getElementById('searchInput') ? document.getElementById('searchInput').value : "";
    const prog = document.getElementById('filterProg') ? document.getElementById('filterProg').value : "";
    const start = document.getElementById('filterStart') ? document.getElementById('filterStart').value : "";
    const end = document.getElementById('filterEnd') ? document.getElementById('filterEnd').value : "";

    const filtered = allStudents.filter(s => {
        // Parse Batch
        const match = s.batch.match(/^(.*)\s+(\d{4})(?:-(\d{2,4}))?$/);
        const sProg = match ? match[1] : "";
        const sStart = match ? match[2] : "";
        let sEnd = match && match[3] ? match[3] : "";
        if (sEnd.length === 2) sEnd = "20" + sEnd;

        // 1. Dropdown Filters
        if (prog && sProg !== prog) return false;
        if (start && sStart !== start) return false;
        if (end && sEnd !== end) return false;

        // 2. Search Box (SMART FUZZY MATCH)
        if (term) {
            // Search in Name
            const nameMatch = isFuzzyMatch(s.name, term);

            // Search in Supervisor (using same smart logic)
            const supervisorMatch = s.supervisor ? isFuzzyMatch(s.supervisor, term) : false;

            // Search in other fields (Standard "Includes" search is fine for these)
            const otherContent = [
                s.institute,
                s.position,
                s.researchInterests,
                s.batch
            ].join(" ").toLowerCase();
            const otherMatch = otherContent.includes(term.toLowerCase());

            // If ANY of these match, keep the student
            if (!nameMatch && !supervisorMatch && !otherMatch) return false;
        }

        return true;
    });

    // Group Results
    const grouped = {};
    filtered.forEach(s => {
        if (!grouped[s.batch]) grouped[s.batch] = [];
        grouped[s.batch].push(s);
    });

    renderPage(grouped);
}

// --- FILTER LOGIC ---
// function applyFilters() {
//     const term = document.getElementById('searchInput') ? document.getElementById('searchInput').value.toLowerCase() : "";
//     const prog = document.getElementById('filterProg') ? document.getElementById('filterProg').value : "";
//     const start = document.getElementById('filterStart') ? document.getElementById('filterStart').value : "";
//     const end = document.getElementById('filterEnd') ? document.getElementById('filterEnd').value : "";

//     const filtered = allStudents.filter(s => {
//         // Parse Batch String "Int. MSc. 2017-22"
//         const match = s.batch.match(/^(.*)\s+(\d{4})(?:-(\d{2,4}))?$/);
//         const sProg = match ? match[1] : "";
//         const sStart = match ? match[2] : "";
//         let sEnd = match && match[3] ? match[3] : "";

//         // Normalize End Year (convert "22" -> "2022")
//         if (sEnd.length === 2) sEnd = "20" + sEnd; 

//         // 1. Check Dropdowns
//         if (prog && sProg !== prog) return false;
//         if (start && sStart !== start) return false;
//         if (end && sEnd !== end) return false;

//         // 2. Check Search Text (Fuzzy match)
//         if (term) {
//             const content = [
//                 s.name, 
//                 s.supervisor, 
//                 s.institute, 
//                 s.position, 
//                 s.researchInterests, 
//                 s.batch
//             ].join(" ").toLowerCase();

//             if (!content.includes(term)) return false;
//         }

//         return true;
//     });

//     // Group Results by Batch
//     const grouped = {};
//     filtered.forEach(s => {
//         if (!grouped[s.batch]) grouped[s.batch] = [];
//         grouped[s.batch].push(s);
//     });

//     renderPage(grouped);
// }

function getBadgeClass(position) {
    if (!position) return '';
    const pos = position.toLowerCase();
    if (pos.includes('phd') || pos.includes('doctoral')) return 'badge-phd';
    if (pos.includes('faculty') || pos.includes('professor') || pos.includes('assist')) return 'badge-faculty';
    if (pos.includes('postdoc') || pos.includes('post doc')) return 'badge-postdoc';
    if (pos.includes('msc') || pos.includes('master')) return 'badge-msc';
    return 'badge-default';
}

// --- RENDER FUNCTION ---
function renderPage(groupedData) {
    const container = document.getElementById('alumni-container');
    const sidebar = document.getElementById('sidebar-nav');

    container.innerHTML = "";
    sidebar.innerHTML = "";

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

    const batches = Object.keys(groupedData).sort((a, b) => {
        const pA = getProgPriority(a);
        const pB = getProgPriority(b);
        if (pA !== pB) return pA - pB;
        
        const yA = a.match(/\s+(\d{4})/) ? parseInt(a.match(/\s+(\d{4})/)[1]) : 0;
        const yB = b.match(/\s+(\d{4})/) ? parseInt(b.match(/\s+(\d{4})/)[1]) : 0;
        return yB - yA;
    });

    // Show "No Matches" if filter is too strict
    if (batches.length === 0) {
        container.innerHTML = `<div class="text-center py-5 text-muted">No matches found for your search.</div>`;
        return;
    }

    for (const batchName of batches) {
        const students = groupedData[batchName];
        const safeId = "batch-" + batchName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

        // 1. Sidebar Link
        sidebar.innerHTML += `
            <a class="nav-link" href="#${safeId}">
                ${batchName}
            </a>
        `;

        // 2. Table Rows
        let rows = students.map(s => {
            // Avatar Logic
            const avatarHtml = s.photo
                ? `<img src="${s.photo}" class="avatar" alt="${s.name}">`
                : `<div class="avatar-placeholder">${s.name.charAt(0)}</div>`;

            // Contact Icons
            let contactHtml = '';
            if (s.email) contactHtml += `<a href="mailto:${s.email}" class="icon-btn" title="Email"><i class="fas fa-envelope"></i></a>`;
            if (s.website) contactHtml += `<a href="${s.website}" target="_blank" class="icon-btn" title="Website"><i class="fas fa-globe"></i></a>`;

            const badgeClass = getBadgeClass(s.position);
            const positionHtml = s.position
                ? `<span class="badge rounded-pill badge-custom ${badgeClass}">${s.position}</span>`
                : '';

            return `
            <tr>
                <td width="70">${avatarHtml}</td>
                <td>
                    <div class="primary-text">${s.name}</div>
                </td>
                <td>
                    <div class="primary-text">${s.supervisor || '<span class="text-muted">-</span>'}</div>
                </td>
                <td>
                    <div class="small text-dark">${s.researchInterests || '-'}</div>
                </td>
                <td>
                    ${positionHtml}
                    <span class="sub-text ${s.position ? 'mt-1' : ''}">${s.institute || ''}</span>
                </td>
                <td>${contactHtml}</td>
                <td class="text-muted small">${s.additionalInfo || ''}</td>
            </tr>
            `;
        }).join('');

        // 3. Render Batch Section
        container.innerHTML += `
            <div id="${safeId}" class="batch-section">
                <div class="batch-header">
                    <div class="batch-title">${batchName}</div>
                    <div class="batch-count">${students.length} Students</div>
                </div>
                
                <div class="modern-table-card">
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Photo</th>
                                    <th>Name</th>
                                    <th>NISER Supervisor</th>
                                    <th>Research Interests</th>
                                    <th>Current Status</th>
                                    <th>Contact</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
}

// --- HANDLE "REQUEST UPDATE" MODAL ---
const btnUpdate = document.getElementById('btnSendUpdate');
if (btnUpdate) {
    btnUpdate.addEventListener('click', async () => {
        const btn = document.getElementById('btnSendUpdate');
        const status = document.getElementById('msgStatus');

        const name = document.getElementById('msgName').value;
        const batch = document.getElementById('msgBatch').value;
        const message = document.getElementById('msgContent').value;

        if (!name || !message) {
            status.innerText = "Please provide your name and message.";
            return;
        }

        try {
            btn.disabled = true;
            btn.innerText = "Sending...";

            await addDoc(collection(db, "messages"), {
                name: name,
                batch: batch,
                message: message,
                timestamp: new Date(),
                status: "unread"
            });
            notifyDiscord('dm_message', { name, batch, message }); // fire-and-forget

            // Close Modal safely
            const modalEl = document.getElementById('updateModal');
            // Check if bootstrap is defined (it's loaded via CDN in index.html)
            if (typeof bootstrap !== 'undefined') {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
            } else {
                // Fallback if bootstrap object isn't found immediately
                modalEl.classList.remove('show');
                modalEl.style.display = 'none';
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
            }

            alert("Thanks! Your request has been sent to the Admin.");

            // Clear form
            document.getElementById('msgName').value = "";
            document.getElementById('msgBatch').value = "";
            document.getElementById('msgContent').value = "";
            status.innerText = "";

        } catch (e) {
            console.error(e);
            status.innerText = "Error sending: " + e.message;
        } finally {
            btn.disabled = false;
            btn.innerText = "Send Request";
        }
    });
}

// --- EVENT LISTENERS FOR FILTERS ---
if (document.getElementById('searchInput')) document.getElementById('searchInput').addEventListener('input', applyFilters);
if (document.getElementById('filterProg')) document.getElementById('filterProg').addEventListener('change', applyFilters);
if (document.getElementById('filterStart')) document.getElementById('filterStart').addEventListener('change', applyFilters);
if (document.getElementById('filterEnd')) document.getElementById('filterEnd').addEventListener('change', applyFilters);

if (document.getElementById('btnReset')) {
    document.getElementById('btnReset').addEventListener('click', () => {
        document.getElementById('searchInput').value = "";
        document.getElementById('filterProg').value = "";
        document.getElementById('filterStart').value = "";
        document.getElementById('filterEnd').value = "";
        applyFilters();
    });
}

// Start Loading
loadAlumni();
