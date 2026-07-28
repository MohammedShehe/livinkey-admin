document.addEventListener("DOMContentLoaded", () => {
  renderLayout("maintenance", "Maintenance", "All tenant maintenance queries in one place");

  function renderTable(search = ""){
    const f = search.trim().toLowerCase();
    const rows = LK.maintenance.filter(m => 
      !f || m.roomNo.includes(f) || m.tenantName.toLowerCase().includes(f) || 
      m.type.toLowerCase().includes(f) || m.email.toLowerCase().includes(f)
    );
    
    document.getElementById("maintenanceTbody").innerHTML = rows.map(m => `
      <tr>
        <td><span class="fw-semibold">${m.roomNo}</span></td>
        <td>${m.tenantName}</td>
        <td>${m.email}</td>
        <td><span class="chip chip-blue">${m.type}</span></td>
        <td>${m.serviceDate}</td>
        <td>${m.freeTime}</td>
        <td>${m.description}</td>
        <td>
          ${m.picture ? `<img src="${m.picture}" alt="Issue" style="width:40px;height:30px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="previewImage('${m.id}')">` : "—"}
        </td>
        <td class="text-end">
          <button class="btn-icon me-1" title="Resolve" onclick="resolveRequest('${m.id}')"><i class="bi bi-check-lg text-success"></i></button>
          <button class="btn-icon" title="Delete" onclick="deleteRequest('${m.id}')"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>
    `).join("");
    document.getElementById("maintenanceEmpty").classList.toggle("d-none", rows.length > 0);
  }

  document.getElementById("maintenanceSearch").addEventListener("input", (e) => renderTable(e.target.value));

  /* -------- Image Preview -------- */
  const imageModal = new bootstrap.Modal(document.getElementById("imagePreviewModal"));
  window.previewImage = function(id){
    const m = LK.maintenance.find(x => x.id === id);
    if(!m || !m.picture) return;
    document.getElementById("previewImage").src = m.picture;
    document.getElementById("downloadImageBtn").onclick = () => {
      showToast("Image download started.", "info");
    };
    imageModal.show();
  };

  /* -------- Resolve Request -------- */
  window.resolveRequest = function(id){
    showToast("Maintenance request marked as resolved.", "success");
    LK.maintenance = LK.maintenance.filter(x => x.id !== id);
    renderTable(document.getElementById("maintenanceSearch").value);
  };

  /* -------- Delete Request -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteRequest = function(id){
    const m = LK.maintenance.find(x => x.id === id);
    if(!m) return;
    document.getElementById("confirmTitle").textContent = `Delete request from ${m.tenantName}?`;
    document.getElementById("confirmBody").textContent = `This maintenance request (${m.type}) will be permanently removed.`;
    document.getElementById("confirmActionBtn").onclick = function(){
      LK.maintenance = LK.maintenance.filter(x => x.id !== id);
      confirmModal.hide();
      showToast("Maintenance request deleted.", "danger");
      renderTable(document.getElementById("maintenanceSearch").value);
    };
    confirmModal.show();
  };

  renderTable();
});