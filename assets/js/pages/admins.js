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
    // ADD ADMIN
    // ============================================
    const addModal = new bootstrap.Modal(document.getElementById("addAdminModal"));

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