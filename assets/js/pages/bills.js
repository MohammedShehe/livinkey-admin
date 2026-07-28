document.addEventListener("DOMContentLoaded", () => {
  renderLayout("bills", "Bills", "Track rent status and manage collections across all members");

  const TABS = [
    { key: "unpaid",     label: "Unpaid Members",              icon: "bi-exclamation-circle", color: "var(--danger)" },
    { key: "unfinished", label: "Unfinished Payments",         icon: "bi-hourglass-split",    color: "var(--warning)" },
    { key: "paid",       label: "Paid Members",                icon: "bi-check-circle",       color: "var(--success)" },
    { key: "delayed",    label: "Delayed Payments",             icon: "bi-alarm",              color: "var(--danger)" },
    { key: "cash",       label: "Cash Payments",                icon: "bi-cash-coin",          color: "var(--info)" }
  ];
  let activeTab = "unpaid";

  function membersBy(status){ return LK.users.filter(u => u.role === "Member" && u.billStatus === status); }
  function allMembers(){ return LK.users.filter(u => u.role === "Member"); }

  function renderStats(){
    document.getElementById("billStats").innerHTML = TABS.map(t => `
      <div class="col-6 col-md-4 col-lg">
        <div class="stat-card hover-lift">
          <div class="stat-icon" style="background:${t.color}22;color:${t.color};"><i class="bi ${t.icon}"></i></div>
          <div><div class="stat-value">${membersBy(t.key).length}</div><div class="stat-label">${t.label}</div></div>
        </div>
      </div>`).join("");
  }

  function renderTabs(){
    document.getElementById("billTabs").innerHTML = TABS.map(t => `
      <button class="filter-pill ${activeTab === t.key ? "active" : ""}" data-tab="${t.key}">${t.label} <span class="ms-1">(${membersBy(t.key).length})</span></button>
    `).join("");
    document.querySelectorAll(".filter-pill").forEach(btn => btn.addEventListener("click", () => {
      activeTab = btn.dataset.tab; renderTabs(); renderTable();
    }));
  }

  function renderTable(){
    const rows = membersBy(activeTab);
    const wrap = document.getElementById("billTableWrap");
    document.getElementById("billEmpty").classList.toggle("d-none", rows.length > 0 || activeTab === "cash");

    if(activeTab === "unpaid" || activeTab === "unfinished"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Member Name</th><th>Room No</th><th>Email</th><th>Due Months</th><th>Due Amount</th></tr></thead>
        <tbody>
          ${rows.map(u => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${u.id}')">${u.name}</span></td>
            <td>${u.roomNo}</td><td>${u.email}</td>
            <td>${u.dueMonths.join(", ")}</td>
            <td class="fw-semibold">${fmtINR(u.dueAmount)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    if(activeTab === "paid"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email</th><th>Paid Amount</th><th>Paid Date</th><th>Next Payment Date</th></tr></thead>
        <tbody>
          ${rows.map(u => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${u.id}')">${u.name}</span></td>
            <td>${u.email}</td><td>${fmtINR(u.paidAmount)}</td>
            <td>${u.paidDate}</td><td>${u.nextPaymentDate}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    if(activeTab === "delayed"){
      wrap.innerHTML = `
      <table class="data-table">
        <thead><tr><th>Name</th><th>Room No</th><th>Email</th><th>Phone</th><th>Due Amount</th><th>Due Months</th><th>Fine</th><th>Days Delayed</th></tr></thead>
        <tbody>
          ${rows.map(u => `
          <tr>
            <td><span class="name-link" onclick="openDetail('${u.id}')">${u.name}</span></td>
            <td>${u.roomNo}</td><td>${u.email}</td><td>${u.countryCode} ${u.phone}</td>
            <td class="fw-semibold">${fmtINR(u.dueAmount)}</td><td>${u.dueMonths.join(", ")}</td>
            <td><span class="chip chip-red">${fmtINR(u.fine)}</span></td>
            <td>${u.delayedDays} day(s)</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
    }
    if(activeTab === "cash"){
      wrap.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3">
        <p class="small text-muted-soft mb-0">Record a new cash collection, or review past cash payments below.</p>
        <button class="btn btn-brand" data-bs-toggle="modal" data-bs-target="#cashModal"><i class="bi bi-cash-coin me-1"></i>Record Cash Payment</button>
      </div>
      <table class="data-table">
        <thead><tr><th>Name</th><th>Room No</th><th>Amount</th><th>Paid Date</th></tr></thead>
        <tbody>
          ${rows.map(u => `<tr><td>${u.name}</td><td>${u.roomNo}</td><td>${fmtINR(u.paidAmount)}</td><td>${u.paidDate}</td></tr>`).join("")}
        </tbody>
      </table>
      ${rows.length === 0 ? '<p class="text-center text-muted-soft small py-3">No cash payments recorded yet.</p>' : ""}`;
    }
  }

  /* -------- Detail / message modal -------- */
  const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
  window.openDetail = function(id){
    const u = LK.users.find(x => x.id === id);
    document.getElementById("detailName").textContent = u.name;
    const payBefore = "the " + (u.paymentDate + 7) + (["1","21","31"].includes(String(u.paymentDate+7)) ? "st" : ["2","22"].includes(String(u.paymentDate+7)) ? "nd" : "rd") + " of the month";

    let bodyHtml = `
      <div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Room No:</span> <strong>${u.roomNo}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Phone:</span> <strong>${u.countryCode} ${u.phone}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Payment date:</span> <strong>Day ${u.paymentDate}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Rent:</span> <strong>${fmtINR(u.rent)}</strong></div>
      </div><hr>`;

    if(activeTab === "unpaid" || activeTab === "unfinished"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Due months:</span> <strong>${u.dueMonths.join(", ")}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Due amount:</span> <strong>${fmtINR(u.dueAmount)}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${u.name.split(" ")[0]}, this is a reminder that ${fmtINR(u.dueAmount)} is due for ${u.dueMonths.join(", ")}. Please pay before ${payBefore} to avoid a late fine of ₹100/day. You can complete your payment directly on the Livinkey App.

Thank you,
Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${u.id}')"><i class="bi bi-send me-1"></i>Send message</button>`;
    }
    else if(activeTab === "paid"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Paid amount:</span> <strong>${fmtINR(u.paidAmount)}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Paid date:</span> <strong>${u.paidDate}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Next payment date:</span> <strong>${u.nextPaymentDate}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${u.name.split(" ")[0]}, thank you for your payment of ${fmtINR(u.paidAmount)} received on ${u.paidDate}. Your next payment of ${fmtINR(u.rent)} is due on ${u.nextPaymentDate}.

— Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-dark-brand" onclick="sendReceipt('${u.id}')"><i class="bi bi-file-earmark-text me-1"></i>Generate &amp; send receipt</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${u.id}')"><i class="bi bi-send me-1"></i>Send message</button>`;
    }
    else if(activeTab === "delayed"){
      bodyHtml += `<div class="row g-2 small">
        <div class="col-6"><span class="text-muted-soft">Due months:</span> <strong>${u.dueMonths.join(", ")}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Due amount:</span> <strong>${fmtINR(u.dueAmount)}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Days delayed:</span> <strong>${u.delayedDays}</strong></div>
        <div class="col-6"><span class="text-muted-soft">Fine accrued:</span> <strong class="text-danger">${fmtINR(u.fine)}</strong></div>
      </div>`;
      document.getElementById("detailMessage").value =
`Hi ${u.name.split(" ")[0]}, your payment is ${u.delayedDays} day(s) overdue and a fine of ${fmtINR(u.fine)} has been added (₹100/day). Total due: ${fmtINR(u.dueAmount + u.fine)}. Please settle this on the Livinkey App as soon as possible.

— Livinkey Team`;
      document.getElementById("detailMessageWrap").classList.remove("d-none");
      document.getElementById("detailFooter").innerHTML = `
        <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
        <button class="btn btn-brand" onclick="sendDetailMessage('${u.id}')"><i class="bi bi-send me-1"></i>Send message</button>`;
    }
    document.getElementById("detailBody").innerHTML = bodyHtml;
    detailModal.show();
  };

  window.sendDetailMessage = function(id){
    detailModal.hide();
    showToast("Message sent to member.", "success");
  };
  window.sendReceipt = function(id){
    showToast("Receipt generated and sent to member's email.", "success");
  };

  /* -------- Cash payment + OTP -------- */
  const cashModal = document.getElementById("cashModal");
  cashModal.addEventListener("show.bs.modal", () => {
    document.getElementById("cashMember").innerHTML = allMembers().map(u => `<option value="${u.id}">${u.name} — Room ${u.roomNo}</option>`).join("");
  });
  const cashOtpModal = new bootstrap.Modal(document.getElementById("cashOtpModal"));
  let pendingCash = null;

  document.getElementById("cashForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = LK.users.find(x => x.id === document.getElementById("cashMember").value);
    pendingCash = {
      userId: u.id,
      from: document.getElementById("cashFrom").value,
      till: document.getElementById("cashTill").value,
      amount: Number(document.getElementById("cashAmount").value)
    };
    bootstrap.Modal.getInstance(cashModal).hide();
    document.getElementById("cashOtpMember").textContent = u.name;
    document.querySelectorAll(".cash-otp-box").forEach(b => b.value = "");
    showToast(`Demo OTP sent to ${u.name}: <strong>123456</strong>`, "info");
    cashOtpModal.show();
  });

  document.querySelectorAll(".cash-otp-box").forEach((box, i, arr) => {
    box.addEventListener("input", () => { box.value = box.value.replace(/\D/g,"").slice(0,1); if(box.value && arr[i+1]) arr[i+1].focus(); });
  });

  document.getElementById("verifyCashOtpBtn").addEventListener("click", () => {
    const code = Array.from(document.querySelectorAll(".cash-otp-box")).map(b => b.value).join("");
    if(code !== "1234" && code !== "123456"){
      showToast("Incorrect OTP. Please try again.", "danger");
      return;
    }
    const u = LK.users.find(x => x.id === pendingCash.userId);
    u.billStatus = "cash";
    u.dueMonths = []; u.dueAmount = 0; u.delayedDays = 0; u.fine = 0;
    u.paidAmount = pendingCash.amount; u.paidDate = pendingCash.till; u.nextPaymentDate = pendingCash.till;
    cashOtpModal.hide();
    showToast(`Cash payment of ${fmtINR(pendingCash.amount)} collected from ${u.name}.`, "success");
    renderStats(); renderTabs(); renderTable();
  });

  /* -------- Create bill -------- */
  document.getElementById("createBillModal").addEventListener("show.bs.modal", () => {
    document.getElementById("billMember").innerHTML = membersBy("unpaid").map(u => `<option value="${u.id}">${u.name} — Room ${u.roomNo}</option>`).join("");
  });
  document.getElementById("createBillForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const u = LK.users.find(x => x.id === document.getElementById("billMember").value);
    const rent = Number(document.getElementById("billRent").value || 0);
    const elec = Number(document.getElementById("billElectricity").value || 0);
    const maint = Number(document.getElementById("billMaintenance").value || 0);
    const other = Number(document.getElementById("billOther").value || 0);
    const total = rent + elec + maint + other;
    const conv = LK.conversations[u.id] || (LK.conversations[u.id] = []);
    conv.push({ from: "admin", text: `New bill generated — Rent: ${fmtINR(rent)}, Electricity: ${fmtINR(elec)}, Maintenance: ${fmtINR(maint)}, Other: ${fmtINR(other)}. Total due: ${fmtINR(total)}.`, time: "Just now" });
    bootstrap.Modal.getInstance(document.getElementById("createBillModal")).hide();
    e.target.reset();
    showToast(`Bill of ${fmtINR(total)} sent to ${u.name} via Messages.`, "success");
  });

  renderStats(); renderTabs(); renderTable();
});
