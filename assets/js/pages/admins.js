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

  /* -------- Edit admin -------- */
  const editModal = new bootstrap.Modal(document.getElementById("editAdminModal"));
  window.editAdmin = function(id){
    const a = LK.admins.find(x => x.id === id);
    document.getElementById("eaId").value = a.id;
    document.getElementById("eaName").value = a.name;
    document.getElementById("eaEmail").value = a.email;
    document.getElementById("eaPhone").value = a.phone;
    editModal.show();
  };
  document.getElementById("editAdminForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const a = LK.admins.find(x => x.id === document.getElementById("eaId").value);
    a.name = document.getElementById("eaName").value.trim();
    a.email = document.getElementById("eaEmail").value.trim();
    a.phone = document.getElementById("eaPhone").value.trim();
    editModal.hide();
    showToast(`${a.name}'s details were updated.`, "success");
    renderTable(document.getElementById("adminSearch").value);
  });

  /* -------- Delete admin -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteAdmin = function(id){
    const a = LK.admins.find(x => x.id === id);
    document.getElementById("confirmTitle").textContent = `Delete ${a.name}?`;
    document.getElementById("confirmBody").textContent = "This admin will lose all access to the Livinkey console immediately.";
    document.getElementById("confirmActionBtn").onclick = () => {
      LK.admins = LK.admins.filter(x => x.id !== id);
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
    document.querySelectorAll(".access-cb").forEach(cb => {
      const m = cb.dataset.module, p = cb.dataset.perm;
      a.access[m][p] = cb.checked;
    });
    accessModal.hide();
    showToast(`Access permissions updated for ${a.name}.`, "success");
  });

  renderTable();
});
