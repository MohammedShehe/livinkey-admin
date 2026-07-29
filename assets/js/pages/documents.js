document.addEventListener("DOMContentLoaded", () => {
  renderLayout("documents", "Documents", "Manage all tenant documents in one place");

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
              roomNo: t.roomNo,
              docType: docLabels[key] || key,
              docKey: key,
              image: `https://placehold.co/400x300/92C24A/FFFFFF?text=${encodeURIComponent(docLabels[key] || key)}`
            });
          }
        });
      }
    });
    return docs;
  }

  function renderGrid(filter = ""){
    const f = filter.trim().toLowerCase();
    let docs = getAllDocuments();
    
    // Filter by tenant name or room number
    if(f){
      docs = docs.filter(d => 
        d.tenantName.toLowerCase().includes(f) || 
        d.roomNo.toLowerCase().includes(f) ||
        d.docType.toLowerCase().includes(f)
      );
    }
    
    document.getElementById("documentsGrid").innerHTML = docs.map(d => `
      <div class="col-md-4 col-lg-3">
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
    document.getElementById("documentsEmpty").classList.toggle("d-none", docs.length > 0);
  }

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
        const searchVal = document.getElementById("docSearch")?.value || "";
        renderGrid(searchVal);
        LOADER.hide(btn);
      }, 400);
    };
    confirmModal.show();
  };

  /* -------- Download All -------- */
  document.getElementById("downloadAllBtn").addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Downloading...');
    const docs = getAllDocuments();
    if(docs.length === 0){
      showToast("No documents to download.", "warning");
      LOADER.hide(btn);
      return;
    }
    setTimeout(() => {
      showToast(`Downloading all ${docs.length} documents...`, "info");
      setTimeout(() => {
        showToast("All documents downloaded successfully.", "success");
        LOADER.hide(btn);
      }, 1000);
    }, 300);
  });

  /* -------- Delete All -------- */
  document.getElementById("deleteAllBtn").addEventListener("click", function(){
    const docs = getAllDocuments();
    if(docs.length === 0){
      showToast("No documents to delete.", "warning");
      return;
    }
    document.getElementById("confirmTitle").textContent = "Delete all documents?";
    document.getElementById("confirmBody").textContent = `This will permanently remove all ${docs.length} documents. This action cannot be undone.`;
    document.getElementById("confirmActionBtn").onclick = function(){
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        LK.tenants.forEach(t => {
          if(t.docs){
            Object.keys(t.docs).forEach(key => {
              t.docs[key] = false;
            });
          }
        });
        confirmModal.hide();
        showToast("All documents deleted.", "danger");
        const searchVal = document.getElementById("docSearch")?.value || "";
        renderGrid(searchVal);
        LOADER.hide(btn);
      }, 600);
    };
    confirmModal.show();
  });

  // Initialize search if exists
  const docSearch = document.getElementById("docSearch");
  if(docSearch){
    docSearch.addEventListener("input", (e) => renderGrid(e.target.value));
  }

  renderGrid();
});