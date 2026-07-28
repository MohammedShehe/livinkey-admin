document.addEventListener("DOMContentLoaded", () => {
  renderLayout("members", "Members Management", "View, add and manage every resident member");

  const DOC_TYPES = [
    { key: "user",     label: "User Photo" },
    { key: "cForm",    label: "C-Form" },
    { key: "passport", label: "Passport" },
    { key: "frro",     label: "FRRO" },
    { key: "visa",     label: "Visa" },
    { key: "arrival",  label: "Arrival Stamp" }
  ];

  const statusMeta = {
    unpaid:     { label: "Unpaid",     chip: "chip-red"   },
    unfinished: { label: "Partial",    chip: "chip-amber" },
    paid:       { label: "Paid",       chip: "chip-green" },
    delayed:    { label: "Delayed",    chip: "chip-red"   },
    cash:       { label: "Cash Paid",  chip: "chip-blue"  }
  };

  function members(){ return LK.users.filter(u => u.role === "Member"); }

  function renderStats(){
    const m = members();
    const stats = [
      { label: "Total Members", value: m.length, icon: "bi-people-fill", color: "var(--lk-green)" },
      { label: "National", value: m.filter(x => x.residency === "National").length, icon: "bi-flag-fill", color: "var(--info)" },
      { label: "International", value: m.filter(x => x.residency === "International").length, icon: "bi-globe2", color: "var(--warning)" },
      { label: "Male", value: m.filter(x => x.gender === "Male").length, icon: "bi-gender-male", color: "var(--lk-black)" },
      { label: "Female", value: m.filter(x => x.gender === "Female").length, icon: "bi-gender-female", color: "var(--danger)" }
    ];
    document.getElementById("memberStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-4 col-lg">
        <div class="stat-card hover-lift">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  function renderTable(filter = ""){
    const f = filter.trim().toLowerCase();
    const rows = members().filter(u =>
      !f || u.name.toLowerCase().includes(f) || (u.roomNo||"").toLowerCase().includes(f) ||
      u.country.toLowerCase().includes(f) || String(u.rent).includes(f)
    );
    document.getElementById("membersTbody").innerHTML = rows.map(u => {
      const st = statusMeta[u.billStatus] || statusMeta.paid;
      return `
      <tr>
        <td><span class="name-link" onclick="openDocs('${u.id}')">${u.name}</span><div class="small text-muted-soft">${u.email}</div></td>
        <td>${u.roomNo || "—"}</td>
        <td>${fmtINR(u.rent || 0)}</td>
        <td>${u.country}</td>
        <td>${u.gender}</td>
        <td>${u.paymentDate ? "Day " + u.paymentDate : "—"}</td>
        <td><span class="chip ${st.chip}">${st.label}</span></td>
        <td class="text-end">
          <button class="btn-icon me-1" title="Edit" onclick="editMember('${u.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon" title="Delete" onclick="deleteMember('${u.id}')"><i class="bi bi-trash3"></i></button>
        </td>
      </tr>`;
    }).join("");
    document.getElementById("membersEmpty").classList.toggle("d-none", rows.length > 0);
  }

  document.getElementById("memberSearch").addEventListener("input", (e) => renderTable(e.target.value));

  /* ---------------- Add / Edit modal ---------------- */
  const userModalEl = document.getElementById("addUserModal");
  const userModal = new bootstrap.Modal(userModalEl);
  const roleSelect = document.getElementById("uRole");
  const residencySelect = document.getElementById("uResidency");

  function toggleMemberOnly(){
    const isGuest = roleSelect.value === "Guest";
    document.querySelectorAll(".member-only").forEach(el => el.classList.toggle("d-none", isGuest));
  }
  function toggleCountry(){
    const isNational = residencySelect.value === "National";
    document.getElementById("uCountry").value = isNational ? "India" : "";
    document.getElementById("uCountry").readOnly = isNational;
  }
  roleSelect.addEventListener("change", toggleMemberOnly);
  residencySelect.addEventListener("change", toggleCountry);

  userModalEl.addEventListener("show.bs.modal", (e) => {
    if(!e.relatedTarget){ return; } // opened programmatically for edit; skip reset
  });
  document.querySelector('[data-bs-target="#addUserModal"]').addEventListener("click", () => {
    document.getElementById("userModalTitle").textContent = "Add New User";
    document.getElementById("userForm").reset();
    document.getElementById("userId").value = "";
    toggleMemberOnly(); toggleCountry();
  });

  document.getElementById("userForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const id = document.getElementById("userId").value;
    const role = roleSelect.value;
    const payload = {
      name: document.getElementById("uName").value.trim(),
      email: document.getElementById("uEmail").value.trim(),
      role,
      residency: residencySelect.value,
      country: document.getElementById("uCountry").value.trim() || "India",
      countryCode: document.getElementById("uCode").value,
      phone: document.getElementById("uPhone").value.trim(),
    };
    if(role === "Member"){
      Object.assign(payload, {
        gender: document.getElementById("uGender").value,
        roomNo: document.getElementById("uRoom").value.trim(),
        rent: Number(document.getElementById("uRent").value || 0),
        paymentDate: Number(document.getElementById("uPayDate").value || 1),
        paidPeriods: [{ from: document.getElementById("uPaidFrom").value, to: document.getElementById("uPaidTill").value }],
        billStatus: "paid", dueMonths: [], dueAmount: 0, delayedDays: 0, fine: 0,
        docs: { user: false, cForm: false, passport: false, frro: false, visa: false, arrival: false }
      });
    }

    if(id){
      const idx = LK.users.findIndex(u => u.id === id);
      LK.users[idx] = { ...LK.users[idx], ...payload };
      showToast(`${payload.name}'s details were updated.`, "success");
    } else {
      payload.id = (role === "Guest" ? "G" : "U") + Math.random().toString(36).slice(2,7).toUpperCase();
      LK.users.push(payload);
      showToast(role === "Guest" ? `${payload.name} was added to Guests.` : `${payload.name} was added successfully.`, "success");
    }
    userModal.hide();
    renderStats(); renderTable(document.getElementById("memberSearch").value);
  });

  window.editMember = function(id){
    const u = LK.users.find(x => x.id === id);
    document.getElementById("userModalTitle").textContent = "Edit User";
    document.getElementById("userId").value = u.id;
    document.getElementById("uName").value = u.name;
    document.getElementById("uEmail").value = u.email;
    roleSelect.value = u.role;
    residencySelect.value = u.residency;
    document.getElementById("uCountry").value = u.country;
    document.getElementById("uCode").value = u.countryCode;
    document.getElementById("uPhone").value = u.phone;
    document.getElementById("uGender").value = u.gender || "Male";
    document.getElementById("uRoom").value = u.roomNo || "";
    document.getElementById("uRent").value = u.rent || "";
    document.getElementById("uPayDate").value = u.paymentDate || "";
    document.getElementById("uPaidFrom").value = u.paidPeriods?.[0]?.from || "";
    document.getElementById("uPaidTill").value = u.paidPeriods?.[0]?.to || "";
    toggleMemberOnly(); toggleCountry();
    userModal.show();
  };

  /* ---------------- Delete confirmation ---------------- */
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  window.deleteMember = function(id){
    const u = LK.users.find(x => x.id === id);
    document.getElementById("confirmTitle").textContent = `Delete ${u.name}?`;
    document.getElementById("confirmBody").textContent = "This will permanently remove this member and their documents. This action cannot be undone.";
    document.getElementById("confirmActionBtn").onclick = () => {
      LK.users = LK.users.filter(x => x.id !== id);
      confirmModal.hide();
      showToast(`${u.name} was deleted.`, "danger");
      renderStats(); renderTable(document.getElementById("memberSearch").value);
    };
    confirmModal.show();
  };

  /* ---------------- Documents modal ---------------- */
  const docsModal = new bootstrap.Modal(document.getElementById("docsModal"));
  window.openDocs = function(id){
    const u = LK.users.find(x => x.id === id);
    document.getElementById("docsMemberName").textContent = u.name;
    document.getElementById("docsGrid").innerHTML = DOC_TYPES.map(d => {
      const has = u.docs?.[d.key];
      return `
      <div class="col-md-4 col-6">
        <div class="doc-thumb">
          <img src="https://placehold.co/300x160/${has ? "92C24A" : "E1E8D8"}/${has ? "0B0F0A" : "7C8A76"}?text=${encodeURIComponent(d.label)}" alt="${d.label}">
          <div class="doc-actions">
            <button class="btn-icon" style="background:#fff;" title="Download" ${has ? "" : "disabled"} onclick="showToast('${d.label} download started.','info')"><i class="bi bi-download"></i></button>
            <button class="btn-icon" style="background:#fff;color:var(--danger);" title="Delete" ${has ? "" : "disabled"} onclick="deleteDoc('${u.id}','${d.key}','${d.label}')"><i class="bi bi-trash3"></i></button>
          </div>
          <div class="doc-label">${d.label} ${has ? '<span class="chip chip-green ms-1">Uploaded</span>' : '<span class="chip chip-gray ms-1">Missing</span>'}</div>
        </div>
      </div>`;
    }).join("");
    docsModal.show();
  };

  window.deleteDoc = function(userId, key, label){
    document.getElementById("confirmTitle").textContent = `Delete ${label}?`;
    document.getElementById("confirmBody").textContent = "This document will be permanently removed from the member's profile.";
    document.getElementById("confirmActionBtn").onclick = () => {
      const u = LK.users.find(x => x.id === userId);
      u.docs[key] = false;
      confirmModal.hide();
      showToast(`${label} deleted.`, "danger");
      window.openDocs(userId);
    };
    confirmModal.show();
  };

  renderStats();
  renderTable();
});
