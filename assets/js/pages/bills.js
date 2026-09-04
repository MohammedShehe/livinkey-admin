// Livinkey Admin - Bills Management
// Full backend integration for bills management

document.addEventListener("DOMContentLoaded", () => {
    // ============================================================
    // FIX: Change page title/sub based on hash
    // ============================================================
    let pageTitle = "Bills";
    let pageSub = "Track rent status and manage collections across all tenants";
    
    if (window.location.hash === '#proofs') {
        pageTitle = "Payment Proofs";
        pageSub = "Verify and manage tenant payment submissions";
    }
    
    renderLayout("bills", pageTitle, pageSub);

    let activeTab = "unpaid";
    let activeSubTab = "bills"; // "bills" or "proofs"
    let billStats = {};
    let billData = [];
    let unpaidTenants = [];
    let currentBillId = null;
    let proofData = [];
    let selectedProofId = null;
    let currentProofFilter = "all";
    let allPgs = [];
    let selectedBillPgId = "all";
    let selectedProofPgId = "all";

    const canAddBills = Permissions.canAdd('bills');
    const canEditBills = Permissions.canEdit('bills');
    const canDeleteBills = Permissions.canDelete('bills');
    const canViewBills = Permissions.canView('bills');

    // ============================================
    // FETCH DATA
    // ============================================
    async function loadPgs() {
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                allPgs = res.data || [];
                populateBillPgFilter();
                populateProofPgFilter();
            }
        } catch (error) {
            console.error("Error loading PGs:", error);
        }
    }

    function populateBillPgFilter() {
        const select = document.getElementById("billPgFilter");
        if (!select) return;
        const current = select.value || "all";
        select.innerHTML = `<option value="all">All PGs</option>` +
            allPgs.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
        select.value = current;
    }

    function populateProofPgFilter() {
        const select = document.getElementById("proofPgFilter");
        if (!select) return;
        const current = select.value || "all";
        select.innerHTML = `<option value="all">All PGs</option>` +
            allPgs.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
        select.value = current;
    }

    async function loadData() {
        try {
            const params = {};
            const statsParams = {};
            if (selectedBillPgId && selectedBillPgId !== "all") {
                params.pg_id = selectedBillPgId;
                statsParams.pg_id = selectedBillPgId;
            }

            const [statsRes, billsRes, unpaidRes] = await Promise.all([
                API.bills.stats(statsParams),
                API.bills.getAll(params),
                API.bills.unpaidTenants()
            ]);
            
            if (statsRes.success) {
                billStats = statsRes.data || {};
            }
            if (billsRes.success) {
                billData = billsRes.data || [];
                window.LK_BILLS = billData;
            }
            if (unpaidRes.success) {
                unpaidTenants = unpaidRes.data || [];
                // Client-side PG filter for unpaid tenants list if present
                if (selectedBillPgId && selectedBillPgId !== "all") {
                    unpaidTenants = unpaidTenants.filter(t => String(t.pg_id) === String(selectedBillPgId));
                }
                window.LK_UNPAID_TENANTS = unpaidTenants;
            }
            
            renderStats();
            renderTabs();
            renderTable();
            renderActionButtons();
        } catch (error) {
            showToast("Error loading bills data: " + error.message, "danger");
        }
    }

    // ============================================
    // FETCH PROOFS DATA
    // ============================================
    async function loadProofs() {
        try {
            const params = {};
            const statsParams = {};
            if (currentProofFilter !== "all") params.status = currentProofFilter;
            if (selectedProofPgId && selectedProofPgId !== "all") {
                params.pg_id = selectedProofPgId;
                statsParams.pg_id = selectedProofPgId;
            }

            const [statsRes, proofsRes] = await Promise.all([
                API.bills.paymentProofs.stats(statsParams),
                API.bills.paymentProofs.getAll(params)
            ]);

            if (statsRes.success) {
                renderProofStats(statsRes.data);
            }

            if (proofsRes.success) {
                proofData = proofsRes.data || [];
                renderProofTable();
            }
        } catch (error) {
            showToast("Error loading payment proofs: " + error.message, "danger");
        }
    }

    // ============================================
    // RENDER BILL STATS
    // ============================================
    function renderStats() {
        const fmt = (n) => (typeof fmtINR === 'function' ? fmtINR(n || 0) : ('₹' + (parseFloat(n) || 0).toFixed(2)));
        const stats = [
            { 
                label: "Unpaid", 
                value: billStats.unpaid || 0, 
                icon: "bi-exclamation-circle", 
                color: "var(--danger)", 
                key: "unpaid" 
            },
            { 
                label: "Partially Paid", 
                value: billStats.partially_paid || 0, 
                icon: "bi-hourglass-split", 
                color: "var(--warning)", 
                key: "unfinished" 
            },
            { 
                label: "Paid", 
                value: billStats.paid || 0, 
                icon: "bi-check-circle", 
                color: "var(--success)", 
                key: "paid" 
            },
            { 
                label: "Delayed", 
                value: billStats.delayed || 0, 
                icon: "bi-alarm", 
                color: "var(--danger)", 
                key: "delayed" 
            },
            { 
                label: "Overdue", 
                value: billStats.overdue || 0, 
                icon: "bi-clock-history", 
                color: "var(--danger)", 
                key: "overdue" 
            },
            {
                label: "Total Paid",
                value: fmt(billStats.total_paid_amount),
                icon: "bi-currency-rupee",
                color: "var(--success)",
                key: "paid",
                isMoney: true
            },
            {
                label: "Total Due",
                value: fmt(billStats.total_due_amount),
                icon: "bi-wallet2",
                color: "var(--warning)",
                key: "unpaid",
                isMoney: true
            }
        ];
        
        document.getElementById("billStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg">
                <div class="stat-card hover-lift" onclick="switchTab('${s.key}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value${s.isMoney ? ' fs-6' : ''}">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    // ============================================
    // RENDER PROOF STATS
    // ============================================
    function renderProofStats(stats) {
        const fmt = (n) => (typeof fmtINR === 'function' ? fmtINR(n || 0) : ('₹' + (parseFloat(n) || 0).toFixed(2)));
        const statsHtml = [
            { label: "Total", value: stats.total || 0, icon: "bi-files", color: "var(--info)", filter: "all", sub: fmt(stats.total_amount) },
            { label: "Pending", value: stats.pending || 0, icon: "bi-clock-history", color: "var(--warning)", filter: "pending", sub: fmt(stats.pending_amount) },
            { label: "Verified", value: stats.verified || 0, icon: "bi-check-circle", color: "var(--success)", filter: "verified", sub: fmt(stats.verified_amount) },
            { label: "Rejected", value: stats.rejected || 0, icon: "bi-x-circle", color: "var(--danger)", filter: "rejected", sub: fmt(stats.rejected_amount) }
        ];

        const container = document.getElementById("proofStats");
        if (!container) return;
        
        container.innerHTML = statsHtml.map(s => `
            <div class="col-6 col-md-3">
                <div class="stat-card hover-lift ${currentProofFilter === s.filter ? 'active' : ''}" onclick="filterProofsByStatus('${s.filter}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div>
                        <div class="stat-value">${s.value}</div>
                        <div class="stat-label">${s.label}</div>
                        ${s.sub ? `<div class="small text-muted-soft mt-1">${s.sub}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join("");
    }

    window.filterProofsByStatus = function(filter) {
        currentProofFilter = filter;
        loadProofs();
    };

    window.switchTab = function(tab) {
        activeTab = tab;
        renderTabs();
        renderTable();
    };

    // ============================================
    // RENDER TABS
    // ============================================
    function renderTabs() {
        const tabs = [
            { key: "unpaid", label: "Unpaid" },
            { key: "unfinished", label: "Partially Paid" },
            { key: "paid", label: "Paid" },
            { key: "delayed", label: "Delayed" },
            { key: "overdue", label: "Overdue" }
        ];
        
        document.getElementById("billTabs").innerHTML = tabs.map(t => `
            <button class="filter-pill ${activeTab === t.key ? "active" : ""}" onclick="switchTab('${t.key}')">${t.label}</button>
        `).join("");
    }

    // ============================================
    // RENDER BILL TABLE
    // ============================================
    function renderTable() {
        let filtered = billData;
        
        if (activeTab === "unpaid") {
            filtered = billData.filter(b => b.status === 'unpaid');
        } else if (activeTab === "unfinished") {
            filtered = billData.filter(b => b.status === 'partially_paid');
        } else if (activeTab === "paid") {
            filtered = billData.filter(b => b.status === 'paid');
        } else if (activeTab === "delayed") {
            filtered = billData.filter(b => b.status === 'delayed');
        } else if (activeTab === "overdue") {
            filtered = billData.filter(b => b.status === 'overdue' || b.status === 'delayed');
        }
        
        const wrap = document.getElementById("billTableWrap");
        const empty = document.getElementById("billEmpty");
        
        if (filtered.length === 0) {
            wrap.innerHTML = '';
            empty.classList.remove("d-none");
            return;
        }
        empty.classList.add("d-none");
        
        wrap.innerHTML = `
        <table class="data-table">
            <thead><tr>
                <th>Tenant</th>
                <th>Period</th>
                <th>PG</th>
                <th>Room</th>
                <th>Total Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Status</th>
                <th>Valid Until</th>
                <th class="text-end">Actions</th>
            </tr></thead>
            <tbody>
                ${filtered.map(b => `
                <tr>
                    <td>
                        <span class="name-link" onclick="openBillDetail('${b.id}')">${b.tenant_name || '—'}</span>
                        <div class="small text-muted-soft">${b.tenant_email || '—'}</div>
                    </td>
                    <td>${b.billing_month || '—'}</td>
                    <td>${b.pg_name || '—'}</td>
                    <td>${b.room_number || '—'}</td>
                    <td>${fmtINR(b.total_amount || 0)}</td>
                    <td>${fmtINR(b.paid_amount || 0)}</td>
                    <td>${fmtINR((b.due_amount || 0) > 0 ? b.due_amount : 0)}</td>
                    <td>${getStatusBadge(b.status)}</td>
                    <td>${b.valid_until ? formatDate(b.valid_until) : '—'}</td>
                    <td class="text-end">
                        <button class="btn-icon me-1" title="View" onclick="openBillDetail('${b.id}')"><i class="bi bi-eye"></i></button>
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon me-1" title="Edit Bill" onclick="openEditBill('${b.id}')"><i class="bi bi-pencil"></i></button>` : ''}
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon me-1" title="Cash Payment" onclick="openCashPayment('${b.id}')"><i class="bi bi-cash"></i></button>` : ''}
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon me-1" title="Adjust Fine" onclick="openFineAdjust('${b.id}')"><i class="bi bi-coin"></i></button>` : ''}
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon me-1" title="Send Message" onclick="openCustomMessage('${b.id}')"><i class="bi bi-chat-dots"></i></button>` : ''}
                        ${canDeleteBills && b.status !== 'paid' && !(parseFloat(b.paid_amount) > 0) ? `<button class="btn-icon" title="Delete Bill" onclick="deleteBill('${b.id}')" style="color:var(--danger);"><i class="bi bi-trash"></i></button>` : ''}
                    </td>
                </tr>
                `).join("")}
            </tbody>
        </table>`;
    }

    // ============================================
    // MODAL DECLARATIONS
    // ============================================
    const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));
    const cashModal = new bootstrap.Modal(document.getElementById("cashPaymentModal"));
    const messageModal = new bootstrap.Modal(document.getElementById("customMessageModal"));
    const createBillModal = new bootstrap.Modal(document.getElementById("createBillModal"));
    const proofPreviewModal = new bootstrap.Modal(document.getElementById("proofPreviewModal"));
    const fineAdjustModal = new bootstrap.Modal(document.getElementById("fineAdjustModal"));

    // ============================================
    // RENDER PROOF TABLE
    // ============================================
    function renderProofTable() {
        const tbody = document.getElementById("proofsTbody");
        const empty = document.getElementById("proofsEmpty");

        if (!tbody) return;

        if (proofData.length === 0) {
            tbody.innerHTML = '';
            empty.classList.remove("d-none");
            return;
        }
        empty.classList.add("d-none");

        tbody.innerHTML = proofData.map(p => {
            const statusColors = {
                pending: 'status-pending',
                verified: 'status-success',
                rejected: 'status-failed'
            };
            const statusLabels = {
                pending: '⏳ Pending',
                verified: '✅ Verified',
                rejected: '❌ Rejected'
            };

            const isPending = p.status === 'pending';
            const isVerified = p.status === 'verified';
            
            // Check if bill exists (bill_total will be 0 or null if bill was deleted)
            const billExists = p.bill_total !== null && p.bill_total !== undefined;
            const billTotalDisplay = billExists ? `₹${(p.bill_total || 0).toLocaleString('en-IN')}` : 'Bill deleted';
            const billTotalClass = billExists ? '' : 'text-muted-soft';

            return `
                <tr>
                    <td>
                        <span class="fw-semibold">${p.tenant_name || '—'}</span>
                        <div class="small text-muted-soft">${p.tenant_email || '—'}</div>
                    </td>
                    <td>${p.pg_name || '—'}</td>
                    <td>${p.room_number || '—'}</td>
                    <td>
                        <span class="fw-semibold">₹${(p.amount_paid || 0).toLocaleString('en-IN')}</span>
                        <div class="small ${billTotalClass}">of ${billTotalDisplay}</div>
                    </td>
                    <td>
                        <code class="small">${p.transaction_id || '—'}</code>
                    </td>
                    <td>
                        ${p.proof_url ? `<img src="${p.proof_url}" alt="Proof" style="width:50px;height:40px;object-fit:cover;border-radius:4px;cursor:pointer;" onclick="previewProof('${p.id}')">` : '—'}
                    </td>
                    <td>
                        <span class="status-badge ${statusColors[p.status] || 'status-pending'}">${statusLabels[p.status] || p.status}</span>
                    </td>
                    <td>${p.created_at ? formatDate(p.created_at) : '—'}</td>
                    <td class="text-end">
                        ${isPending && canEditBills ? `
                            <button class="btn-icon me-1" title="Verify" onclick="previewProof('${p.id}')" style="color:var(--success);border-color:var(--success);">
                                <i class="bi bi-check-lg"></i>
                            </button>
                            <button class="btn-icon me-1" title="Reject" onclick="rejectProof('${p.id}')" style="color:var(--danger);border-color:var(--danger);">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        ` : ''}
                        ${!isPending && canEditBills ? `
                            <button class="btn-icon me-1" title="Delete" onclick="deleteProof('${p.id}')" style="color:var(--danger);">
                                <i class="bi bi-trash3"></i>
                            </button>
                        ` : ''}
                        <button class="btn-icon" title="View Proof" onclick="previewProof('${p.id}')">
                            <i class="bi bi-eye"></i>
                        </button>
                    </td>
                </tr>`;
        }).join("");
    }

    // ============================================
    // PROOF PREVIEW
    // ============================================
    window.previewProof = async function(id) {
        try {
            const res = await API.bills.paymentProofs.getById(id);
            if (!res.success || !res.data) {
                showToast("Proof not found.", "danger");
                return;
            }

            const p = res.data;
            selectedProofId = id;

            // Check if bill exists
            const billExists = p.bill_total !== null && p.bill_total !== undefined;
            const billTotalDisplay = billExists ? `₹${(p.bill_total || 0).toLocaleString('en-IN')}` : 'Bill deleted';
            const billTotalClass = billExists ? '' : 'text-muted-soft';

            document.getElementById("proofPreviewTitle").textContent = 
                `Payment Proof - ${p.tenant_name || 'Tenant'}`;
            document.getElementById("proofPreviewImage").src = p.proof_url || '';

            const details = document.getElementById("proofPreviewDetails");
            details.innerHTML = `
                <div class="row g-3">
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">Tenant</div>
                        <div>${p.tenant_name || '—'}</div>
                        <div class="small text-muted-soft">${p.tenant_email || '—'}</div>
                    </div>
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">PG / Room</div>
                        <div>${p.pg_name || '—'} / ${p.room_number || '—'}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="fw-bold small text-muted-soft">Amount Paid</div>
                        <div class="fw-bold">₹${(p.amount_paid || 0).toLocaleString('en-IN')}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="fw-bold small text-muted-soft">Bill Total</div>
                        <div class="${billTotalClass}">${billTotalDisplay}</div>
                    </div>
                    <div class="col-md-4">
                        <div class="fw-bold small text-muted-soft">Status</div>
                        <div><span class="status-badge ${p.status === 'pending' ? 'status-pending' : p.status === 'verified' ? 'status-success' : 'status-failed'}">${p.status || '—'}</span></div>
                    </div>
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">Transaction ID</div>
                        <div><code>${p.transaction_id || '—'}</code></div>
                    </div>
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">Submitted</div>
                        <div>${p.created_at ? formatDateTime(p.created_at) : '—'}</div>
                    </div>
                    ${p.verified_by_name ? `
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">Verified By</div>
                        <div>${p.verified_by_name}</div>
                    </div>
                    ` : ''}
                    ${p.verified_at ? `
                    <div class="col-md-6">
                        <div class="fw-bold small text-muted-soft">Verified At</div>
                        <div>${formatDateTime(p.verified_at)}</div>
                    </div>
                    ` : ''}
                    ${p.admin_notes ? `
                    <div class="col-12">
                        <div class="fw-bold small text-muted-soft">Admin Notes</div>
                        <div class="border rounded-3 p-2 bg-light">${p.admin_notes}</div>
                    </div>
                    ` : ''}
                    ${!billExists ? `
                    <div class="col-12">
                        <div class="alert alert-warning py-2 small">
                            <i class="bi bi-exclamation-triangle me-1"></i>
                            The bill associated with this payment proof has been deleted.
                            ${p.status === 'pending' ? 'This proof cannot be verified.' : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>
            `;

            const verifyBtn = document.getElementById("proofVerifyBtn");
            const rejectBtn = document.getElementById("proofRejectBtn");
            const deleteBtn = document.getElementById("proofDeleteBtn");
            const notesInput = document.getElementById("proofAdminNotes");
            
            // Show paid_from and paid_till fields for verification
            const dateFieldsContainer = document.getElementById("proofDateFieldsContainer");
            if (dateFieldsContainer) {
                if (p.status === 'pending' && canEditBills && billExists) {
                    dateFieldsContainer.style.display = 'block';
                    // Pre-fill with existing values or default to current month
                    if (!document.getElementById("proofPaidFrom").value) {
                        const today = new Date();
                        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                        document.getElementById("proofPaidFrom").value = firstDay.toISOString().split('T')[0];
                    }
                    if (!document.getElementById("proofPaidTill").value) {
                        const today = new Date();
                        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        document.getElementById("proofPaidTill").value = lastDay.toISOString().split('T')[0];
                    }
                } else {
                    dateFieldsContainer.style.display = 'none';
                }
            }

            // Only allow verification if bill exists
            if (p.status === 'pending' && canEditBills && billExists) {
                verifyBtn.style.display = '';
                rejectBtn.style.display = '';
                deleteBtn.style.display = 'none';
                notesInput.style.display = '';
            } else if (p.status === 'pending' && canEditBills && !billExists) {
                // Bill was deleted - cannot verify, only reject or delete
                verifyBtn.style.display = 'none';
                rejectBtn.style.display = '';
                deleteBtn.style.display = 'none';
                notesInput.style.display = '';
            } else {
                verifyBtn.style.display = 'none';
                rejectBtn.style.display = 'none';
                deleteBtn.style.display = canEditBills ? '' : 'none';
                notesInput.style.display = 'none';
            }

            proofPreviewModal.show();
        } catch (error) {
            showToast("Error loading proof: " + error.message, "danger");
        }
    };

    function renderActionButtons() {
        const createBtn = document.querySelector('.btn-fab[data-bs-target="#createBillModal"]');
        if (createBtn) {
            createBtn.style.display = canAddBills ? '' : 'none';
        }
    }

    // ============================================
    // BILL DETAIL
    // ============================================
    window.openBillDetail = async function(id) {
        try {
            const res = await API.bills.getById(id);
            if (!res.success || !res.data) {
                showToast("Bill not found.", "danger");
                return;
            }
            const b = res.data;
            currentBillId = id;
            
            document.getElementById("detailName").textContent = `Bill #${b.id} - ${b.tenant_name || 'Tenant'}`;
            
            const totalAmount = parseFloat(b.total_amount) || 0;
            const paidAmount = parseFloat(b.paid_amount) || 0;
            const fineAmount = parseFloat(b.fine_amount) || 0;
            const cashPaid = parseFloat(b.total_cash_paid) || 0;
            const totalDue = totalAmount + fineAmount - paidAmount - cashPaid;
            
            let bodyHtml = `
            <div class="row g-2 small">
                <div class="col-6"><span class="text-muted-soft">PG:</span> <strong>${b.pg_name || '—'}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Room:</span> <strong>${b.room_number || '—'}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Rent:</span> <strong>${fmtINR(parseFloat(b.rent_amount) || 0)}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Electricity:</span> <strong>${fmtINR(parseFloat(b.electricity_amount) || 0)}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Maintenance:</span> <strong>${fmtINR(parseFloat(b.maintenance_amount) || 0)}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Other Charges:</span> <strong>${fmtINR(parseFloat(b.other_charges) || 0)}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Fine:</span> <strong class="text-danger">${fmtINR(fineAmount)}</strong></div>
                <div class="col-6"><span class="text-muted-soft">Total:</span> <strong>${fmtINR(totalAmount)}</strong></div>
                <div class="col-12"><hr></div>
                <div class="col-4"><span class="text-muted-soft">Paid (Online):</span> <strong>${fmtINR(paidAmount)}</strong></div>
                <div class="col-4"><span class="text-muted-soft">Paid (Cash):</span> <strong>${fmtINR(cashPaid)}</strong></div>
                <div class="col-4"><span class="text-muted-soft">Due:</span> <strong class="${totalDue > 0 ? 'text-danger' : 'text-success'}">${fmtINR(totalDue)}</strong></div>
                <div class="col-12"><span class="text-muted-soft">Status:</span> ${getStatusBadge(b.status)}</div>
                <div class="col-12"><span class="text-muted-soft">Valid Until:</span> <strong>${b.valid_until ? formatDateTime(b.valid_until) : '—'}</strong></div>
                <div class="col-12"><span class="text-muted-soft">QR Status:</span> <span class="chip ${b.qr_status === 'active' ? 'chip-green' : 'chip-gray'}">${b.qr_status || 'N/A'}</span></div>
                ${b.billing_month ? `<div class="col-6"><span class="text-muted-soft">Billing Month:</span> <strong>${b.billing_month}</strong></div>` : ''}
                ${(b.electricity_meter_image || b.electricity_meter_image_2) ? `<div class="col-12"><span class="text-muted-soft">Meter Image${(b.electricity_meter_image && b.electricity_meter_image_2) ? 's' : ''}:</span> ${b.electricity_meter_image ? `<a href="${b.electricity_meter_image}" target="_blank" class="text-brand">View 1</a>` : ''}${(b.electricity_meter_image && b.electricity_meter_image_2) ? ' | ' : ''}${b.electricity_meter_image_2 ? `<a href="${b.electricity_meter_image_2}" target="_blank" class="text-brand">View 2</a>` : ''}</div>` : ''}
                ${b.payment_qr ? `<div class="col-12"><span class="text-muted-soft">Payment QR:</span> <img src="${b.payment_qr}" style="height:60px;width:60px;object-fit:contain;border:1px solid var(--border);border-radius:4px;"></div>` : ''}
                ${b.admin_qr ? `<div class="col-12"><span class="text-muted-soft">Admin QR:</span> <img src="${b.admin_qr}" style="height:60px;width:60px;object-fit:contain;border:1px solid var(--border);border-radius:4px;"></div>` : ''}
            </div>`;
            
            document.getElementById("detailBody").innerHTML = bodyHtml;
            document.getElementById("detailMessageWrap").classList.add("d-none");
            
            let footerButtons = `
                <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
            `;

            if (canEditBills && b.status !== 'paid') {
                footerButtons += `
                    <button class="btn btn-outline-brand" onclick="openEditBill('${b.id}')"><i class="bi bi-pencil me-1"></i>Edit</button>
                `;
            }
            
            if (canEditBills && totalDue > 0 && b.status !== 'paid') {
                footerButtons += `
                    <button class="btn btn-outline-warning" onclick="openCashPayment('${b.id}')"><i class="bi bi-cash me-1"></i>Cash Payment</button>
                `;
            }
            
            if (canEditBills && b.status !== 'paid') {
                footerButtons += `
                    <button class="btn btn-outline-brand" onclick="openCustomMessage('${b.id}')"><i class="bi bi-chat-dots me-1"></i>Message</button>
                `;
            }

            if (canDeleteBills && b.status !== 'paid' && !(parseFloat(b.paid_amount) > 0)) {
                footerButtons += `
                    <button class="btn btn-outline-danger" onclick="deleteBill('${b.id}')"><i class="bi bi-trash me-1"></i>Delete</button>
                `;
            }

            // Show fine adjustment button if fine exists
            if (canEditBills && b.status !== 'paid' && fineAmount > 0) {
                footerButtons += `
                    <button class="btn btn-outline-danger" onclick="openFineAdjust('${b.id}')"><i class="bi bi-coin me-1"></i>Adjust Fine</button>
                `;
            }
            
            document.getElementById("detailFooter").innerHTML = footerButtons;
            
            // Load fine adjustment history
            await showFineAdjustmentHistory(id);
            
            detailModal.show();
        } catch (error) {
            showToast("Error loading bill: " + error.message, "danger");
        }
    };

    // ============================================
    // CASH PAYMENT
    // ============================================
    function resetCashOtpBoxes() {
        document.querySelectorAll('.cash-otp-box').forEach(b => b.value = '');
    }

    function getCashOtpValue() {
        return Array.from(document.querySelectorAll('.cash-otp-box')).map(b => b.value).join('');
    }

    (function wireCashOtpBoxes() {
        const boxes = Array.from(document.querySelectorAll('.cash-otp-box'));
        boxes.forEach((box, i) => {
            box.addEventListener('input', () => {
                box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
                if (box.value && boxes[i + 1]) boxes[i + 1].focus();
            });
            box.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !box.value && boxes[i - 1]) boxes[i - 1].focus();
            });
        });
    })();

    window.openCashPayment = function(billId) {
        if (!canEditBills) {
            showToast("You don't have permission to process cash payments.", "warning");
            return;
        }
        document.getElementById("cashBillId").value = billId;
        document.getElementById("cashPaymentForm").reset();
        document.getElementById("cashOtpSection").classList.add("d-none");
        resetCashOtpBoxes();

        // Set default dates
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        document.getElementById("cashPaidFrom").value = firstDay.toISOString().split('T')[0];
        document.getElementById("cashPaidTill").value = lastDay.toISOString().split('T')[0];

        const otpBtn = document.getElementById("requestCashOtpBtn");
        const verifyBtn = document.getElementById("verifyCashBtn");
        if (otpBtn) {
            otpBtn.innerHTML = '<i class="bi bi-envelope me-1"></i>Request OTP';
            otpBtn.disabled = false;
            otpBtn.classList.remove('d-none');
        }
        if (verifyBtn) {
            verifyBtn.classList.add('d-none');
        }
        cashModal.show();
    };

    document.getElementById("requestCashOtpBtn")?.addEventListener("click", async function() {
        const billId = document.getElementById("cashBillId").value;
        const amount = parseFloat(document.getElementById("cashAmount").value);
        const paidFrom = document.getElementById("cashPaidFrom").value;
        const paidTill = document.getElementById("cashPaidTill").value;
        const notes = document.getElementById("cashNotes").value;

        if (!amount || amount <= 0) {
            showToast("Please enter a valid amount.", "warning");
            return;
        }
        if (!paidFrom || !paidTill) {
            showToast("Please select paid from and paid till dates.", "warning");
            return;
        }

        const btn = this;
        const originalText = btn.innerHTML;
        LOADER.show(btn, 'Requesting OTP...');

        try {
            const res = await API.bills.requestCashOTP(billId, {
                amount: amount,
                paid_from: paidFrom,
                paid_till: paidTill,
                notes: notes
            });

            if (res.success) {
                showToast(res.message || "OTP sent to tenant's email.", "success");
                document.getElementById("cashOtpSection").classList.remove("d-none");
                resetCashOtpBoxes();

                btn.classList.add('d-none');
                const verifyBtn = document.getElementById("verifyCashBtn");
                if (verifyBtn) verifyBtn.classList.remove('d-none');

                const firstBox = document.querySelector('.cash-otp-box');
                if (firstBox) firstBox.focus();
            } else {
                showToast(res.message || "Failed to request OTP.", "danger");
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
        btn.innerHTML = originalText;
    });

    document.getElementById("verifyCashBtn")?.addEventListener("click", async function() {
        const billId = document.getElementById("cashBillId").value;
        const otp = getCashOtpValue();
        const amount = parseFloat(document.getElementById("cashAmount").value);
        const paidFrom = document.getElementById("cashPaidFrom").value;
        const paidTill = document.getElementById("cashPaidTill").value;
        const notes = document.getElementById("cashNotes").value;

        if (!otp || otp.length !== 4) {
            showToast("Please enter the 4-digit OTP.", "warning");
            return;
        }

        const btn = this;
        const originalText = btn.innerHTML;
        LOADER.show(btn, 'Verifying...');

        try {
            const res = await API.bills.verifyCash(billId, {
                otp: otp,
                amount: amount,
                paid_from: paidFrom,
                paid_till: paidTill,
                notes: notes
            });

            if (res.success) {
                showToast(res.message || "Cash payment verified successfully.", "success");
                cashModal.hide();
                loadData();
            } else {
                showToast(res.message || "Failed to verify cash payment.", "danger");
                resetCashOtpBoxes();
                const firstBox = document.querySelector('.cash-otp-box');
                if (firstBox) firstBox.focus();
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
        btn.innerHTML = originalText;
    });

    // ============================================
    // VERIFY PROOF
    // ============================================
    window.verifyProof = async function(id, admin_notes = null) {
        if (!canEditBills) {
            showToast("You don't have permission to verify payment proofs.", "warning");
            return;
        }

        // Get paid_from and paid_till from the form
        const paidFrom = document.getElementById("proofPaidFrom")?.value;
        const paidTill = document.getElementById("proofPaidTill")?.value;

        if (!paidFrom || !paidTill) {
            showToast("Please select both Payment Start Date and Payment End Date.", "warning");
            return;
        }

        if (id === selectedProofId) {
            const notesInput = document.getElementById("proofAdminNotes");
            admin_notes = notesInput?.value || null;
        }

        if (!confirm("Verify this payment proof? This will update the bill status.")) {
            return;
        }

        const btn = document.querySelector('.btn-verify-proof');
        if (btn) LOADER.show(btn, 'Verifying...');

        try {
            const res = await API.bills.paymentProofs.verify(id, {
                admin_notes: admin_notes,
                paid_from: paidFrom,
                paid_till: paidTill
            });
            if (res.success) {
                showToast(res.message || "Payment proof verified successfully.", "success");
                proofPreviewModal.hide();
                loadProofs();
                loadData();
            } else {
                showToast(res.message || "Failed to verify payment proof.", "danger");
            }
        } catch (error) {
            showToast("Error verifying proof: " + error.message, "danger");
        }
        if (btn) LOADER.hide(btn);
    };

    // ============================================
    // REJECT PROOF
    // ============================================
    window.rejectProof = async function(id) {
        if (!canEditBills) {
            showToast("You don't have permission to reject payment proofs.", "warning");
            return;
        }

        const notes = prompt("Please provide a reason for rejection (optional):");
        if (notes === null) return;

        if (!confirm("Reject this payment proof?")) {
            return;
        }

        try {
            const res = await API.bills.paymentProofs.reject(id, notes || null);
            if (res.success) {
                showToast(res.message || "Payment proof rejected successfully.", "success");
                proofPreviewModal.hide();
                loadProofs();
            } else {
                showToast(res.message || "Failed to reject payment proof.", "danger");
            }
        } catch (error) {
            showToast("Error rejecting proof: " + error.message, "danger");
        }
    };

    // ============================================
    // DELETE PROOF
    // ============================================
    window.deleteProof = async function(id) {
        if (!canDeleteBills) {
            showToast("You don't have permission to delete payment proofs.", "warning");
            return;
        }

        if (!confirm("Delete this payment proof permanently? This action cannot be undone.")) {
            return;
        }

        try {
            const res = await API.bills.paymentProofs.delete(id);
            if (res.success) {
                showToast(res.message || "Payment proof deleted successfully.", "success");
                proofPreviewModal.hide();
                loadProofs();
            } else {
                showToast(res.message || "Failed to delete payment proof.", "danger");
            }
        } catch (error) {
            showToast("Error deleting proof: " + error.message, "danger");
        }
    };

    // ============================================
    // PROOF PREVIEW MODAL ACTION BUTTONS
    // ============================================
    document.getElementById("proofVerifyBtn")?.addEventListener("click", function() {
        if (selectedProofId) {
            verifyProof(selectedProofId);
        }
    });

    document.getElementById("proofRejectBtn")?.addEventListener("click", function() {
        if (selectedProofId) {
            rejectProof(selectedProofId);
        }
    });

    document.getElementById("proofDeleteBtn")?.addEventListener("click", function() {
        if (selectedProofId) {
            deleteProof(selectedProofId);
        }
    });

    // ============================================
    // CUSTOM MESSAGE
    // ============================================
    let messageFile = null;

    window.openCustomMessage = function(billId) {
        if (!canEditBills) {
            showToast("You don't have permission to send custom messages.", "warning");
            return;
        }
        document.getElementById("messageBillId").value = billId;
        document.getElementById("customMessageForm").reset();
        messageFile = null;
        document.getElementById("messageAttachmentStatus").textContent = "No file attached";
        messageModal.show();
    };

    document.getElementById("messageAttachBtn")?.addEventListener("click", () => {
        document.getElementById("messageAttachInput").click();
    });

    document.getElementById("messageAttachInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            messageFile = this.files[0];
            document.getElementById("messageAttachmentStatus").innerHTML = `<i class="bi bi-paperclip me-1"></i> ${messageFile.name}`;
        }
    });

    document.getElementById("customMessageForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        LOADER.show(btn, 'Sending...');

        try {
            const billId = document.getElementById("messageBillId").value;
            const subject = document.getElementById("messageSubject").value;
            const message = document.getElementById("messageText").value;

            if (!subject || !message) {
                showToast("Please enter both subject and message.", "warning");
                LOADER.hide(btn);
                btn.innerHTML = originalText;
                return;
            }

            const res = await API.bills.sendCustomMessage(billId, subject, message, messageFile);

            if (res.success) {
                showToast(res.message || "Custom message sent successfully.", "success");
                messageModal.hide();
                loadData();
            } else {
                showToast(res.message || "Failed to send message.", "danger");
            }
        } catch (error) {
            showToast(error.message || "An error occurred.", "danger");
        }
        LOADER.hide(btn);
        btn.innerHTML = originalText;
    });


    // ============================================
    // EDIT / DELETE BILL
    // ============================================
    let editMeterImageFiles = [];
    let editBillAttachment = null;
    const editBillModal = document.getElementById("editBillModal")
        ? new bootstrap.Modal(document.getElementById("editBillModal"))
        : null;

    window.openEditBill = async function(billId) {
        if (!canEditBills) {
            showToast("You don't have permission to edit bills.", "warning");
            return;
        }
        try {
            const res = await API.bills.getById(billId);
            if (!res.success || !res.data) {
                showToast("Bill not found.", "danger");
                return;
            }
            const b = res.data;
            if (b.status === 'paid') {
                showToast("Fully paid bills cannot be edited.", "warning");
                return;
            }
            document.getElementById("editBillId").value = b.id;
            document.getElementById("editBillTenantLabel").textContent =
                `${b.tenant_name || 'Tenant'} — ${b.pg_name || ''} Room ${b.room_number || ''}`;
            document.getElementById("editBillRent").value = b.rent_amount || 0;
            document.getElementById("editBillElectricity").value = b.electricity_amount || 0;
            document.getElementById("editBillMaintenance").value = b.maintenance_amount || 0;
            document.getElementById("editBillOther").value = b.other_charges || 0;
            editMeterImageFiles = [];
            editBillAttachment = null;
            document.getElementById("editMeterUploadStatus").textContent = "No new image selected";
            document.getElementById("editMeterPreview").innerHTML = "";
            document.getElementById("editMeterPreview").classList.add("d-none");
            document.getElementById("editMeterUploadInput").value = "";
            document.getElementById("editBillAttachmentStatus").textContent = "No new file attached";
            document.getElementById("editBillAttachInput").value = "";
            const c1 = document.getElementById("editClearMeter1");
            const c2 = document.getElementById("editClearMeter2");
            if (c1) c1.checked = false;
            if (c2) c2.checked = false;
            // show existing meter links
            const existing = document.getElementById("editExistingMeters");
            let links = [];
            if (b.electricity_meter_image) links.push(`<a href="${b.electricity_meter_image}" target="_blank" class="text-brand">Meter 1</a>`);
            if (b.electricity_meter_image_2) links.push(`<a href="${b.electricity_meter_image_2}" target="_blank" class="text-brand">Meter 2</a>`);
            existing.innerHTML = links.length
                ? `<span class="text-muted-soft small">Current: ${links.join(' | ')} (upload to replace)</span>`
                : `<span class="text-muted-soft small">No meter images currently attached</span>`;
            calculateEditTotal();
            editBillModal?.show();
        } catch (error) {
            showToast("Error loading bill: " + error.message, "danger");
        }
    };

    function calculateEditTotal() {
        const rent = Number(document.getElementById("editBillRent")?.value || 0);
        const elec = Number(document.getElementById("editBillElectricity")?.value || 0);
        const maint = Number(document.getElementById("editBillMaintenance")?.value || 0);
        const other = Number(document.getElementById("editBillOther")?.value || 0);
        const el = document.getElementById("editBillTotalDisplay");
        if (el) el.textContent = fmtINR(rent + elec + maint + other);
    }

    ["editBillRent", "editBillElectricity", "editBillMaintenance", "editBillOther"].forEach(id => {
        document.getElementById(id)?.addEventListener("input", calculateEditTotal);
    });

    document.getElementById("editMeterUploadBtn")?.addEventListener("click", () => {
        document.getElementById("editMeterUploadInput").click();
    });

    document.getElementById("editMeterUploadInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            const selected = Array.from(this.files).slice(0, 2);
            editMeterImageFiles = editMeterImageFiles.concat(selected).slice(0, 2);
            const previewEl = document.getElementById("editMeterPreview");
            previewEl.innerHTML = "";
            previewEl.classList.remove("d-none");
            document.getElementById("editMeterUploadStatus").innerHTML =
                `<i class="bi bi-check-circle-fill text-success me-1"></i> ${editMeterImageFiles.length} new image(s)`;
            editMeterImageFiles.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const wrap = document.createElement("div");
                    wrap.className = "d-inline-flex align-items-start gap-1";
                    wrap.innerHTML = `
                        <img src="${e.target.result}" alt="Meter ${index + 1}" style="max-width:160px;max-height:120px;border-radius:8px;border:1px solid var(--border);">
                        <button type="button" class="btn btn-sm btn-outline-danger" data-idx="${index}"><i class="bi bi-x"></i></button>`;
                    wrap.querySelector("button").addEventListener("click", function() {
                        editMeterImageFiles.splice(parseInt(this.getAttribute("data-idx"), 10), 1);
                        document.getElementById("editMeterUploadInput").dispatchEvent(new Event("change"));
                        if (editMeterImageFiles.length === 0) {
                            previewEl.innerHTML = "";
                            previewEl.classList.add("d-none");
                            document.getElementById("editMeterUploadStatus").textContent = "No new image selected";
                        }
                    });
                    previewEl.appendChild(wrap);
                };
                reader.readAsDataURL(file);
            });
            this.value = "";
        }
    });

    document.getElementById("editBillAttachBtn")?.addEventListener("click", () => {
        document.getElementById("editBillAttachInput").click();
    });
    document.getElementById("editBillAttachInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            editBillAttachment = this.files[0];
            document.getElementById("editBillAttachmentStatus").innerHTML =
                `<i class="bi bi-paperclip me-1"></i> ${editBillAttachment.name}`;
        }
    });

    document.getElementById("editBillForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        LOADER.show(btn, 'Saving...');
        try {
            const billId = document.getElementById("editBillId").value;
            const data = {
                rent_amount: Number(document.getElementById("editBillRent").value || 0),
                electricity_amount: Number(document.getElementById("editBillElectricity").value || 0),
                maintenance_amount: Number(document.getElementById("editBillMaintenance").value || 0),
                other_charges: Number(document.getElementById("editBillOther").value || 0),
                clear_meter_1: document.getElementById("editClearMeter1")?.checked ? '1' : '0',
                clear_meter_2: document.getElementById("editClearMeter2")?.checked ? '1' : '0'
            };
            if (data.rent_amount < 0) {
                showToast("Rent cannot be negative.", "warning");
                LOADER.hide(btn); btn.innerHTML = originalText; return;
            }
            const files = {};
            if (editMeterImageFiles.length > 0) files.meterImage = editMeterImageFiles;
            if (editBillAttachment) files.paymentQr = editBillAttachment;
            const res = await API.bills.update(billId, data, files);
            if (res.success) {
                showToast(res.message || "Bill updated successfully.", "success");
                editBillModal?.hide();
                loadData();
            } else {
                showToast(res.message || "Failed to update bill.", "danger");
            }
        } catch (error) {
            showToast("Error updating bill: " + error.message, "danger");
        }
        LOADER.hide(btn);
        btn.innerHTML = originalText;
    });

    window.deleteBill = async function(billId) {
        if (!canDeleteBills) {
            showToast("You don't have permission to delete bills.", "warning");
            return;
        }
        if (!confirm("Remove this bill from active records? Paid bills and bills with payments cannot be deleted. This action is logged.")) {
            return;
        }
        try {
            const res = await API.bills.delete(billId);
            if (res.success) {
                showToast(res.message || "Bill deleted successfully.", "success");
                try { detailModal.hide(); } catch (e) {}
                loadData();
            } else {
                showToast(res.message || "Failed to delete bill.", "danger");
            }
        } catch (error) {
            showToast("Error deleting bill: " + error.message, "danger");
        }
    };

    // ============================================
    // CREATE BILL
    // ============================================
    let billAttachment = null;
    let meterImageFiles = []; // up to 2 files

    document.getElementById("createBillModal")?.addEventListener("show.bs.modal", async function(e) {
        if (!canAddBills) {
            e.preventDefault();
            showToast("You don't have permission to create bills.", "warning");
            return;
        }
        
        try {
            const res = await API.bills.unpaidTenants();
            const select = document.getElementById("billTenant");
            if (res.success && res.data) {
                select.innerHTML = `<option value="">Select tenant...</option>` + 
                    res.data.map(t => {
                        const last = t.last_billing_month ? ` — Last billed ${t.last_billing_month}` : ' — Never billed';
                        const ready = ' — Ready for new bill';
                        return `<option value="${t.id}">${t.full_name} — ${t.pg_name} Room ${t.room_number}${ready}${last}</option>`;
                    }).join("");
            }
        } catch (error) {
            showToast("Error loading unpaid tenants.", "danger");
        }
        billAttachment = null;
        meterImageFiles = [];
        const monthInput = document.getElementById("billBillingMonth");
        if (monthInput) {
            const n = new Date();
            monthInput.value = `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
        }
        document.getElementById("billAttachmentStatus").textContent = "No file attached";
        document.getElementById("meterUploadStatus").textContent = "No image uploaded";
        const previewEl = document.getElementById("meterPreview");
        previewEl.innerHTML = "";
        previewEl.classList.add("d-none");
        document.getElementById("meterUploadInput").value = "";
        calculateTotal();
    });

    function calculateTotal() {
        const rent = Number(document.getElementById("billRent").value || 0);
        const elec = Number(document.getElementById("billElectricity").value || 0);
        const maint = Number(document.getElementById("billMaintenance").value || 0);
        const other = Number(document.getElementById("billOther").value || 0);
        const total = rent + elec + maint + other;
        document.getElementById("billTotalDisplay").textContent = fmtINR(total);
    }

    document.getElementById("billRent")?.addEventListener("input", calculateTotal);
    document.getElementById("billElectricity")?.addEventListener("input", calculateTotal);
    document.getElementById("billMaintenance")?.addEventListener("input", calculateTotal);
    document.getElementById("billOther")?.addEventListener("input", calculateTotal);

    document.getElementById("billAttachBtn")?.addEventListener("click", () => {
        document.getElementById("billAttachInput").click();
    });

    document.getElementById("billAttachInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            billAttachment = this.files[0];
            document.getElementById("billAttachmentStatus").innerHTML = `<i class="bi bi-paperclip me-1"></i> ${billAttachment.name}`;
        }
    });

    document.getElementById("meterUploadBtn")?.addEventListener("click", () => {
        document.getElementById("meterUploadInput").click();
    });

    function renderMeterPreviews() {
        const previewEl = document.getElementById("meterPreview");
        previewEl.innerHTML = "";
        if (meterImageFiles.length === 0) {
            previewEl.classList.add("d-none");
            document.getElementById("meterUploadStatus").textContent = "No image uploaded";
            return;
        }
        previewEl.classList.remove("d-none");
        const names = meterImageFiles.map(f => f.name).join(", ");
        document.getElementById("meterUploadStatus").innerHTML =
            `<i class="bi bi-check-circle-fill text-success me-1"></i> ${meterImageFiles.length} image${meterImageFiles.length > 1 ? "s" : ""}: ${names}`;

        meterImageFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const wrap = document.createElement("div");
                wrap.className = "d-inline-flex align-items-start gap-1";
                wrap.innerHTML = `
                    <img src="${e.target.result}" alt="Meter image ${index + 1}" style="max-width:200px;max-height:150px;border-radius:8px;border:1px solid var(--border);">
                    <button type="button" class="btn btn-sm btn-outline-danger" data-meter-index="${index}" title="Remove"><i class="bi bi-x"></i></button>
                `;
                wrap.querySelector("button").addEventListener("click", function() {
                    const idx = parseInt(this.getAttribute("data-meter-index"), 10);
                    meterImageFiles.splice(idx, 1);
                    renderMeterPreviews();
                });
                previewEl.appendChild(wrap);
            };
            reader.readAsDataURL(file);
        });
    }

    document.getElementById("meterUploadInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            const selected = Array.from(this.files).slice(0, 2);
            // Merge with existing, cap at 2
            const combined = meterImageFiles.concat(selected).slice(0, 2);
            meterImageFiles = combined;
            if (this.files.length > 2 || meterImageFiles.length === 2 && selected.length > 0) {
                // soft notice if user tried more than 2
            }
            renderMeterPreviews();
            this.value = ""; // allow re-selecting same file later
        }
    });

    document.getElementById("createBillForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        LOADER.show(btn, 'Sending bill...');
        
        try {
            const tenantId = document.getElementById("billTenant").value;
            const rent = Number(document.getElementById("billRent").value || 0);
            const electricity = Number(document.getElementById("billElectricity").value || 0);
            const maintenance = Number(document.getElementById("billMaintenance").value || 0);
            const other = Number(document.getElementById("billOther").value || 0);
            
            if (!tenantId || rent <= 0) {
                showToast("Please select a tenant and enter rent amount.", "warning");
                LOADER.hide(btn);
                btn.innerHTML = originalText;
                return;
            }
            
            const billingMonth = document.getElementById("billBillingMonth")?.value || '';
            if (!billingMonth) {
                showToast("Please select a billing month.", "warning");
                LOADER.hide(btn);
                btn.innerHTML = originalText;
                return;
            }
            const data = {
                tenant_id: tenantId,
                rent_amount: rent,
                electricity_amount: electricity,
                maintenance_amount: maintenance,
                other_charges: other,
                billing_month: billingMonth
            };
            
            const files = {};
            if (meterImageFiles.length > 0) files.meterImage = meterImageFiles;
            if (billAttachment) files.paymentQr = billAttachment;
            
            const res = await API.bills.create(data, files);
            if (res.success) {
                showToast(res.message || "Bill sent successfully.", "success");
                createBillModal.hide();
                loadData();
            } else {
                showToast(res.message || "Failed to send bill.", "danger");
            }
        } catch (error) {
            showToast("Error creating bill: " + error.message, "danger");
        }
        LOADER.hide(btn);
        btn.innerHTML = originalText;
    });

    // ============================================
    // FINE ADJUSTMENT - NEW FEATURE
    // ============================================

    /**
     * Open fine adjustment modal for a bill
     */
    window.openFineAdjust = async function(billId) {
        if (!canEditBills) {
            showToast("You don't have permission to adjust fines.", "warning");
            return;
        }

        try {
            const res = await API.bills.getById(billId);
            if (!res.success || !res.data) {
                showToast("Bill not found.", "danger");
                return;
            }

            const bill = res.data;
            const currentFine = parseFloat(bill.fine_amount) || 0;

            if (currentFine <= 0) {
                showToast("This bill has no fine to adjust.", "warning");
                return;
            }

            document.getElementById("fineAdjustBillId").value = bill.id;
            document.getElementById("fineCurrentAmount").textContent = `₹${currentFine.toFixed(2)}`;
            document.getElementById("fineNewAmount").value = currentFine;
            document.getElementById("fineNewAmount").max = currentFine;
            document.getElementById("fineReason").value = "";
            document.getElementById("fineAdjustError").classList.add("d-none");

            fineAdjustModal.show();
        } catch (error) {
            showToast("Error loading bill: " + error.message, "danger");
        }
    };

    // Validate fine amount on input
    document.getElementById("fineNewAmount")?.addEventListener("input", function() {
        const max = parseFloat(this.max) || 0;
        const val = parseFloat(this.value) || 0;
        const errorEl = document.getElementById("fineAdjustError");
        
        if (val < 0) {
            this.value = 0;
        }
        if (val > max) {
            this.value = max;
            errorEl.textContent = `Fine amount cannot exceed current fine (₹${max.toFixed(2)})`;
            errorEl.classList.remove("d-none");
        } else {
            errorEl.classList.add("d-none");
        }
    });

    // Submit fine adjustment
    document.getElementById("fineAdjustForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const errorEl = document.getElementById("fineAdjustError");
        errorEl.classList.add("d-none");

        const billId = document.getElementById("fineAdjustBillId").value;
        const newFine = parseFloat(document.getElementById("fineNewAmount").value) || 0;
        const currentFine = parseFloat(document.getElementById("fineCurrentAmount").textContent.replace(/[₹,]/g, '')) || 0;
        const reason = document.getElementById("fineReason").value.trim();

        if (!reason) {
            errorEl.textContent = "Please provide a reason for this adjustment.";
            errorEl.classList.remove("d-none");
            return;
        }

        if (newFine > currentFine) {
            errorEl.textContent = `New fine amount cannot exceed current fine (₹${currentFine.toFixed(2)})`;
            errorEl.classList.remove("d-none");
            return;
        }

        if (newFine === currentFine) {
            errorEl.textContent = "New fine amount is same as current. No adjustment needed.";
            errorEl.classList.remove("d-none");
            return;
        }

        if (!confirm(`Adjust fine from ₹${currentFine.toFixed(2)} to ₹${newFine.toFixed(2)}? This action will be logged and the tenant will be notified.`)) {
            return;
        }

        LOADER.show(btn, 'Adjusting...');

        try {
            const res = await API.bills.fineAdjustment.adjust(billId, {
                new_fine_amount: newFine,
                reason: reason
            });

            if (res.success) {
                showToast(res.message || "Fine adjusted successfully.", "success");
                fineAdjustModal.hide();
                loadData();
                // Refresh detail view if open
                if (currentBillId) {
                    openBillDetail(currentBillId);
                }
            } else {
                showToast(res.message || "Failed to adjust fine.", "danger");
            }
        } catch (error) {
            showToast("Error adjusting fine: " + error.message, "danger");
        }

        LOADER.hide(btn);
    });

    /**
     * Show fine adjustment history in bill detail
     */
    async function showFineAdjustmentHistory(billId) {
        try {
            const res = await API.bills.fineAdjustment.getHistory(billId);
            const container = document.getElementById("fineAdjustHistoryContainer");
            
            if (!container) return;
            
            if (!res.success || !res.data || res.data.length === 0) {
                container.innerHTML = `<div class="text-muted-soft small">No fine adjustments recorded.</div>`;
                return;
            }

            container.innerHTML = `
                <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Admin</th>
                                <th>Old Fine</th>
                                <th>New Fine</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${res.data.map(a => `
                                <tr>
                                    <td>${formatDateTime(a.adjusted_at)}</td>
                                    <td>${a.admin_name || 'Unknown'}</td>
                                    <td>${fmtINR(a.old_fine_amount)}</td>
                                    <td>${fmtINR(a.new_fine_amount)}</td>
                                    <td class="small">${a.reason || '—'}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (error) {
            const container = document.getElementById("fineAdjustHistoryContainer");
            if (container) {
                container.innerHTML = `<div class="text-muted-soft small">Error loading history.</div>`;
            }
        }
    }

    // ============================================
    // TAB SWITCHING
    // ============================================
    function switchMainTab(tab, updateHash = true) {
        activeSubTab = tab;
        document.querySelectorAll('.main-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        const billsContent = document.getElementById('billsTabContent');
        const proofsContent = document.getElementById('proofsTabContent');
        if (billsContent) billsContent.style.display = tab === 'bills' ? 'block' : 'none';
        if (proofsContent) proofsContent.style.display = tab === 'proofs' ? 'block' : 'none';
        
        const pageTitleEl = document.querySelector('.page-title');
        const pageSubEl = document.querySelector('.page-sub');
        
        if (tab === 'proofs') {
            if (pageTitleEl) pageTitleEl.textContent = 'Payment Proofs';
            if (pageSubEl) pageSubEl.textContent = 'Verify and manage tenant payment submissions';
            if (updateHash && window.location.hash !== '#proofs') {
                history.replaceState(null, '', 'bills.html#proofs');
            }
            loadProofs();
        } else {
            if (pageTitleEl) pageTitleEl.textContent = 'Bills';
            if (pageSubEl) pageSubEl.textContent = 'Track rent status and manage collections across all tenants';
            if (updateHash && window.location.hash === '#proofs') {
                history.replaceState(null, '', 'bills.html');
            }
        }

        // Keep sidebar active state in sync
        document.querySelectorAll('.side-nav a, .side-nav .nav-link, .sidebar a').forEach(a => {
            const href = a.getAttribute('href') || '';
            a.classList.remove('active');
            if (tab === 'proofs' && href.includes('#proofs')) {
                a.classList.add('active');
            } else if (tab === 'bills' && (href === 'bills.html' || href.endsWith('/bills.html'))) {
                a.classList.add('active');
            }
        });
    }

    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchMainTab(this.dataset.tab, true);
        });
    });

    // Handle menu navigation Bills <-> Payment Proofs without full reload
    window.addEventListener('hashchange', function() {
        if (window.location.hash === '#proofs') {
            switchMainTab('proofs', false);
        } else {
            switchMainTab('bills', false);
        }
    });

    // Intercept sidebar clicks when already on bills.html so hash changes apply
    document.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href') || '';
        const isBillsPage = window.location.pathname.endsWith('bills.html') || window.location.pathname.endsWith('/bills');
        if (!isBillsPage) return;

        if (href === 'bills.html#proofs' || href.endsWith('bills.html#proofs')) {
            e.preventDefault();
            if (window.location.hash !== '#proofs') {
                history.pushState(null, '', 'bills.html#proofs');
            }
            switchMainTab('proofs', false);
            return;
        }
        if (href === 'bills.html' || href.endsWith('/bills.html')) {
            e.preventDefault();
            if (window.location.hash) {
                history.pushState(null, '', 'bills.html');
            }
            switchMainTab('bills', false);
            return;
        }
    });

    // ============================================
    // SEARCH
    // ============================================
    document.getElementById("billSearch")?.addEventListener("input", function() {
        const term = this.value.trim().toLowerCase();
        if (!term) {
            loadData();
            return;
        }
        const filtered = billData.filter(b => 
            (b.tenant_name || '').toLowerCase().includes(term) ||
            (b.pg_name || '').toLowerCase().includes(term) ||
            (b.room_number || '').toLowerCase().includes(term) ||
            (b.tenant_email || '').toLowerCase().includes(term)
        );
        const temp = billData;
        billData = filtered;
        renderTable();
        billData = temp;
    });

    // ============================================
    // PROOF SEARCH
    // ============================================
    document.getElementById("proofSearch")?.addEventListener("input", function() {
        const term = this.value.trim().toLowerCase();
        if (!term) {
            loadProofs();
            return;
        }
        const filtered = proofData.filter(p =>
            (p.tenant_name || '').toLowerCase().includes(term) ||
            (p.tenant_email || '').toLowerCase().includes(term) ||
            (p.transaction_id || '').toLowerCase().includes(term)
        );
        const temp = proofData;
        proofData = filtered;
        renderProofTable();
        proofData = temp;
    });

    // ============================================
    // PG FILTER LISTENERS
    // ============================================
    document.getElementById("billPgFilter")?.addEventListener("change", function() {
        selectedBillPgId = this.value || "all";
        loadData();
    });

    document.getElementById("proofPgFilter")?.addEventListener("change", function() {
        selectedProofPgId = this.value || "all";
        loadProofs();
    });

    // ============================================
    // HASH CHECK FOR PROOFS TAB
    // ============================================
    if (window.location.hash === '#proofs') {
        setTimeout(() => {
            switchMainTab('proofs', false);
        }, 100);
    }

    // ============================================
    // INIT - Load bills tab by default
    // ============================================
    (async function init() {
        await loadPgs();
        await loadData();
        if (window.location.hash !== '#proofs') {
            switchMainTab('bills', false);
        }
    })();
});