document.addEventListener("DOMContentLoaded", () => {
  renderLayout("maintenance", "Maintenance", "All tenant maintenance queries in one place");

  // Get status badge HTML
  function getStatusBadge(status) {
    const statusMap = {
      'Pending': 'status-pending',
      'In Progress': 'status-inprogress',
      'Completed': 'status-completed'
    };
    return `<span class="status-badge ${statusMap[status] || 'status-pending'}">${status}</span>`;
  }

  // Get status action button
  function getStatusActionButton(m) {
    if (m.status === 'Completed') {
      return `<button class="btn-status btn-status-completed btn-status-disabled" disabled>
        <i class="bi bi-check-circle-fill"></i> Done
      </button>`;
    }
    
    if (m.status === 'In Progress') {
      return `<button class="btn-status btn-status-completed" onclick="updateStatus('${m.id}', 'Completed', this)">
        <i class="bi bi-check-circle"></i> Complete
      </button>`;
    }
    
    // Pending
    return `<button class="btn-status btn-status-inprogress" onclick="updateStatus('${m.id}', 'In Progress', this)">
      <i class="bi bi-arrow-right-circle"></i> Start
    </button>`;
  }

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
        <td>${getStatusBadge(m.status || 'Pending')}</td>
        <td class="text-end">
          <div class="d-flex gap-1 justify-content-end align-items-center">
            ${getStatusActionButton(m)}
            <button class="btn-icon" title="Delete" onclick="deleteRequest('${m.id}', this)"><i class="bi bi-trash3"></i></button>
          </div>
        </td>
      </tr>
    `).join("");
    document.getElementById("maintenanceEmpty").classList.toggle("d-none", rows.length > 0);
  }

  document.getElementById("maintenanceSearch").addEventListener("input", (e) => renderTable(e.target.value));

  /* -------- Update Status -------- */
  window.updateStatus = function(id, newStatus, buttonElement) {
    const m = LK.maintenance.find(x => x.id === id);
    if (!m) return;
    
    // Prevent status change if already Completed
    if (m.status === 'Completed') {
      showToast("This request is already completed.", "warning");
      return;
    }
    
    // Validate status flow: Pending → In Progress → Completed
    if (m.status === 'Pending' && newStatus === 'Completed') {
      showToast("Please mark as 'In Progress' first.", "warning");
      return;
    }
    
    // Show loader on the button
    const originalText = buttonElement.innerHTML;
    const loaderHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Loading...`;
    buttonElement.innerHTML = loaderHTML;
    buttonElement.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
      m.status = newStatus;
      const statusMessages = {
        'In Progress': 'Maintenance marked as In Progress.',
        'Completed': 'Maintenance marked as Completed!'
      };
      showToast(statusMessages[newStatus] || `Status updated to ${newStatus}`, "success");
      renderTable(document.getElementById("maintenanceSearch").value);
      // Reset button (it will be re-rendered anyway)
    }, 600);
  };

  /* -------- Image Preview -------- */
  const imageModal = new bootstrap.Modal(document.getElementById("imagePreviewModal"));
  window.previewImage = function(id){
    const m = LK.maintenance.find(x => x.id === id);
    if(!m || !m.picture) return;
    document.getElementById("previewImage").src = m.picture;
    
    // Reset download button
    const downloadBtn = document.getElementById("downloadImageBtn");
    downloadBtn.innerHTML = '<i class="bi bi-download me-1"></i>Download';
    downloadBtn.disabled = false;
    
    downloadBtn.onclick = function(){
      const btn = this;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Downloading...`;
      btn.disabled = true;
      
      setTimeout(() => {
        // Create a temporary link to download the image
        const link = document.createElement('a');
        link.href = m.picture;
        link.download = `maintenance_${m.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Image download started.", "info");
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 500);
    };
    imageModal.show();
  };

  /* -------- Delete Request -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteRequest = function(id, buttonElement){
    const m = LK.maintenance.find(x => x.id === id);
    if(!m) return;
    document.getElementById("confirmTitle").textContent = `Delete request from ${m.tenantName}?`;
    document.getElementById("confirmBody").textContent = `This maintenance request (${m.type}) will be permanently removed.`;
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      const originalText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Deleting...`;
      btn.disabled = true;
      
      setTimeout(() => {
        LK.maintenance = LK.maintenance.filter(x => x.id !== id);
        confirmModal.hide();
        showToast("Maintenance request deleted.", "danger");
        renderTable(document.getElementById("maintenanceSearch").value);
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 500);
    };
    confirmModal.show();
  };

  renderTable();
});