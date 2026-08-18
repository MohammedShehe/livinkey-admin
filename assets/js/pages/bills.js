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

    const canAddBills = Permissions.canAdd('bills');
    const canEditBills = Permissions.canEdit('bills');
    const canDeleteBills = Permissions.canDelete('bills');
    const canViewBills = Permissions.canView('bills');

    // ============================================
    // FETCH DATA
    // ============================================
    async function loadData() {
        try {
            const [statsRes, billsRes, unpaidRes] = await Promise.all([
                API.bills.stats(),
                API.bills.getAll(),
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
            if (currentProofFilter !== "all") params.status = currentProofFilter;

            const [statsRes, proofsRes] = await Promise.all([
                API.bills.paymentProofs.stats(),
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
            }
        ];
        
        document.getElementById("billStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-4 col-lg">
                <div class="stat-card hover-lift" onclick="switchTab('${s.key}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    // ============================================
    // RENDER PROOF STATS
    // ============================================
    function renderProofStats(stats) {
        const statsHtml = [
            { label: "Total", value: stats.total || 0, icon: "bi-files", color: "var(--info)", filter: "all" },
            { label: "Pending", value: stats.pending || 0, icon: "bi-clock-history", color: "var(--warning)", filter: "pending" },
            { label: "Verified", value: stats.verified || 0, icon: "bi-check-circle", color: "var(--success)", filter: "verified" },
            { label: "Rejected", value: stats.rejected || 0, icon: "bi-x-circle", color: "var(--danger)", filter: "rejected" }
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
                    <td>${b.pg_name || '—'}</td>
                    <td>${b.room_number || '—'}</td>
                    <td>${fmtINR(b.total_amount || 0)}</td>
                    <td>${fmtINR(b.paid_amount || 0)}</td>
                    <td>${fmtINR((b.due_amount || 0) > 0 ? b.due_amount : 0)}</td>
                    <td>${getStatusBadge(b.status)}</td>
                    <td>${b.valid_until ? formatDate(b.valid_until) : '—'}</td>
                    <td class="text-end">
                        <button class="btn-icon me-1" title="View" onclick="openBillDetail('${b.id}')"><i class="bi bi-eye"></i></button>
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon me-1" title="Cash Payment" onclick="openCashPayment('${b.id}')"><i class="bi bi-cash"></i></button>` : ''}
                        ${canEditBills && b.status !== 'paid' ? `<button class="btn-icon" title="Send Message" onclick="openCustomMessage('${b.id}')"><i class="bi bi-chat-dots"></i></button>` : ''}
                    </td>
                </tr>
                `).join("")}
            </tbody>
        </table>`;
    }


    // ============================================
    // RENDER PROOF TABLE - UPDATED with better error handling
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
                            <button class="btn-icon me-1" title="Verify" onclick="verifyProof('${p.id}')" style="color:var(--success);border-color:var(--success);">
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
    // PROOF PREVIEW - UPDATED with better error handling
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
    const detailModal = new bootstrap.Modal(document.getElementById("detailModal"));

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
                ${b.electricity_meter_image ? `<div class="col-12"><span class="text-muted-soft">Meter Image:</span> <a href="${b.electricity_meter_image}" target="_blank" class="text-brand">View</a></div>` : ''}
                ${b.payment_qr ? `<div class="col-12"><span class="text-muted-soft">Payment QR:</span> <img src="${b.payment_qr}" style="height:60px;width:60px;object-fit:contain;border:1px solid var(--border);border-radius:4px;"></div>` : ''}
                ${b.admin_qr ? `<div class="col-12"><span class="text-muted-soft">Admin QR:</span> <img src="${b.admin_qr}" style="height:60px;width:60px;object-fit:contain;border:1px solid var(--border);border-radius:4px;"></div>` : ''}
            </div>`;
            
            document.getElementById("detailBody").innerHTML = bodyHtml;
            document.getElementById("detailMessageWrap").classList.add("d-none");
            
            let footerButtons = `
                <button class="btn btn-outline-brand" data-bs-dismiss="modal">Close</button>
            `;
            
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
            
            document.getElementById("detailFooter").innerHTML = footerButtons;
            
            detailModal.show();
        } catch (error) {
            showToast("Error loading bill: " + error.message, "danger");
        }
    };

    // ============================================
    // CASH PAYMENT
    // ============================================
    const cashModal = new bootstrap.Modal(document.getElementById("cashPaymentModal"));

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
    // PROOF PREVIEW
    // ============================================
    const proofPreviewModal = new bootstrap.Modal(document.getElementById("proofPreviewModal"));

    window.previewProof = async function(id) {
        try {
            const res = await API.bills.paymentProofs.getById(id);
            if (!res.success || !res.data) {
                showToast("Proof not found.", "danger");
                return;
            }

            const p = res.data;
            selectedProofId = id;

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
                        <div>₹${(p.bill_total || 0).toLocaleString('en-IN')}</div>
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
                </div>
            `;

            const verifyBtn = document.getElementById("proofVerifyBtn");
            const rejectBtn = document.getElementById("proofRejectBtn");
            const deleteBtn = document.getElementById("proofDeleteBtn");
            const notesInput = document.getElementById("proofAdminNotes");

            if (p.status === 'pending' && canEditBills) {
                verifyBtn.style.display = '';
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

    // ============================================
    // VERIFY PROOF
    // ============================================
    window.verifyProof = async function(id, admin_notes = null) {
        if (!canEditBills) {
            showToast("You don't have permission to verify payment proofs.", "warning");
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
            const res = await API.bills.paymentProofs.verify(id, admin_notes);
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
    const messageModal = new bootstrap.Modal(document.getElementById("customMessageModal"));
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
    // CREATE BILL
    // ============================================
    const createBillModal = new bootstrap.Modal(document.getElementById("createBillModal"));
    let billAttachment = null;
    let meterImageFile = null;

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
                    res.data.map(t => `<option value="${t.id}">${t.full_name} — ${t.pg_name} Room ${t.room_number}</option>`).join("");
            }
        } catch (error) {
            showToast("Error loading unpaid tenants.", "danger");
        }
        billAttachment = null;
        meterImageFile = null;
        document.getElementById("billAttachmentStatus").textContent = "No file attached";
        document.getElementById("meterUploadStatus").textContent = "No image uploaded";
        document.getElementById("meterPreview").classList.add("d-none");
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

    document.getElementById("meterUploadInput")?.addEventListener("change", function() {
        if (this.files.length > 0) {
            meterImageFile = this.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById("meterPreviewImage").src = e.target.result;
                document.getElementById("meterPreview").classList.remove("d-none");
                document.getElementById("meterUploadStatus").innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> ${meterImageFile.name}`;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    document.getElementById("removeMeterImage")?.addEventListener("click", function() {
        meterImageFile = null;
        document.getElementById("meterUploadInput").value = "";
        document.getElementById("meterPreview").classList.add("d-none");
        document.getElementById("meterUploadStatus").textContent = "No image uploaded";
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
            
            const data = {
                tenant_id: tenantId,
                rent_amount: rent,
                electricity_amount: electricity,
                maintenance_amount: maintenance,
                other_charges: other
            };
            
            const files = {};
            if (meterImageFile) files.meterImage = meterImageFile;
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
    // TAB SWITCHING
    // ============================================
    function switchMainTab(tab) {
        document.querySelectorAll('.main-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.getElementById('billsTabContent').style.display = tab === 'bills' ? 'block' : 'none';
        document.getElementById('proofsTabContent').style.display = tab === 'proofs' ? 'block' : 'none';
        
        // ============================================================
        // FIX: Update page title and sub when switching tabs
        // ============================================================
        const pageTitleEl = document.querySelector('.page-title');
        const pageSubEl = document.querySelector('.page-sub');
        
        if (tab === 'proofs') {
            if (pageTitleEl) pageTitleEl.textContent = 'Payment Proofs';
            if (pageSubEl) pageSubEl.textContent = 'Verify and manage tenant payment submissions';
            loadProofs();
        } else {
            if (pageTitleEl) pageTitleEl.textContent = 'Bills';
            if (pageSubEl) pageSubEl.textContent = 'Track rent status and manage collections across all tenants';
        }
    }

    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchMainTab(this.dataset.tab);
        });
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
    // HASH CHECK FOR PROOFS TAB
    // ============================================
    if (window.location.hash === '#proofs') {
        setTimeout(() => {
            switchMainTab('proofs');
        }, 100);
    }

    // ============================================
    // INIT - Load bills tab by default
    // ============================================
    loadData();
    // Only switch to proofs if hash is present, otherwise stay on bills
    if (window.location.hash !== '#proofs') {
        switchMainTab('bills');
    }
});