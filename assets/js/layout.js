/* ==========================================================================
   Livinkey Admin — Shared App Shell (sidebar + topbar)
   ========================================================================== */

const MENU = [
  { key: "tenants", label: "Tenants Management", icon: "bi-people-fill", href: "tenants.html" },
  { key: "guests",  label: "Guests", icon: "bi-person-badge", href: "guests.html" },
  { key: "admins",  label: "Admins Management", icon: "bi-shield-lock-fill", href: "admins.html" },
  { key: "bills",   label: "Bills", icon: "bi-receipt-cutoff", href: "bills.html" },
  { key: "pgs",     label: "PGs Management", icon: "bi-building", href: "pgs.html" },
  { key: "maintenance", label: "Maintenance", icon: "bi-tools", href: "maintenance.html" },
  { key: "documents", label: "Documents", icon: "bi-files", href: "documents.html" }
];

function currentAdminRecord(){
  const s = AUTH.session();
  if(!s) return null;
  if(s.role === "Super Admin") return { name: s.name, email: s.email, role: s.role, access: "all" };
  const rec = LK.admins.find(a => a.email === s.email);
  return rec ? { ...rec, role: "Admin" } : { name: s.name, email: s.email, role: "Admin", access: null };
}

function canView(moduleKey){
  const rec = currentAdminRecord();
  if(!rec) return false;
  if(rec.access === "all") return true;
  if(moduleKey === "admins") return false;
  return rec.access?.[moduleKey]?.v !== false;
}

function initials(name){
  return name.split(" ").filter(Boolean).slice(0,2).map(w => w[0].toUpperCase()).join("");
}

function renderLayout(activeKey, pageTitle, pageSub){
  AUTH.requireAuth();
  const s = AUTH.session();
  if(!s) return;
  const rec = currentAdminRecord();

  const menuHtml = MENU
    .filter(m => m.key !== "admins" || rec.role === "Super Admin")
    .map(m => `
      <a href="${m.href}" class="side-link ${m.key === activeKey ? "active" : ""}">
        <i class="bi ${m.icon}"></i><span>${m.label}</span>
      </a>`).join("");

  document.getElementById("sidebarMount").innerHTML = `
    <aside class="sidebar" id="sidebarEl">
      <div class="side-brand">
        <img src="assets/img/white_logo.png" alt="Livinkey" height="34">
      </div>
      <nav class="side-nav">
        <div class="side-section-label">Management</div>
        ${menuHtml}
      </nav>
      <div class="side-footer d-flex align-items-center gap-2">
        <i class="bi bi-envelope-fill"></i> livinkey@gmail.com
      </div>
    </aside>
    <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
  `;

  document.getElementById("topbarMount").innerHTML = `
    <header class="topbar">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-icon sidebar-toggle" id="sidebarToggleBtn"><i class="bi bi-list"></i></button>
        <div>
          <p class="page-title mb-0">${pageTitle}</p>
          ${pageSub ? `<p class="page-sub mb-0">${pageSub}</p>` : ""}
        </div>
      </div>
      <div class="d-flex align-items-center gap-3">
        <div class="dropdown">
          <button class="btn btn-icon notif-btn" data-bs-toggle="dropdown">
            <i class="bi bi-bell-fill"></i>
            ${LK.notificationsCount > 0 ? `<span class="notif-dot">${LK.notificationsCount}</span>` : ""}
          </button>
          <div class="dropdown-menu dropdown-menu-end p-2" style="width:320px;">
            <p class="fw-bold px-2 mb-2" style="font-family:'Sora';">Notifications</p>
            <a class="dropdown-item rounded-3 py-2 mb-1" href="bills.html"><i class="bi bi-exclamation-circle text-danger me-2"></i>Sara Chen's payment is 9 days overdue</a>
            <a class="dropdown-item rounded-3 py-2 mb-1" href="bills.html"><i class="bi bi-cash-coin text-warning me-2"></i>Riya Kapoor's payment received</a>
            <a class="dropdown-item rounded-3 py-2" href="guests.html"><i class="bi bi-person-plus text-info me-2"></i>New guest registered: Ken Tanaka</a>
          </div>
        </div>
        <div class="dropdown">
          <div class="profile-trigger" data-bs-toggle="dropdown">
            <div class="text-end d-none d-sm-block">
              <div style="font-size:.85rem;font-weight:700;">${s.name}</div>
              <div style="font-size:.72rem;color:var(--muted);">${s.email}</div>
            </div>
            <div class="avatar-circle">${initials(s.name)}</div>
          </div>
          <div class="dropdown-menu dropdown-menu-end p-2">
            <div class="px-2 pb-2 mb-1 border-bottom">
              <div class="fw-bold">${s.name}</div>
              <div class="small text-muted-soft">${s.role}</div>
            </div>
            <button class="dropdown-item rounded-3 py-2 text-danger fw-semibold" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Log out</button>
          </div>
        </div>
      </div>
    </header>
  `;

  document.getElementById("logoutBtn").addEventListener("click", function(){
    const btn = this;
    LOADER.show(btn, 'Logging out...');
    setTimeout(() => {
      AUTH.logout();
    }, 400);
  });
  
  document.getElementById("sidebarToggleBtn")?.addEventListener("click", () => {
    document.getElementById("sidebarEl").classList.toggle("show");
    document.getElementById("sidebarBackdrop").classList.toggle("show");
  });
  document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
    document.getElementById("sidebarEl").classList.remove("show");
    document.getElementById("sidebarBackdrop").classList.remove("show");
  });
}

function fmtINR(n){
  return "₹" + Number(n).toLocaleString("en-IN");
}