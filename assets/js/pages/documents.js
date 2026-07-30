document.addEventListener("DOMContentLoaded", () => {
  renderLayout("documents", "Documents", "Manage all tenant documents in one place");

  // Document type labels and icons
  const DOC_TYPES = {
    photo: { label: "Photos", icon: "bi-person", color: "#3E7CB1" },
    aadhar: { label: "Aadhar Cards", icon: "bi-card-text", color: "#4F8F2E" },
    parentAadhar: { label: "Parent Aadhar", icon: "bi-card-text", color: "#6FA030" },
    passport: { label: "Passports", icon: "bi-passport", color: "#E2A238" },
    visa: { label: "Visas", icon: "bi-stamp", color: "#D9483F" },
    frro: { label: "FRRO", icon: "bi-file-earmark-check", color: "#7C8A76" },
    cForm: { label: "C-Forms", icon: "bi-file-earmark-text", color: "#92C24A" },
    arrivalStamp: { label: "Arrival Stamps", icon: "bi-stamp", color: "#4B7B8A" },
    universityId: { label: "University IDs", icon: "bi-mortarboard", color: "#8B6FA3" }
  };

  let currentFilter = "all";
  let selectedDocs = new Set();
  let allDocs = [];

  // Collect all documents from all tenants
  function getAllDocuments(){
    const docs = [];
    const docLabels = {
      photo: "Photo",
      aadhar: "Aadhar Card",
      parentAadhar: "Parent Aadhar",
      passport: "Passport",
      visa: "Visa",
      frro: "FRRO",
      cForm: "C-Form",
      arrivalStamp: "Arrival Stamp",
      universityId: "University ID"
    };
    
    LK.tenants.forEach(t => {
      if(t.docs){
        Object.keys(t.docs).forEach(key => {
          if(t.docs[key]){
            docs.push({
              id: `${t.id}_${key}`,
              tenantId: t.id,
              tenantName: t.name,
              roomNo: t.roomNo || "—",
              docType: docLabels[key] || key,
              docKey: key,
              image: `https://placehold.co/400x300/92C24A/FFFFFF?text=${encodeURIComponent(docLabels[key] || key)}`
            });
          }
        });
      }
    });
    allDocs = docs;
    return docs;
  }

  // Render document type stats
  function renderStats(docs) {
    const stats = [
      { key: "all", label: "All Documents", icon: "bi-files", color: "#0B0F0A", count: docs.length }
    ];

    // Count by document type
    const typeCounts = {};
    docs.forEach(d => {
      typeCounts[d.docKey] = (typeCounts[d.docKey] || 0) + 1;
    });

    Object.keys(DOC_TYPES).forEach(key => {
      if (typeCounts[key] && typeCounts[key] > 0) {
        stats.push({
          key: key,
          label: DOC_TYPES[key].label,
          icon: DOC_TYPES[key].icon,
          color: DOC_TYPES[key].color,
          count: typeCounts[key]
        });
      }
    });

    document.getElementById("docStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-4 col-lg-2">
        <div class="doc-stat-card ${currentFilter === s.key ? 'active' : ''}" onclick="filterByDocType('${s.key}')">
          <div class="doc-stat-icon" style="background:${s.color}22;color:${s.color};">
            <i class="bi ${s.icon}"></i>
          </div>
          <div>
            <div class="doc-stat-value">${s.count}</div>
            <div class="doc-stat-label">${s.label}</div>
          </div>
        </div>
      </div>
    `).join("");
  }

  window.filterByDocType = function(type) {
    currentFilter = type;
    selectedDocs.clear();
    document.getElementById("selectAllDocs").checked = false;
    renderGrid(document.getElementById("docSearch").value);
  };

  function renderGrid(search = "") {
    const f = search.trim().toLowerCase();
    let docs = getAllDocuments();
    
    // Filter by type
    if (currentFilter !== "all") {
      docs = docs.filter(d => d.docKey === currentFilter);
    }
    
    // Filter by search
    if (f) {
      docs = docs.filter(d => 
        d.tenantName.toLowerCase().includes(f) || 
        d.roomNo.toLowerCase().includes(f) ||
        d.docType.toLowerCase().includes(f)
      );
    }
    
    // Update total count
    document.getElementById("totalDocsCount").textContent = `${docs.length} documents`;
    
    if (docs.length === 0) {
      document.getElementById("documentsGrid").innerHTML = '';
      document.getElementById("documentsEmpty").classList.remove("d-none");
      document.getElementById("bulkActions").classList.remove("show");
      renderStats(getAllDocuments());
      return;
    }
    
    document.getElementById("documentsEmpty").classList.add("d-none");
    
    document.getElementById("documentsGrid").innerHTML = docs.map(d => `
      <div class="col-md-4 col-lg-3 doc-card-wrapper ${selectedDocs.has(d.id) ? 'selected' : ''}" data-id="${d.id}">
        <input type="checkbox" class="doc-checkbox" ${selectedDocs.has(d.id) ? 'checked' : ''} onchange="toggleDocSelection('${d.id}')">
        <div class="doc-thumb">
          <img src="${d.image}" alt="${d.docType}" style="height:160px;cursor:pointer;" onclick="previewDocument('${d.id}')">
          <div class="doc-actions">
            <button class="btn-icon" style="background:#fff;" title="Preview" onclick="previewDocument('${d.id}')"><i class="bi bi-eye"></i></button>
            <button class="btn-icon" style="background:#fff;" title="Download" onclick="downloadDocument('${d.id}')"><i class="bi bi-download"></i></button>
            <button class="btn-icon" style="background:#fff;color:var(--danger);" title="Delete" onclick="deleteDocument('${d.id}')"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="doc-label">
            <div class="fw-bold">${d.docType}</div>
            <div class="small text-muted-soft">${d.tenantName} · Room ${d.roomNo}</div>
          </div>
        </div>
      </div>
    `).join("");
    
    updateBulkActions();
    renderStats(getAllDocuments());
  }

  /* -------- Selection Functions -------- */
  window.toggleDocSelection = function(id) {
    if (selectedDocs.has(id)) {
      selectedDocs.delete(id);
    } else {
      selectedDocs.add(id);
    }
    updateBulkActions();
    // Update card highlight
    const card = document.querySelector(`.doc-card-wrapper[data-id="${id}"]`);
    if (card) {
      card.classList.toggle('selected', selectedDocs.has(id));
      const checkbox = card.querySelector('.doc-checkbox');
      if (checkbox) checkbox.checked = selectedDocs.has(id);
    }
    // Update select all
    updateSelectAllState();
  };

  function updateBulkActions() {
    const count = selectedDocs.size;
    const bulkActions = document.getElementById("bulkActions");
    const bulkCount = document.getElementById("bulkCount");
    
    if (count > 0) {
      bulkActions.classList.add("show");
      bulkCount.textContent = `${count} selected`;
    } else {
      bulkActions.classList.remove("show");
    }
  }

  function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.doc-checkbox');
    const checked = document.querySelectorAll('.doc-checkbox:checked');
    const selectAll = document.getElementById("selectAllDocs");
    
    if (checkboxes.length === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
      return;
    }
    
    if (checked.length === checkboxes.length) {
      selectAll.checked = true;
      selectAll.indeterminate = false;
    } else if (checked.length > 0) {
      selectAll.checked = false;
      selectAll.indeterminate = true;
    } else {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    }
  }

  document.getElementById("selectAllDocs").addEventListener("change", function() {
    const checked = this.checked;
    const checkboxes = document.querySelectorAll('.doc-checkbox');
    
    checkboxes.forEach(cb => {
      cb.checked = checked;
      const id = cb.closest('.doc-card-wrapper')?.dataset.id;
      if (id) {
        if (checked) {
          selectedDocs.add(id);
        } else {
          selectedDocs.delete(id);
        }
        const card = document.querySelector(`.doc-card-wrapper[data-id="${id}"]`);
        if (card) card.classList.toggle('selected', checked);
      }
    });
    
    updateBulkActions();
  });

  document.getElementById("bulkClearBtn").addEventListener("click", function() {
    selectedDocs.clear();
    document.getElementById("selectAllDocs").checked = false;
    document.querySelectorAll('.doc-checkbox').forEach(cb => {
      cb.checked = false;
      const card = cb.closest('.doc-card-wrapper');
      if (card) card.classList.remove('selected');
    });
    updateBulkActions();
  });

  /* -------- Bulk Download -------- */
  document.getElementById("bulkDownloadBtn").addEventListener("click", function() {
    const btn = this;
    const count = selectedDocs.size;
    if (count === 0) {
      showToast("No documents selected.", "warning");
      return;
    }
    
    LOADER.show(btn, 'Downloading...');
    setTimeout(() => {
      showToast(`Downloading ${count} selected documents...`, "info");
      setTimeout(() => {
        showToast(`${count} documents downloaded successfully.`, "success");
        LOADER.hide(btn);
        // Clear selection after download
        selectedDocs.clear();
        document.getElementById("selectAllDocs").checked = false;
        document.querySelectorAll('.doc-checkbox').forEach(cb => {
          cb.checked = false;
          const card = cb.closest('.doc-card-wrapper');
          if (card) card.classList.remove('selected');
        });
        updateBulkActions();
      }, 1000);
    }, 300);
  });

  /* -------- Bulk Delete -------- */
  document.getElementById("bulkDeleteBtn").addEventListener("click", function() {
    const count = selectedDocs.size;
    if (count === 0) {
      showToast("No documents selected.", "warning");
      return;
    }
    
    document.getElementById("confirmTitle").textContent = `Delete ${count} selected documents?`;
    document.getElementById("confirmBody").textContent = `This will permanently remove ${count} documents. This action cannot be undone.`;
    document.getElementById("confirmActionBtn").onclick = function() {
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        // Delete selected documents
        selectedDocs.forEach(id => {
          const doc = allDocs.find(d => d.id === id);
          if (doc) {
            const tenant = LK.tenants.find(t => t.id === doc.tenantId);
            if (tenant && tenant.docs) {
              tenant.docs[doc.docKey] = false;
            }
          }
        });
        
        const deletedCount = selectedDocs.size;
        selectedDocs.clear();
        document.getElementById("selectAllDocs").checked = false;
        confirmModal.hide();
        showToast(`${deletedCount} documents deleted.`, "danger");
        const searchVal = document.getElementById("docSearch")?.value || "";
        renderGrid(searchVal);
        LOADER.hide(btn);
      }, 600);
    };
    confirmModal.show();
  });

  /* -------- Preview Document -------- */
  const previewModal = new bootstrap.Modal(document.getElementById("docPreviewModal"));
  let currentDocId = null;

  window.previewDocument = function(id){
    const docs = getAllDocuments();
    const doc = docs.find(d => d.id === id);
    if(!doc) return;
    currentDocId = id;
    document.getElementById("docPreviewTitle").textContent = `${doc.docType} - ${doc.tenantName}`;
    document.getElementById("docPreviewImg").src = doc.image;
    previewModal.show();
  };

  document.getElementById("docDownloadBtn").addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Downloading...');
    setTimeout(() => {
      showToast("Document download started.", "info");
      LOADER.hide(btn);
    }, 500);
  });

  document.getElementById("docDeleteBtn").addEventListener("click", function(){
    if(currentDocId){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        deleteDocument(currentDocId);
        previewModal.hide();
        LOADER.hide(btn);
      }, 400);
    }
  });

  /* -------- Download Document -------- */
  window.downloadDocument = function(id){
    const btn = event?.target?.closest?.('.btn-icon');
    if(btn) LOADER.show(btn, 'Downloading...');
    setTimeout(() => {
      showToast("Document download started.", "info");
      if(btn) LOADER.hide(btn);
    }, 500);
  };

  /* -------- Delete Document -------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteDocument = function(id){
    const docs = getAllDocuments();
    const doc = docs.find(d => d.id === id);
    if(!doc) return;
    
    document.getElementById("confirmTitle").textContent = `Delete ${doc.docType}?`;
    document.getElementById("confirmBody").textContent = `This will permanently remove ${doc.docType} for ${doc.tenantName}.`;
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        const tenant = LK.tenants.find(t => t.id === doc.tenantId);
        if(tenant && tenant.docs){
          tenant.docs[doc.docKey] = false;
        }
        confirmModal.hide();
        showToast(`${doc.docType} deleted.`, "danger");
        // Remove from selection if selected
        selectedDocs.delete(id);
        const searchVal = document.getElementById("docSearch")?.value || "";
        renderGrid(searchVal);
        LOADER.hide(btn);
      }, 400);
    };
    confirmModal.show();
  };

  // Initialize search
  const docSearch = document.getElementById("docSearch");
  if(docSearch){
    docSearch.addEventListener("input", (e) => {
      selectedDocs.clear();
      document.getElementById("selectAllDocs").checked = false;
      renderGrid(e.target.value);
    });
  }

  // Initial render
  renderGrid();
});