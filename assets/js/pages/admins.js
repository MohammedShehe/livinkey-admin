document.addEventListener("DOMContentLoaded", () => {
    renderLayout("admins", "Admins Management", "Manage admin accounts and their module permissions");

    // FIXED: Removed "admins" from modules - backend does not support it
    const MODULES = [
        { key: "tenants", label: "Tenants Management" },
        { key: "guests", label: "Guests" },
        { key: "bills", label: "Bills" },
        { key: "pgs", label: "PGs Management" },
        { key: "maintenance", label: "Maintenance" },
        { key: "documents", label: "Documents" },
        { key: "feedbacks", label: "Feedbacks" }
    ];

    let adminData = [];
    let activeAdminId = null;

    // ============================================
    // FETCH ADMINS
    // ============================================
    async function loadAdmins() {
        try {
            const res = await API.admins.getAll();
            if (res.success) {
                adminData = res.data || [];
                renderTable();
            } else {
                showToast(res.message || "Failed to load admins", "danger");
            }
        } catch (error) {
            showToast("Error loading admins: " + error.message, "danger");
        }
    }

    function renderTable(search = "") {
        const f = search.trim().toLowerCase();
        let filtered = adminData;
        if (f) {
            filtered = adminData.filter(a =>
                a.name?.toLowerCase().includes(f) ||
                a.email?.toLowerCase().includes(f) ||
                a.phone?.includes(f)
            );
        }

        const tbody = document.getElementById("adminsTbody");
        if (!tbody) return;

        if (filtered.length === 0) {
            tbody.innerHTML = '';
            document.getElementById("adminsEmpty").classList.remove("d-none");
            return;
        }
        document.getElementById("adminsEmpty").classList.add("d-none");

        tbody.innerHTML = filtered.map(a => `
            <tr>
                <td><span class="name-link" onclick="openAccess('${a.id}')">${a.name || '—'}</span></td>
                <td>${a.email || '—'}</td>
                <td>${a.phone || '—'}</td>
                <td>
                    ${a.id_document ? `<img src="${a.id_document}" alt="ID Document" style="width:40px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="previewDocument('${a.id}')">` : "—"}
                </td>
                <td class="text-end">
                    <button class="btn-icon me-1" title="Edit" onclick="editAdmin('${a.id}')"><i class="bi bi-pencil"></i></button>
                    <button class="btn-icon" title="Delete" onclick="deleteAdmin('${a.id}')"><i class="bi bi-trash3"></i></button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("adminSearch")?.addEventListener("input", (e) => renderTable(e.target.value));

    // ============================================
    // AADHAR CAMERA CAPTURE (Desktop + Mobile)
    // ============================================
    let cameraStream = null;
    let capturedFile = null;
    let currentFacingMode = 'environment';
    let activeFileInput = null;
    let activePreviewContainer = null;
    let activePreviewImg = null;

    function setupAadharCapture(fileInputId, previewContainerId, previewImgId, removeBtnId, cameraBtnId, fileBtnId) {
        const fileInput = document.getElementById(fileInputId);
        const previewContainer = document.getElementById(previewContainerId);
        const previewImg = document.getElementById(previewImgId);
        const removeBtn = document.getElementById(removeBtnId);
        const cameraBtn = document.getElementById(cameraBtnId);
        const fileBtn = document.getElementById(fileBtnId);

        if (!fileInput) return;

        // Helper to show preview
        function showPreview(file) {
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImg.src = e.target.result;
                    previewContainer.classList.remove('d-none');
                };
                reader.readAsDataURL(file);
            }
        }

        // Camera button - opens camera modal with getUserMedia
        cameraBtn?.addEventListener('click', function() {
            // Store references for the camera modal
            activeFileInput = fileInput;
            activePreviewContainer = previewContainer;
            activePreviewImg = previewImg;
            
            // Show camera modal
            const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
            cameraModal.show();
            startCamera();
        });

        // File button - opens file picker
        fileBtn?.addEventListener('click', function() {
            fileInput.click();
        });

        // File input change - show preview
        fileInput.addEventListener('change', function() {
            if (this.files && this.files.length > 0) {
                showPreview(this.files[0]);
            } else {
                previewContainer?.classList.add('d-none');
            }
        });

        // Remove preview
        removeBtn?.addEventListener('click', function() {
            fileInput.value = '';
            previewContainer?.classList.add('d-none');
        });
    }

    // ============================================
    // CAMERA CONTROLS (shared across modals)
    // ============================================
    const cameraModalEl = document.getElementById('cameraModal');
    if (cameraModalEl) {
        const video = document.getElementById('cameraVideo');
        const canvas = document.getElementById('cameraCanvas');
        const placeholder = document.getElementById('cameraPlaceholder');
        const captureBtn = document.getElementById('cameraCaptureBtn');
        const retakeBtn = document.getElementById('cameraRetakeBtn');
        const confirmBtn = document.getElementById('cameraConfirmBtn');
        const switchBtn = document.getElementById('cameraSwitchBtn');
        
        window.startCamera = async function() {
            try {
                // Show placeholder while initializing
                if (placeholder) placeholder.style.display = 'block';
                video.style.display = 'none';
                canvas.style.display = 'none';
                captureBtn.style.display = 'none';
                
                stopCamera();
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: currentFacingMode,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                video.srcObject = cameraStream;
                await video.play();
                
                // Hide placeholder, show video
                if (placeholder) placeholder.style.display = 'none';
                video.style.display = 'block';
                canvas.style.display = 'none';
                captureBtn.style.display = 'inline-flex';
                retakeBtn.classList.add('d-none');
                confirmBtn.classList.add('d-none');
                capturedFile = null;
            } catch (err) {
                console.error('Camera error:', err);
                if (placeholder) {
                    placeholder.innerHTML = `
                        <i class="bi bi-camera-off" style="font-size:3rem;color:var(--danger);"></i>
                        <p class="mt-2">Camera access denied. Please use file upload instead.</p>
                        <button class="btn btn-outline-brand btn-sm mt-2" onclick="bootstrap.Modal.getInstance(document.getElementById('cameraModal')).hide();">
                            Close
                        </button>
                    `;
                }
                showToast('Camera access denied. Please use file upload instead.', 'warning');
            }
        };

        function stopCamera() {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
                cameraStream = null;
            }
        }

        // Capture photo
        captureBtn?.addEventListener('click', function() {
            if (!cameraStream) return;
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth || 1280;
            canvas.height = video.videoHeight || 720;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(function(blob) {
                capturedFile = new File([blob], 'aadhar_capture.jpg', { type: 'image/jpeg' });
                video.style.display = 'none';
                canvas.style.display = 'block';
                captureBtn.style.display = 'none';
                retakeBtn.classList.remove('d-none');
                confirmBtn.classList.remove('d-none');
            }, 'image/jpeg', 0.9);
        });

        // Retake
        retakeBtn?.addEventListener('click', function() {
            video.style.display = 'block';
            canvas.style.display = 'none';
            captureBtn.style.display = 'inline-flex';
            retakeBtn.classList.add('d-none');
            confirmBtn.classList.add('d-none');
            capturedFile = null;
        });

        // Switch camera (front/back)
        switchBtn?.addEventListener('click', function() {
            currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
            startCamera();
        });

        // Confirm and use photo
        confirmBtn?.addEventListener('click', function() {
            if (capturedFile && activeFileInput) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(capturedFile);
                activeFileInput.files = dataTransfer.files;
                
                // Show preview
                if (activePreviewContainer && activePreviewImg) {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        activePreviewImg.src = e.target.result;
                        activePreviewContainer.classList.remove('d-none');
                    };
                    reader.readAsDataURL(capturedFile);
                }
                
                const modal = bootstrap.Modal.getInstance(cameraModalEl);
                if (modal) modal.hide();
                stopCamera();
            }
        });

        // Cleanup on modal close
        cameraModalEl.addEventListener('hidden.bs.modal', function() {
            stopCamera();
            // Reset UI
            video.style.display = 'none';
            canvas.style.display = 'none';
            captureBtn.style.display = 'none';
            retakeBtn.classList.add('d-none');
            confirmBtn.classList.add('d-none');
            capturedFile = null;
            activeFileInput = null;
            activePreviewContainer = null;
            activePreviewImg = null;
            
            // Reset placeholder
            if (placeholder) {
                placeholder.style.display = 'block';
                placeholder.innerHTML = `
                    <i class="bi bi-camera" style="font-size:3rem;"></i>
                    <p class="mt-2">Initializing camera...</p>
                `;
            }
        });
    }

    // ============================================
    // ADD ADMIN
    // ============================================
    const addModal = new bootstrap.Modal(document.getElementById("addAdminModal"));

    // Setup Aadhar capture for Add Admin modal
    setupAadharCapture('aaAadhar', 'aaPreviewContainer', 'aaPreviewImg', 'aaRemovePreview', 'aaCameraBtn', 'aaFileBtn');

    document.getElementById("addAdminForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Adding...');

        try {
            const name = document.getElementById("aaName").value.trim();
            const email = document.getElementById("aaEmail").value.trim();
            const phone = document.getElementById("aaPhone").value.trim();
            const file = document.getElementById("aaAadhar").files[0];

            if (!name || !email || !phone) {
                showToast("Please fill in all fields.", "warning");
                LOADER.hide(btn);
                return;
            }

            const data = { name, email, phone };
            const res = await API.admins.create(data, file);

            if (res.success) {
                showToast(res.message || `${name} has been added as an admin.`, "success");
                addModal.hide();
                document.getElementById("addAdminForm").reset();
                // Reset preview
                document.getElementById("aaPreviewContainer")?.classList.add('d-none');
                loadAdmins();
            } else {
                showToast(res.message || "Failed to add admin.", "danger");
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // EDIT ADMIN
    // ============================================
    const editModal = new bootstrap.Modal(document.getElementById("editAdminModal"));

    // Setup Aadhar capture for Edit Admin modal
    setupAadharCapture('eaAadhar', 'eaPreviewContainer', 'eaPreviewImg', 'eaRemovePreview', 'eaCameraBtn', 'eaFileBtn');

    window.editAdmin = async function(id) {
        try {
            const res = await API.admins.getById(id);
            if (!res.success || !res.data) {
                showToast("Admin not found.", "danger");
                return;
            }
            const a = res.data;
            document.getElementById("eaId").value = a.id;
            document.getElementById("eaName").value = a.name || '';
            document.getElementById("eaEmail").value = a.email || '';
            document.getElementById("eaPhone").value = a.phone || '';
            document.getElementById("eaAadhar").value = '';
            // Reset preview
            document.getElementById("eaPreviewContainer")?.classList.add('d-none');
            editModal.show();
        } catch (error) {
            showToast("Error loading admin: " + error.message, "danger");
        }
    };

    document.getElementById("editAdminForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Saving...');

        try {
            const id = document.getElementById("eaId").value;
            const name = document.getElementById("eaName").value.trim();
            const email = document.getElementById("eaEmail").value.trim();
            const phone = document.getElementById("eaPhone").value.trim();
            const file = document.getElementById("eaAadhar").files[0];

            if (!name || !email || !phone) {
                showToast("Please fill in all fields.", "warning");
                LOADER.hide(btn);
                return;
            }

            const data = { name, email, phone };
            const res = await API.admins.update(id, data, file);

            if (res.success) {
                showToast(res.message || `${name}'s details were updated.`, "success");
                editModal.hide();
                // Reset preview
                document.getElementById("eaPreviewContainer")?.classList.add('d-none');
                loadAdmins();
            } else {
                showToast(res.message || "Failed to update admin.", "danger");
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // DELETE ADMIN - FIXED
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    window.deleteAdmin = function(id) {
        // Convert id to string for safe comparison
        const idStr = String(id);
        
        // Find admin by comparing string IDs
        const a = adminData.find(x => String(x.id) === idStr);
        
        if (!a) {
            showToast("Admin not found. Please refresh the page and try again.", "danger");
            // Refresh admin data to ensure we have the latest list
            loadAdmins();
            return;
        }

        document.getElementById("confirmTitle").textContent = `Delete ${a.name}?`;
        document.getElementById("confirmBody").textContent = "This admin will lose all access to the Livinkey console immediately.";
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.admins.delete(id);
                if (res.success) {
                    showToast(res.message || `${a.name} was removed as an admin.`, "success");
                    confirmModal.hide();
                    loadAdmins();
                } else {
                    showToast(res.message || "Failed to delete admin.", "danger");
                }
            } catch (error) {
                // Handle 404 error specifically
                if (error.status === 404) {
                    showToast("Admin not found. It may have been already deleted. Refreshing list...", "warning");
                    loadAdmins();
                } else {
                    showToast(error.message || "An error occurred.", "danger");
                }
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // DOCUMENT PREVIEW
    // ============================================
    const docPreviewModal = new bootstrap.Modal(document.getElementById("aadharPreviewModal"));

    window.previewDocument = async function(id) {
        try {
            const res = await API.admins.getById(id);
            if (!res.success || !res.data || !res.data.id_document) {
                showToast("No document found.", "warning");
                return;
            }
            document.getElementById("aadharPreviewImg").src = res.data.id_document;
            document.getElementById("downloadAadharBtn").onclick = function() {
                window.open(res.data.id_document, '_blank');
                showToast("Document download started.", "info");
            };
            docPreviewModal.show();
        } catch (error) {
            showToast("Error loading document: " + error.message, "danger");
        }
    };

    // ============================================
    // PERMISSIONS / ACCESS - FIXED
    // ============================================
    const accessModal = new bootstrap.Modal(document.getElementById("accessModal"));

    window.openAccess = async function(id) {
        activeAdminId = id;
        try {
            const res = await API.admins.getById(id);
            if (!res.success || !res.data) {
                showToast("Admin not found.", "danger");
                return;
            }
            const a = res.data;
            document.getElementById("accessAdminName").textContent = a.name || 'Admin';

            const permissions = a.permissions || {};

            document.getElementById("accessTbody").innerHTML = MODULES.map(m => {
                const perm = permissions[m.key] || { view: false, add: false, edit: false, delete: false };
                // FIXED: Show all checkboxes even if false, admin can enable/disable
                return `
                <tr>
                    <td class="fw-semibold">${m.label}</td>
                    ${["view", "add", "edit", "delete"].map(p => `
                        <td><input type="checkbox" class="form-check-input access-cb" data-module="${m.key}" data-perm="${p}" ${perm[p] ? "checked" : ""}></td>
                    `).join("")}
                </tr>`;
            }).join("");

            accessModal.show();
        } catch (error) {
            showToast("Error loading permissions: " + error.message, "danger");
        }
    };

    document.getElementById("confirmAccessBtn")?.addEventListener("click", async function() {
        const btn = this;
        LOADER.show(btn, 'Saving...');

        try {
            const permissions = {};
            document.querySelectorAll(".access-cb").forEach(cb => {
                const module = cb.dataset.module;
                const perm = cb.dataset.perm;
                if (!permissions[module]) permissions[module] = {};
                permissions[module][perm] = cb.checked;
            });

            const res = await API.admins.updatePermissions(activeAdminId, permissions);
            if (res.success) {
                showToast(res.message || "Access permissions updated successfully.", "success");
                accessModal.hide();
                loadAdmins();
            } else {
                showToast(res.message || "Failed to update permissions.", "danger");
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
    });

    // ============================================
    // INIT
    // ============================================
    loadAdmins();
});