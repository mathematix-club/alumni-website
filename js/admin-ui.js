function toggleSidebar() {
    document.getElementById('adminSidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

// Auto-close on mobile click
document.addEventListener('click', function (e) {
    if (e.target.closest('.nav-link') && window.innerWidth < 992) {
        toggleSidebar();
    }
});

// Maximize Logic for Split-Pane
function toggleMaximize(primaryId, secondaryId) {
    const primary = document.getElementById(primaryId);
    const secondary = document.getElementById(secondaryId);
    const sidebar = document.getElementById('adminSidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const row = document.getElementById('dashboardRow');

    const isMaximized = primary.dataset.maximized === 'true';

    // Find the expand/compress icon inside the button that triggered this
    const expandIcon = primary.querySelector('.fa-expand');
    const compressIcon = primary.querySelector('.fa-compress');

    if (isMaximized) {
        // --- RESTORE ---
        primary.dataset.maximized = 'false';

        // Restore original classes
        if (primaryId === 'leftPane') {
            primary.className = "col-xl-8 col-lg-7 d-block d-lg-block";
            secondary.className = "col-xl-4 col-lg-5 d-none d-lg-block";
        } else {
            primary.className = "col-xl-4 col-lg-5 d-none d-lg-block";
            secondary.className = "col-xl-8 col-lg-7 d-block d-lg-block";
            setTimeout(() => row.classList.remove('justify-content-end'), 300);
        }

        // Show sidebar
        if (sidebar) sidebar.style.removeProperty('display');
        if (mainWrapper) mainWrapper.style.marginLeft = 'var(--sidebar-width)';

        // Swap icon
        if (compressIcon) { compressIcon.classList.remove('fa-compress'); compressIcon.classList.add('fa-expand'); }

    } else {
        // --- MAXIMIZE ---
        primary.dataset.maximized = 'true';

        if (primaryId === 'rightPane') {
            row.classList.add('justify-content-end');
        } else {
            row.classList.remove('justify-content-end');
        }

        // Full-width primary, hide secondary without disturbing Bootstrap classes
        primary.className = "col-xl-12 col-lg-12 d-block";
        secondary.className = "d-none";   // simple hide, we restore proper classes on un-maximize

        // Hide sidebar
        if (sidebar) sidebar.style.display = 'none';
        if (mainWrapper) mainWrapper.style.marginLeft = '0';

        // Swap icon
        if (expandIcon) { expandIcon.classList.remove('fa-expand'); expandIcon.classList.add('fa-compress'); }
    }
}

// Mobile Tabs Logic
function switchMobilePane(pane) {
    const leftPane = document.getElementById('leftPane');
    const rightPane = document.getElementById('rightPane');
    const btnTable = document.getElementById('btnShowTable');
    const btnQueues = document.getElementById('btnShowQueues');

    if (pane === 'table') {
        leftPane.classList.replace('d-none', 'd-block');
        rightPane.classList.replace('d-block', 'd-none');
        
        btnTable.classList.replace('btn-outline-secondary', 'btn-primary-custom');
        btnTable.style.background = '';
        btnQueues.classList.replace('btn-primary-custom', 'btn-outline-secondary');
        btnQueues.style.background = '#fff';
    } else {
        leftPane.classList.replace('d-block', 'd-none');
        rightPane.classList.replace('d-none', 'd-block');
        
        btnQueues.classList.replace('btn-outline-secondary', 'btn-primary-custom');
        btnQueues.style.background = '';
        btnTable.classList.replace('btn-primary-custom', 'btn-outline-secondary');
        btnTable.style.background = '#fff';
    }
}

// Quick Helper for 'Add Student'
function openAddStudentModal() {
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-user-plus text-primary me-2"></i> Add Record';
    document.getElementById('editDocId').value = "";

    // Clear inputs immediately
    ['inName', 'inSupervisor', 'inInterests', 'inPos', 'inInst', 'inEmail', 'inWeb', 'inPhoto', 'inInfo', 'inProg', 'inStart', 'inEnd', 'inFile'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    document.getElementById('uploadStatus').innerText = "No file chosen";

    const modal = new bootstrap.Modal(document.getElementById('recordModal'));
    modal.show();
}
