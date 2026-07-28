document.addEventListener("DOMContentLoaded", () => {
  renderLayout("admins", "Admins Management", "Manage admin accounts and their module permissions");

  const MODULES = [
    { key: "members",  label: "Members Management" },
    { key: "guests",   label: "Guests" },
    { key: "admins",   label: "Admins Management" },
    { key: "messages", label: "Messages" },
    { key: "bills",    label: "Bills" },
    { key: "rooms",    label: "Rooms" }
  ];

  function renderTable(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = LK.admins.filter(a => !f || a.name.toLowerCase().includes(f) || a.email.toLowerCase().includes(f) || a.phone.includes(f));
    document.getElementById("adminsTbody").innerHTML = rows.map(a => `
      <tr>
        <td><span class="name-link" onclick="openAccess('${a.id}')">${a.name}</span></td>
        <td>${a.email}</td>
        <td>${a.phone}</td>
        <td class="text-end">
          <button class="btn-icon me-1" title="Edit" onclick="editAdmin('${a.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon" title="Delete" onclick="deleteAdmin('${a.id}')"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`).join("");
    document.getElementById("adminsEmpty").classList.toggle("d-none", rows.length > 0);
  }
  document.getElementById("adminSearch").addEventListener("input", (e) => renderTable(e.target.value));

  /* -------- Add admin -------- */
  const addModal = new bootstrap.Modal(document.getElementById("addAdminModal"));
  document.getElementById("addAdminForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("aaName").value.trim();
    const email = document.getElementById("aaEmail").value.trim();
    const phone = document.getElementById("aaPhone").value.trim();

    // Validation
    if(!name || !email || !phone){
      showToast("Please fill in all fields.", "warning");
      return;
    }
    if(LK.admins.some(a => a.email === email)){
      showToast("An admin with this email already exists.", "danger");
      return;
    }

    // Generate new admin ID
    const maxId = LK.admins.reduce((max, a) => {
      const num = parseInt(a.id.replace('A', ''));
      return num > max ? num : max;
    }, 0);
    const newId = 'A' + String(maxId + 1).padStart(3, '0');

    // Add admin
    LK.admins.push({
      id: newId,
      name: name,
      email: email,
      phone: phone,
      role: "Admin",
      access: {
        members: { v: false, a: false, e: false, d: false },
        guests:  { v: false, a: false, e: false, d: false },
        admins:  { v: false, a: false, e: false, d: false },
        messages:{ v: false, a: false, e: false, d: false },
        bills:   { v: false, a: false, e: false, d: false },
        rooms:   { v: false, a: false, e: false, d: false }
      }
    });

    // Also add to credentials for login simulation with default password
    LK.credentials[email] = { password: "admin@123", role: "Admin", name: name };

    addModal.hide();
    showToast(`${name} has been added as an admin.`, "success");
    renderTable(document.getElementById("adminSearch").value);
    document.getElementById("addAdminForm").reset();
  });

  /* -------- Edit admin -------- */
  const editModal = new bootstrap.Modal(document.getElementById("editAdminModal"));
  window.editAdmin = function(id){
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    document.getElementById("eaId").value = a.id;
    document.getElementById("eaName").value = a.name;
    document.getElementById("eaEmail").value = a.email;
    document.getElementById("eaPhone").value = a.phone;
    editModal.show();
  };
  document.getElementById("editAdminForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("eaId").value;
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    const newName = document.getElementById("eaName").value.trim();
    const newEmail = document.getElementById("eaEmail").value.trim();
    const newPhone = document.getElementById("eaPhone").value.trim();

    // Check if email changed and update credentials
    if(a.email !== newEmail){
      // Remove old credential
      delete LK.credentials[a.email];
      // Add new credential with default password
      LK.credentials[newEmail] = { 
        password: "admin@123", 
        role: "Admin", 
        name: newName 
      };
    } else {
      // Update name in credentials
      if(LK.credentials[a.email]){
        LK.credentials[a.email].name = newName;
      }
    }

    a.name = newName;
    a.email = newEmail;
    a.phone = newPhone;
    editModal.hide();
    showToast(`${a.name}'s details were updated.`, "success");
    renderTable(document.getElementById("adminSearch").value);
  });

  /* -------- Delete admin -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteAdmin = function(id){
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    document.getElementById("confirmTitle").textContent = `Delete ${a.name}?`;
    document.getElementById("confirmBody").textContent = "This admin will lose all access to the Livinkey console immediately.";
    document.getElementById("confirmActionBtn").onclick = () => {
      // Remove from admins
      LK.admins = LK.admins.filter(x => x.id !== id);
      // Remove from credentials
      delete LK.credentials[a.email];
      confirmModal.hide();
      showToast(`${a.name} was removed as an admin.`, "danger");
      renderTable(document.getElementById("adminSearch").value);
    };
    confirmModal.show();
  };

  /* -------- Give Access -------- */
  const accessModal = new bootstrap.Modal(document.getElementById("accessModal"));
  let activeAdminId = null;

  window.openAccess = function(id){
    activeAdminId = id;
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    document.getElementById("accessAdminName").textContent = a.name;
    document.getElementById("accessTbody").innerHTML = MODULES.map(m => {
      const perm = a.access[m.key] || { v:false,a:false,e:false,d:false };
      return `
      <tr>
        <td class="fw-semibold">${m.label}</td>
        ${["v","a","e","d"].map(p => `
          <td><input type="checkbox" class="form-check-input access-cb" data-module="${m.key}" data-perm="${p}" ${perm[p] ? "checked" : ""}></td>`).join("")}
      </tr>`;
    }).join("");
    accessModal.show();
  };

  document.getElementById("confirmAccessBtn").addEventListener("click", () => {
    const a = LK.admins.find(x => x.id === activeAdminId);
    if(!a) return;
    document.querySelectorAll(".access-cb").forEach(cb => {
      const m = cb.dataset.module, p = cb.dataset.perm;
      a.access[m][p] = cb.checked;
    });
    accessModal.hide();
    showToast(`Access permissions updated for ${a.name}.`, "success");
  });

  renderTable();
});