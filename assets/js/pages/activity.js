document.addEventListener("DOMContentLoaded", () => {
    renderLayout("activity_logs", "Activity Tracking", "App adoption, user activity and admin audit trail");
    let users = [];
    let activeUser = null;
    let page = 1;
    const pageSize = 25;
    const timelineModal = new bootstrap.Modal(document.getElementById("timelineModal"));
    const messageModal = new bootstrap.Modal(document.getElementById("messageModal"));

    const canMessage=Permissions.hasPermission('activity_logs','message');
    const canExport=Permissions.hasPermission('activity_logs','export');
    if(!canExport) document.getElementById('exportBtn')?.classList.add('d-none');
    const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
    const date = v => v ? new Date(v).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}) : "—";

    async function loadPGs() {
        try {
            const r = await API.pgs.getAll();
            const select = document.getElementById("pgFilter");
            (r.data || []).forEach(pg => select.insertAdjacentHTML("beforeend", `<option value="${pg.id}">${esc(pg.name)}</option>`));
        } catch (_) {}
    }

    function params() {
        return {
            search: document.getElementById("searchInput").value.trim(),
            role: document.getElementById("roleFilter").value,
            pg_id: document.getElementById("pgFilter").value,
            module: document.getElementById("moduleFilter").value,
            action: document.getElementById("actionFilter").value,
            from: document.getElementById("fromDate").value,
            to: document.getElementById("toDate").value
        };
    }

    async function loadUsers() {
        const tbody=document.getElementById("usersTbody");
        tbody.innerHTML='<tr><td colspan="7" class="text-center py-5 text-muted-soft">Loading...</td></tr>';
        try {
            const r=await API.activityLogs.users(params());
            users=r.data||[];
            renderUsers();
        } catch(e) {
            tbody.innerHTML=`<tr><td colspan="7" class="text-center py-5 text-danger">${esc(e.message||"Failed to load activity")}</td></tr>`;
        }
    }

    function renderUsers() {
        const tbody=document.getElementById("usersTbody");
        const status=document.getElementById("statusFilter").value;
        let data=users.filter(u => !status || (status==="installed" ? !!u.installed : !u.installed));
        const totalPages=Math.max(1,Math.ceil(data.length/pageSize));
        if(page>totalPages) page=totalPages;
        const visible=data.slice((page-1)*pageSize,page*pageSize);
        document.getElementById("pageInfo").textContent=`Page ${page} of ${totalPages} · ${data.length} users`;
        document.getElementById("prevPage").disabled=page<=1;
        document.getElementById("nextPage").disabled=page>=totalPages;
        if(!data.length){tbody.innerHTML='<tr><td colspan="7" class="text-center py-5 text-muted-soft">No users found.</td></tr>';return;}
        tbody.innerHTML=visible.map(u=>`
          <tr>
            <td><div class="fw-semibold">${esc(u.full_name||"—")}</div><div class="small text-muted-soft">${esc(u.email||"")}</div></td>
            <td>${u.role==="guest"?"Guest":"Tenant"}</td>
            <td>${esc(u.pg_name||"—")}</td>
            <td>${u.installed ? '<span class="badge bg-success-subtle text-success">Installed</span>' : '<span class="badge bg-secondary-subtle text-secondary">Not Installed</span>'}</td>
            <td>${date(u.last_app_activity)}</td>
            <td><button class="btn btn-sm btn-outline-brand" onclick="openTimeline(${u.id},'${esc(u.full_name||"User")}','${u.role}')"><i class="bi bi-clock-history me-1"></i>Timeline</button></td>
            <td class="text-end">${canMessage
              ? `<button class="btn btn-sm btn-icon" title="Send Message" onclick="openMessage(${u.id},'${esc(u.full_name||"User")}')"><i class="bi bi-chat-left-text"></i></button>`
              : `<button class="btn btn-sm btn-icon" title="Message permission required" disabled><i class="bi bi-lock"></i></button>`}</td>
          </tr>`).join("");
    }

    async function loadStats() {
        try {
            const r=await API.activityLogs.stats(), d=r.data||{}, a=d.app_adoption||{}, l=d.last_30_days||{};
            const total=Number(a.total_tenants ?? a.total_users ?? 0), installed=Number(a.installed_tenants ?? a.installed_users ?? 0);
            document.getElementById("installedPct").textContent=total ? `${Math.round(installed/total*100)}%` : "0%";
            document.getElementById("installedCount").textContent=`${installed} of ${total} active users`;
            document.getElementById("activityCount").textContent=Number(l.total_activities||0).toLocaleString("en-IN");
            document.getElementById("profileCount").textContent=Number(l.active_profiles||0).toLocaleString("en-IN");
            const pgBody=document.getElementById("pgAdoptionTbody");
            pgBody.innerHTML=(d.per_pg||[]).length ? d.per_pg.map(pg=>{
                const total=Number(pg.total_users||0), installed=Number(pg.installed_users||0);
                return `<tr><td>${esc(pg.name||"—")}</td><td>${total}</td><td>${installed}</td><td>${total?Math.round(installed/total*100):0}%</td></tr>`;
            }).join("") : '<tr><td colspan="4" class="text-center text-muted-soft py-3">No PG data available.</td></tr>';
        } catch (_) {}
    }

    window.openTimeline=async function(id,name,role){
        document.getElementById("timelineTitle").textContent=name;
        document.getElementById("timelineMeta").textContent=role==="guest"?"Guest":"Tenant";
        document.getElementById("timelineBody").innerHTML='<div class="text-center py-4 text-muted-soft">Loading...</div>';
        timelineModal.show();
        try{
            const r=await API.activityLogs.list(role==="tenant"?{tenant_id:id,limit:100}:{guest_id:id,limit:100});
            const rows=r.data||[];
            document.getElementById("timelineBody").innerHTML=rows.length?rows.map(x=>`
              <div class="d-flex gap-3 pb-3 mb-3 border-bottom">
                <div class="rounded-circle bg-light d-flex align-items-center justify-content-center" style="width:38px;height:38px;flex:0 0 38px"><i class="bi bi-activity"></i></div>
                <div class="flex-grow-1"><div class="fw-semibold">${esc(x.action.replaceAll("_"," "))}</div><div class="small text-muted-soft">${esc(x.module)} · ${date(x.created_at)}</div>
                <div class="small mt-1">Done by <strong>${esc(x.actor_name||"System")}, ${esc(x.actor_position||"System")}</strong></div>
                ${x.metadata&&Object.keys(x.metadata).length?`<div class="small text-muted-soft mt-1">${esc(JSON.stringify(x.metadata))}</div>`:""}</div>
              </div>`).join(""):'<div class="text-center py-4 text-muted-soft">No activity recorded yet.</div>';
        }catch(e){document.getElementById("timelineBody").innerHTML=`<div class="text-danger">${esc(e.message)}</div>`;}
    };

    window.openMessage=function(id,name){
        activeUser=id;
        document.getElementById("messageRecipient").textContent=`— ${name}`;
        document.getElementById("messageForm").reset();
        messageModal.show();
    };

    document.getElementById("messageForm").addEventListener("submit",async e=>{
        e.preventDefault();
        const btn=e.target.querySelector("button[type=submit]");
        LOADER.show(btn,"Sending...");
        try{
            const r=await API.activityLogs.sendMessage(activeUser,document.getElementById("msgTitle").value,document.getElementById("msgBody").value,document.getElementById("msgSubject").value);
            showToast(r.message||"Message sent successfully.","success");
            messageModal.hide();
            loadUsers(); loadStats();
        }catch(err){showToast(err.message||"Failed to send message.","danger");}
        LOADER.hide(btn);
    });

    ["searchInput","roleFilter","pgFilter","moduleFilter","actionFilter","statusFilter","fromDate","toDate"].forEach(id=>document.getElementById(id)?.addEventListener(id==="searchInput"?"input":"change",()=>{page=1;loadUsers();}));
    document.getElementById("clearFilters")?.addEventListener("click",()=>{
        ["searchInput","fromDate","toDate"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
        ["roleFilter","pgFilter","moduleFilter","actionFilter","statusFilter"].forEach(id=>{const el=document.getElementById(id); if(el) el.value="";});
        page=1; loadUsers();
    });
    document.getElementById("prevPage").addEventListener("click",()=>{if(page>1){page--;renderUsers();}});
    document.getElementById("nextPage").addEventListener("click",()=>{page++;renderUsers();});
    document.getElementById("refreshBtn").addEventListener("click",()=>{loadUsers();loadStats();});
    document.getElementById("exportBtn").addEventListener("click",()=>API.activityLogs.export({...params(),app_status:document.getElementById("statusFilter").value,from:document.getElementById("fromDate").value,to:document.getElementById("toDate").value}));

    loadPGs(); loadUsers(); loadStats();
});