document.addEventListener("DOMContentLoaded", () => {
  renderLayout("bills", "Bills", "Track rent status and manage collections across all tenants");

  const TABS = [
    { key: "unpaid",     label: "Unpaid Tenants",              icon: "bi-exclamation-circle", color: "var(--danger)" },
    { key: "unfinished", label: "Unfinished Payments",         icon: "bi-hourglass-split",    color: "var(--warning)" },
    { key: "paid",       label: "Paid Tenants",                icon: "bi-check-circle",       color: "var(--success)" },
    { key: "delayed",    label: "Delayed Payments",             icon: "bi-alarm",              color: "var(--danger)" },
    { key: "cash",       label: "Cash Payments",                icon: "bi-cash-coin",          color: "var(--info)" }
  ];
  let activeTab = "unpaid";

  function tenantsBy(status){ return LK.tenants.filter(t => t.role === "Tenant" && t.billStatus === status); }
  function allTenants(){ return LK.tenants.filter(t => t.role === "Tenant"); }

  function renderStats(){
    document.getElementById("billStats").innerHTML = TABS.map(t => `
      <div class="col-6 col-md-4 col-lg">
        <div class="stat-card hover-lift" onclick="switchTab('${t.key}')">
          <div class="stat-icon" style="background:${t.color}22;color:${t.color};"><i class="bi ${t.icon}"></i></div>
          <div><div class="stat-value">${tenantsBy(t.key).length}</div><div class="stat-label">${t.label}</div></div>
        </div>
      </div>`).join("");
  }

  function switchTab(tab){
    activeTab = tab;
    renderTabs();
    renderTable();
  }
  window.switchTab = switchTab;

  function renderTabs(){
    document.getElementById("billTabs").innerHTML = TABS.map(t => `
      <button class="filter-pill ${activeTab === t.key ? "active" : ""}" onclick="switchTab('${t.key}')">${t.label} <span class="ms-1">(${tenantsBy(t.key).length})</span></button>
    `).join("");
  }

  function getPgName(pgId){
    const pg = LK.pgs.find(p => p.id === pgId);
    return pg ? pg.name : "—";
  }

  function renderTable(){
    const rows = tenantsBy(activeTab);
    const wrap = document.getElementById("billTableWrap");
    document.getElementById("billEmpty").classList.toggle("d-none", rows.length > 0);

    if(activeTab === "unpaid" || activeTab === "unfinished"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Tenant Name</th><th>PG</th><th>Room No</th><th>Email</th><th>Due Months</th><th>Due Amount</th></tr></thead>
        <tbody>
          ${rows.map(t => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${t.id}')">${t.name}</span></td>
            <td>${getPgName(t.pgId)}</td>
            <td>${t.roomNo}</td>
            <td>${t.email}</td>
            <td>${t.dueMonths.join(", ")}</td>
            <td class="fw-semibold">${fmtINR(t.dueAmount)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    else if(activeTab === "paid"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>PG</th><th>Email</th><th>Paid Amount</th><th>Paid Date</th><th>Next Payment Date</th></tr></thead>
        <tbody>
          ${rows.map(t => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${t.id}')">${t.name}</span></td>
            <td>${getPgName(t.pgId)}</td>
            <td>${t.email}</td>
            <td>${fmtINR(t.paidAmount)}</td>
            <td>${t.paidDate}</td>
            <td>${t.nextPaymentDate}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    else if(activeTab === "delayed"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>PG</th><th>Room No</th><th>Email</th><th>Phone</th><th>Due Amount</th><th>Due Months</th><th>Fine</th><th>Days Delayed</th></tr></thead>
        <tbody>
          ${rows.map(t => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${t.id}')">${t.name}</span></td>
            <td>${getPgName(t.pgId)}</td>
            <td>${t.roomNo}</td>
            <td>${t.email}</td>
            <td>${t.countryCode} ${t.phone}</td>
            <td class="fw-semibold">${fmtINR(t.dueAmount)}</td>
            <td>${t.dueMonths.join(", ")}</td>
            <td><span class="chip chip-red">${fmtINR(t.fine)}</span></td>
            <td>${t.delayedDays} day(s)</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    else if(activeTab === "cash"){
      wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <p class="small text-muted-soft mb-0">Record a new cash collection, or review past cash payments below.</p>
        <button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#cashModal"><i class="bi bi-cash-coin me-1"></i>Record Cash Payment</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>PG</th><th>Room No</th><th>Amount</th><th>Paid Date</th></tr></thead>
        <tbody>
          ${rows.map(t => `<tr><td>${t.name}</td><td>${getPgName(t.pgId)}</td><td>${t.roomNo}</td><td>${fmtINR(t.paidAmount)}</td><td>${t.paidDate}</td></tr>`).join("")}
        </tbody>
      </table>
      ${rows.length === 0 ? '<p class="text-center text-muted-soft small py-3">No cash payments recorded yet.</p>' : ""}`;
    }
  }

  /* -------- Detail / message modal -------- */
  const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
  window.openDetail = function(id){
    const t = LK.tenants.find(x => x.id === id);
    document.getElementById("detailName").textContent = t.name;
    const payBefore = "the " + (t.paymentDate + 7) + (["1","21","31"].includes(String(t.paymentDate + 7)) ? "st" : ["2","22"].includes(String(t.paymentDate + 7)) ? "nd" : "rd") + " of the month";

    let bodyHtml = `
      <div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">PG:</span> <strong>${getPgName(t.pgId)}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Room No:</span> <strong>${t.roomNo}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Phone:</span> <strong>${t.countryCode} ${t.phone}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Payment date:</span> <strong>Day ${t.paymentDate}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Rent:</span> <strong>${fmtINR(t.rent)}</strong></div>
      </div><hr>`;

    if(activeTab === "unpaid" || activeTab === "unfinished"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Due months:</span> <strong>${t.dueMonths.join(", ")}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Due amount:</span> <strong>${fmtINR(t.dueAmount)}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${t.name.split(" ")[0]}, this is a reminder that ${fmtINR(t.dueAmount)} is due for ${t.dueMonths.join(", ")}. Please pay before ${payBefore} to avoid a late fine of ₹100/day. You can complete your payment directly on the Livinkey App.

Thank you,
Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${t.id}')"><i class="bi bi-send me-1"></i>Send message</button>
        <button class="btn btn-dark-brand" onclick="generateAndSendQR('${t.id}')"><i class="bi bi-qr-code me-1"></i>Generate & Send QR</button>`;
    }
    else if(activeTab === "paid"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Paid amount:</span> <strong>${fmtINR(t.paidAmount)}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Paid date:</span> <strong>${t.paidDate}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Next payment date:</span> <strong>${t.nextPaymentDate}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${t.name.split(" ")[0]}, thank you for your payment of ${fmtINR(t.paidAmount)} received on ${t.paidDate}. Your next payment of ${fmtINR(t.rent)} is due on ${t.nextPaymentDate}.

— Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-dark-brand" onclick="generateReceipt('${t.id}')"><i class="bi bi-file-earmark-text me-1"></i>Generate &amp; send receipt</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${t.id}')"><i class="bi bi-send me-1"></i>Send message</button>`;
    }
    else if(activeTab === "delayed"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Due months:</span> <strong>${t.dueMonths.join(", ")}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Due amount:</span> <strong>${fmtINR(t.dueAmount)}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Days delayed:</span> <strong>${t.delayedDays}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Fine accrued:</span> <strong class="text-danger">${fmtINR(t.fine)}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${t.name.split(" ")[0]}, your payment is ${t.delayedDays} day(s) overdue and a fine of ${fmtINR(t.fine)} has been added (₹100/day). Total due: ${fmtINR(t.dueAmount + t.fine)}. Please settle this on the Livinkey App as soon as possible.

— Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${t.id}')"><i class="bi bi-send me-1"></i>Send message</button>
        <button class="btn btn-dark-brand" onclick="generateAndSendQR('${t.id}')"><i class="bi bi-qr-code me-1"></i>Generate & Send QR</button>`;
    }
    document.getElementById("detailBody").innerHTML = bodyHtml;
    detailModal.show();
  };

  window.sendDetailMessage = function(id){
    const btn = document.querySelector('#detailFooter .btn-brand');
    if(btn) LOADER.show(btn, 'Sending...');
    setTimeout(() => {
      detailModal.hide();
      showToast("Message sent to tenant.", "success");
      if(btn) LOADER.hide(btn);
    }, 600);
  };
  
  window.generateReceipt = function(id){
    const btn = document.querySelector('#detailFooter .btn-dark-brand');
    if(btn) LOADER.show(btn, 'Generating...');
    setTimeout(() => {
      showToast("Receipt generated and sent to tenant's email.", "success");
      if(btn) LOADER.hide(btn);
    }, 800);
  };

  window.generateAndSendQR = function(id){
    const t = LK.tenants.find(x => x.id === id);
    const amount = t.dueAmount || t.rent || 0;
    const qrData = {
      tenant: t.name,
      amount: amount,
      pg: getPgName(t.pgId),
      room: t.roomNo,
      date: new Date().toISOString().split('T')[0],
      billId: `BILL-${t.id}-${Date.now().toString().slice(-6)}`
    };
    
    const btn = document.querySelector('#detailFooter .btn-dark-brand');
    if(btn) LOADER.show(btn, 'Generating...');
    
    setTimeout(() => {
      showToast(`📱 QR Code generated for ${t.name} (₹${amount})`, "info");
      
      const conv = LK.conversations[t.id] || (LK.conversations[t.id] = []);
      conv.push({ 
        from: "admin", 
        text: `🔷 Payment QR Code attached — Bill ID: ${qrData.billId}, Amount: ${fmtINR(amount)}. Please scan to pay.`, 
        time: "Just now",
        hasQR: true,
        qrData: qrData
      });
      
      setTimeout(() => {
        showToast(`✅ QR Code sent to ${t.name} via messages.`, "success");
        if(btn) LOADER.hide(btn);
        detailModal.hide();
      }, 400);
    }, 600);
  };

  /* -------- Attach and QR Code -------- */
  document.getElementById("attachBtn")?.addEventListener("click", () => {
    document.getElementById("attachInput").click();
  });
  document.getElementById("attachInput")?.addEventListener("change", function(){
    if(this.files.length > 0){
      showToast("File attached successfully.", "info");
    }
  });
  document.getElementById("qrBtn")?.addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Generating...');
    setTimeout(() => {
      showToast("QR Code generated for payment.", "success");
      LOADER.hide(btn);
    }, 500);
  });

  /* -------- Cash payment + OTP -------- */
  const cashModal = document.getElementById("cashModal");
  cashModal.addEventListener("show.bs.modal", () => {
    document.getElementById("cashTenant").innerHTML = allTenants().map(t => `<option value="${t.id}">${t.name} — ${getPgName(t.pgId)} Room ${t.roomNo}</option>`).join("");
  });
  const cashOtpModal = new bootstrap.Modal(document.getElementById("cashOtpModal"));
  let pendingCash = null;

  document.getElementById("cashForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Processing...');
    
    const t = LK.tenants.find(x => x.id === document.getElementById("cashTenant").value);
    pendingCash = {
      tenantId: t.id,
      from: document.getElementById("cashFrom").value,
      till: document.getElementById("cashTill").value,
      amount: Number(document.getElementById("cashAmount").value)
    };
    
    setTimeout(() => {
      bootstrap.Modal.getInstance(cashModal).hide();
      document.getElementById("cashOtpTenant").textContent = t.name;
      document.querySelectorAll(".cash-otp-box").forEach(b => b.value = "");
      showToast(`Demo OTP sent to ${t.name}: <strong>123456</strong>`, "info");
      cashOtpModal.show();
      LOADER.hide(btn);
    }, 500);
  });

  document.querySelectorAll(".cash-otp-box").forEach((box, i, arr) => {
    box.addEventListener("input", () => { 
      box.value = box.value.replace(/\D/g,"").slice(0,1); 
      if(box.value && arr[i+1]) arr[i+1].focus(); 
    });
  });

  document.getElementById("verifyCashOtpBtn").addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Verifying...');
    
    const code = Array.from(document.querySelectorAll(".cash-otp-box")).map(b => b.value).join("");
    setTimeout(() => {
      if(code !== "1234" && code !== "123456"){
        showToast("Incorrect OTP. Please try again.", "danger");
        LOADER.hide(btn);
        return;
      }
      const t = LK.tenants.find(x => x.id === pendingCash.tenantId);
      t.billStatus = "cash";
      t.dueMonths = []; 
      t.dueAmount = 0; 
      t.delayedDays = 0; 
      t.fine = 0;
      t.paidAmount = pendingCash.amount; 
      t.paidDate = pendingCash.till; 
      t.nextPaymentDate = pendingCash.till;
      cashOtpModal.hide();
      showToast(`Cash payment of ${fmtINR(pendingCash.amount)} collected from ${t.name}.`, "success");
      renderStats(); 
      renderTabs(); 
      renderTable();
      LOADER.hide(btn);
    }, 600);
  });

  /* -------- Create bill with meter upload, attachment and QR -------- */
  let billAttachment = null;
  let billQRCode = null;
  let meterImageFile = null;

  document.getElementById("createBillModal").addEventListener("show.bs.modal", () => {
    document.getElementById("billTenant").innerHTML = tenantsBy("unpaid").map(t => `<option value="${t.id}">${t.name} — ${getPgName(t.pgId)} Room ${t.roomNo}</option>`).join("");
    billAttachment = null;
    billQRCode = null;
    meterImageFile = null;
    document.getElementById("billAttachmentStatus").textContent = "No file attached";
    document.getElementById("billQRStatus").textContent = "No QR generated";
    document.getElementById("meterUploadStatus").textContent = "No image uploaded";
    document.getElementById("meterPreview").classList.add("d-none");
    document.getElementById("meterUploadInput").value = "";
  });
  
  document.getElementById("billRent").addEventListener("input", calculateTotal);
  document.getElementById("billElectricity").addEventListener("input", calculateTotal);
  document.getElementById("billMaintenance").addEventListener("input", calculateTotal);
  document.getElementById("billOther").addEventListener("input", calculateTotal);

  document.getElementById("billAttachBtn")?.addEventListener("click", () => {
    document.getElementById("billAttachInput").click();
  });
  
  document.getElementById("billAttachInput")?.addEventListener("change", function(){
    if(this.files.length > 0){
      billAttachment = this.files[0];
      document.getElementById("billAttachmentStatus").innerHTML = `<i class="bi bi-paperclip me-1"></i> ${billAttachment.name}`;
      showToast(`File "${billAttachment.name}" attached.`, "info");
    }
  });

  // Meter upload functionality
  document.getElementById("meterUploadBtn")?.addEventListener("click", () => {
    document.getElementById("meterUploadInput").click();
  });

  document.getElementById("meterUploadInput")?.addEventListener("change", function(){
    if(this.files.length > 0){
      meterImageFile = this.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById("meterPreviewImage").src = e.target.result;
        document.getElementById("meterPreview").classList.remove("d-none");
        document.getElementById("meterUploadStatus").innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> ${meterImageFile.name}`;
        showToast(`Meter image "${meterImageFile.name}" uploaded.`, "info");
      };
      reader.readAsDataURL(this.files[0]);
    }
  });

  document.getElementById("removeMeterImage")?.addEventListener("click", function(){
    meterImageFile = null;
    document.getElementById("meterUploadInput").value = "";
    document.getElementById("meterPreview").classList.add("d-none");
    document.getElementById("meterUploadStatus").textContent = "No image uploaded";
    showToast("Meter image removed.", "info");
  });

  document.getElementById("billGenerateQRBtn")?.addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Generating QR...');
    
    const tenantId = document.getElementById("billTenant").value;
    if(!tenantId){
      showToast("Please select a tenant first.", "warning");
      LOADER.hide(btn);
      return;
    }
    const t = LK.tenants.find(x => x.id === tenantId);
    const rent = Number(document.getElementById("billRent").value || 0);
    const elec = Number(document.getElementById("billElectricity").value || 0);
    const maint = Number(document.getElementById("billMaintenance").value || 0);
    const other = Number(document.getElementById("billOther").value || 0);
    const total = rent + elec + maint + other;
    
    if(total === 0){
      showToast("Please enter an amount to generate QR.", "warning");
      LOADER.hide(btn);
      return;
    }
    
    setTimeout(() => {
      billQRCode = {
        tenant: t.name,
        amount: total,
        pg: getPgName(t.pgId),
        room: t.roomNo,
        date: new Date().toISOString().split('T')[0],
        billId: `BILL-${t.id}-${Date.now().toString().slice(-6)}`
      };
      
      document.getElementById("billQRStatus").innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> QR Generated (₹${total})`;
      showToast(`✅ QR Code generated for ${t.name} — ₹${total}`, "success");
      LOADER.hide(btn);
    }, 500);
  });

  function calculateTotal(){
    const rent = Number(document.getElementById("billRent").value || 0);
    const elec = Number(document.getElementById("billElectricity").value || 0);
    const maint = Number(document.getElementById("billMaintenance").value || 0);
    const other = Number(document.getElementById("billOther").value || 0);
    const total = rent + elec + maint + other;
    document.getElementById("billTotalDisplay").textContent = fmtINR(total);
  }

  document.getElementById("createBillForm").addEventListener("submit", function(e){
    e.preventDefault();
    const btn = this.querySelector('button[type="submit"]');
    LOADER.show(btn, 'Sending bill...');
    
    const t = LK.tenants.find(x => x.id === document.getElementById("billTenant").value);
    const rent = Number(document.getElementById("billRent").value || 0);
    const elec = Number(document.getElementById("billElectricity").value || 0);
    const maint = Number(document.getElementById("billMaintenance").value || 0);
    const other = Number(document.getElementById("billOther").value || 0);
    const total = rent + elec + maint + other;
    
    setTimeout(() => {
      const conv = LK.conversations[t.id] || (LK.conversations[t.id] = []);
      let messageText = `📄 New bill generated — Rent: ${fmtINR(rent)}, Electricity: ${fmtINR(elec)}, Maintenance: ${fmtINR(maint)}, Other: ${fmtINR(other)}. Total due: ${fmtINR(total)}.`;
      
      if(meterImageFile){
        messageText += ` 📸 Meter reading image attached.`;
      }
      
      if(billAttachment){
        messageText += ` 📎 Attachment: ${billAttachment.name}`;
      }
      
      if(billQRCode){
        messageText += ` 📱 QR Code attached for payment (ID: ${billQRCode.billId})`;
      }
      
      conv.push({ 
        from: "admin", 
        text: messageText, 
        time: "Just now",
        hasMeterImage: !!meterImageFile,
        meterImageName: meterImageFile ? meterImageFile.name : null,
        hasAttachment: !!billAttachment,
        attachmentName: billAttachment ? billAttachment.name : null,
        hasQR: !!billQRCode,
        qrData: billQRCode
      });
      
      bootstrap.Modal.getInstance(document.getElementById("createBillModal")).hide();
      this.reset();
      document.getElementById("billTotalDisplay").textContent = "₹0";
      document.getElementById("billAttachmentStatus").textContent = "No file attached";
      document.getElementById("billQRStatus").textContent = "No QR generated";
      document.getElementById("meterUploadStatus").textContent = "No image uploaded";
      document.getElementById("meterPreview").classList.add("d-none");
      billAttachment = null;
      billQRCode = null;
      meterImageFile = null;
      
      showToast(`✅ Bill of ${fmtINR(total)} sent to ${t.name}.`, "success");
      LOADER.hide(btn);
    }, 600);
  });

  renderStats(); 
  renderTabs(); 
  renderTable();
});