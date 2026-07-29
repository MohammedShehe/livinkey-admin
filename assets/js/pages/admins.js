document.addEventListener("DOMContentLoaded", () => {
  renderLayout("admins", "Admins Management", "Manage admin accounts and their module permissions");

  const MODULES = [
    { key: "tenants",    label: "Tenants Management" },
    { key: "guests",     label: "Guests" },
    { key: "admins",     label: "Admins Management" },
    { key: "messages",   label: "Messages" },
    { key: "bills",      label: "Bills" },
    { key: "pgs",        label: "PGs Management" },
    { key: "maintenance", label: "Maintenance" },
    { key: "documents",  label: "Documents" }
  ];

  function renderTable(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = LK.admins.filter(a => !f || a.name.toLowerCase().includes(f) || a.email.toLowerCase().includes(f) || a.phone.includes(f));
    document.getElementById("adminsTbody").innerHTML = rows.map(a => `
      <tr>
        <td><span class="name-link" onclick="openAccess('${a.id}')">${a.name}</span></td>
        <td>${a.email}</td>
        <td>${a.phone}</td>
        <td>
          ${a.aadhar ? `<img src="${a.aadhar}" alt="Aadhar" style="width:40px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="previewAadhar('${a.id}')">` : "—"}
        </td>
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
  document.getElementById("addAdminForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Adding...');
    
    const name = document.getElementById("aaName").value.trim();
    const email = document.getElementById("aaEmail").value.trim();
    const phone = document.getElementById("aaPhone").value.trim();
    const aadharFile = document.getElementById("aaAadhar").files[0];

    setTimeout(() => {
      if(!name || !email || !phone){
        showToast("Please fill in all fields.", "warning");
        LOADER.hide(btn);
        return;
      }
      if(LK.admins.some(a => a.email === email)){
        showToast("An admin with this email already exists.", "danger");
        LOADER.hide(btn);
        return;
      }

      const maxId = LK.admins.reduce((max, a) => {
        const num = parseInt(a.id.replace('A', ''));
        return num > max ? num : max;
      }, 0);
      const newId = 'A' + String(maxId + 1).padStart(3, '0');

      LK.admins.push({
        id: newId,
        name: name,
        email: email,
        phone: phone,
        role: "Admin",
        aadhar: aadharFile ? URL.createObjectURL(aadharFile) : null,
        access: {
          tenants: { v: false, a: false, e: false, d: false },
          guests:  { v: false, a: false, e: false, d: false },
          admins:  { v: false, a: false, e: false, d: false },
          messages:{ v: false, a: false, e: false, d: false },
          bills:   { v: false, a: false, e: false, d: false },
          pgs:     { v: false, a: false, e: false, d: false },
          maintenance: { v: false, a: false, e: false, d: false },
          documents: { v: false, a: false, e: false, d: false }
        }
      });

      LK.credentials[email] = { password: "admin@123", role: "Admin", name: name };

      addModal.hide();
      showToast(`${name} has been added as an admin.`, "success");
      renderTable(document.getElementById("adminSearch").value);
      document.getElementById("addAdminForm").reset();
      LOADER.hide(btn);
    }, 600);
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
  
  document.getElementById("editAdminForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Saving...');
    
    const id = document.getElementById("eaId").value;
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    const newName = document.getElementById("eaName").value.trim();
    const newEmail = document.getElementById("eaEmail").value.trim();
    const newPhone = document.getElementById("eaPhone").value.trim();
    const aadharFile = document.getElementById("eaAadhar").files[0];

    setTimeout(() => {
      if(a.email !== newEmail){
        delete LK.credentials[a.email];
        LK.credentials[newEmail] = { password: "admin@123", role: "Admin", name: newName };
      } else {
        if(LK.credentials[a.email]){
          LK.credentials[a.email].name = newName;
        }
      }

      a.name = newName;
      a.email = newEmail;
      a.phone = newPhone;
      if(aadharFile){
        a.aadhar = URL.createObjectURL(aadharFile);
      }
      editModal.hide();
      showToast(`${a.name}'s details were updated.`, "success");
      renderTable(document.getElementById("adminSearch").value);
      LOADER.hide(btn);
    }, 500);
  });

  /* -------- Delete admin -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteAdmin = function(id){
    const a = LK.admins.find(x => x.id === id);
    if(!a) return;
    document.getElementById("confirmTitle").textContent = `Delete ${a.name}?`;
    document.getElementById("confirmBody").textContent = "This admin will lose all access to the Livinkey console immediately.";
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        LK.admins = LK.admins.filter(x => x.id !== id);
        delete LK.credentials[a.email];
        confirmModal.hide();
        showToast(`${a.name} was removed as an admin.`, "danger");
        renderTable(document.getElementById("adminSearch").value);
        LOADER.hide(btn);
      }, 500);
    };
    confirmModal.show();
  };

  /* -------- Aadhar Preview -------- */
  const aadharPreviewModal = new bootstrap.Modal(document.getElementById("aadharPreviewModal"));
  window.previewAadhar = function(id){
    const a = LK.admins.find(x => x.id === id);
    if(!a || !a.aadhar) return;
    document.getElementById("aadharPreviewImg").src = a.aadhar;
    document.getElementById("downloadAadharBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Downloading...');
      setTimeout(() => {
        showToast("Aadhar download started.", "info");
        LOADER.hide(btn);
      }, 500);
    };
    aadharPreviewModal.show();
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

  document.getElementById("confirmAccessBtn").addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Saving...');
    setTimeout(() => {
      const a = LK.admins.find(x => x.id === activeAdminId);
      if(!a) return;
      document.querySelectorAll(".access-cb").forEach(cb => {
        const m = cb.dataset.module, p = cb.dataset.perm;
        a.access[m][p] = cb.checked;
      });
      accessModal.hide();
      showToast(`Access permissions updated for ${a.name}.`, "success");
      LOADER.hide(btn);
    }, 500);
  });

  renderTable();
});