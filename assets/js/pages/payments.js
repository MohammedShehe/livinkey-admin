// Livinkey Admin - Payments Management
// Full backend integration for payment links and transactions

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("payments", "Payments", "Manage payment links and transaction history");

    const canEditBills = Permissions.canEdit('bills');
    const canViewBills = Permissions.canView('bills');

    let tenants = [];
    let selectedTenantId = null;
    let selectedPgId = "all";
    let allTransactions = [];
    let isLoadingAll = false;
    let allPgs = [];

    // ============================================
    // LOAD PGS FOR DROPDOWN
    // ============================================
    async function loadPgs() {
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                allPgs = res.data || [];
                populatePgFilter();
            }
        } catch (error) {
            console.error("Error loading PGs:", error);
        }
    }

    function populatePgFilter() {
        const select = document.getElementById("paymentPgFilter");
        if (!select) return;
        select.innerHTML = `<option value="all">All PGs</option>` +
            allPgs.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
    }

    // ============================================
    // LOAD TENANTS FOR DROPDOWN
    // ============================================
    async function loadTenants(pgId = null) {
        try {
            const params = { role: 'tenant' };
            if (pgId && pgId !== "all") {
                params.pg_id = pgId;
            }
            const res = await API.tenants.getAll(params);
            if (res.success) {
                tenants = res.data || [];
                populateTenantDropdown();
                // Load all tenants by default
                await loadAllTenantsPaymentHistory(pgId);
            }
        } catch (error) {
            console.error("Error loading tenants:", error);
        }
    }

    function populateTenantDropdown() {
        const select = document.getElementById("paymentTenantFilter");
        if (!select) return;
        select.innerHTML = `<option value="">All Tenants</option>` +
            tenants.map(t => `<option value="${t.id}">${t.full_name} — ${t.pg_name || 'N/A'} Room ${t.room_number || 'N/A'}</option>`).join("");
    }

    // ============================================
    // LOAD ALL TENANTS PAYMENT HISTORY
    // ============================================
    async function loadAllTenantsPaymentHistory(pgId = null) {
        if (isLoadingAll) return;
        isLoadingAll = true;
        
        try {
            const params = { role: 'tenant' };
            if (pgId && pgId !== "all") {
                params.pg_id = pgId;
            }
            
            const tenantsRes = await API.tenants.getAll(params);
            if (!tenantsRes.success) {
                showToast("Failed to load tenants", "danger");
                isLoadingAll = false;
                return;
            }
            
            const allTenants = tenantsRes.data || [];
            let allTxns = [];
            
            // Show loading state
            document.getElementById("paymentHistoryWrap").innerHTML = `
                <div class="text-center text-muted-soft py-4">
                    <div class="spinner-border text-brand" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading all transactions...</p>
                </div>
            `;
            
            // Load payments for each tenant in parallel
            const promises = allTenants.map(tenant => 
                API.payments.history(tenant.id)
                    .then(res => ({ tenant, res }))
                    .catch(err => ({ tenant, res: null, err }))
            );
            
            const results = await Promise.all(promises);
            
            results.forEach(({ tenant, res }) => {
                if (res && res.success && res.data) {
                    const online = (res.data.online_payments || []).map(p => ({
                        ...p,
                        _type: 'online',
                        _display_type: 'Online Payment',
                        _gateway: p.payment_method || 'online',
                        tenant_name: tenant.full_name,
                        tenant_id: tenant.id,
                        pg_name: tenant.pg_name || 'N/A',
                        pg_id: tenant.pg_id
                    }));
                    const cash = (res.data.cash_payments || []).map(p => ({
                        ...p,
                        _type: 'cash',
                        _display_type: 'Cash Payment',
                        _gateway: 'cash',
                        tenant_name: tenant.full_name,
                        tenant_id: tenant.id,
                        pg_name: tenant.pg_name || 'N/A',
                        pg_id: tenant.pg_id
                    }));
                    const proof = (res.data.payment_proofs || []).map(p => ({
                        ...p,
                        _type: 'proof',
                        _display_type: 'Payment Proof',
                        _gateway: 'proof',
                        tenant_name: tenant.full_name,
                        tenant_id: tenant.id,
                        pg_name: tenant.pg_name || 'N/A',
                        pg_id: tenant.pg_id
                    }));
                    allTxns = [...allTxns, ...online, ...cash, ...proof];
                }
            });
            
            allTxns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            allTransactions = allTxns;
            
            // Apply any active filters
            applyFilters();
            
        } catch (error) {
            console.error("Error loading all payments:", error);
            showToast("Error loading all payment history", "danger");
        } finally {
            isLoadingAll = false;
        }
    }

    // ============================================
    // LOAD PAYMENT HISTORY - SINGLE TENANT
    // ============================================
    async function loadPaymentHistory(tenantId = null) {
        try {
            const id = tenantId || selectedTenantId;
            if (!id) {
                // If no tenant selected, load all with current PG filter
                await loadAllTenantsPaymentHistory(selectedPgId);
                return;
            }

            // Show loading state
            document.getElementById("paymentHistoryWrap").innerHTML = `
                <div class="text-center text-muted-soft py-4">
                    <div class="spinner-border text-brand" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading transactions...</p>
                </div>
            `;

            const res = await API.payments.history(id);
            if (res.success && res.data) {
                // Get tenant name for display
                const tenant = tenants.find(t => t.id === id);
                const tenantName = tenant ? tenant.full_name : 'N/A';
                const pgName = tenant ? tenant.pg_name : 'N/A';
                const pgId = tenant ? tenant.pg_id : null;
                
                const onlinePayments = (res.data.online_payments || []).map(p => ({
                    ...p,
                    _type: 'online',
                    _display_type: 'Online Payment',
                    _gateway: p.payment_method || 'online',
                    tenant_name: tenantName,
                    tenant_id: id,
                    pg_name: pgName,
                    pg_id: pgId
                }));
                const cashPayments = (res.data.cash_payments || []).map(p => ({
                    ...p,
                    _type: 'cash',
                    _display_type: 'Cash Payment',
                    _gateway: 'cash',
                    tenant_name: tenantName,
                    tenant_id: id,
                    pg_name: pgName,
                    pg_id: pgId
                }));
                const paymentProofs = (res.data.payment_proofs || []).map(p => ({
                    ...p,
                    _type: 'proof',
                    _display_type: 'Payment Proof',
                    _gateway: 'proof',
                    tenant_name: tenantName,
                    tenant_id: id,
                    pg_name: pgName,
                    pg_id: pgId
                }));
                
                allTransactions = [...onlinePayments, ...cashPayments, ...paymentProofs]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                // Apply any active filters
                applyFilters();
            } else {
                showToast(res.message || "Failed to load payment history.", "danger");
            }
        } catch (error) {
            console.error("Load payment history error:", error);
            showToast("Error loading payment history: " + error.message, "danger");
        }
    }

    function renderPaymentHistory(transactions) {
        const container = document.getElementById("paymentHistoryWrap");
        const empty = document.getElementById("paymentEmpty");
        
        if (!transactions || transactions.length === 0) {
            container.innerHTML = '';
            empty.classList.remove("d-none");
            return;
        }
        empty.classList.add("d-none");

        // Check if we're showing multiple tenants
        const showTenantColumn = transactions.some(t => {
            const tenantIds = new Set(transactions.map(t => t.tenant_id));
            return tenantIds.size > 1;
        });

        // Check if we're showing multiple PGs
        const showPgColumn = transactions.some(t => {
            const pgIds = new Set(transactions.map(t => t.pg_id));
            return pgIds.size > 1;
        });

        container.innerHTML = `
        <table class="data-table">
            <thead><tr>
                ${showPgColumn ? '<th>PG</th>' : ''}
                ${showTenantColumn ? '<th>Tenant</th>' : ''}
                <th>Bill ID</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Gateway/Method</th>
                <th>Transaction ID</th>
                <th>Status</th>
                <th>Date</th>
                <th class="text-end">Actions</th>
            </tr></thead>
            <tbody>
                ${transactions.map(t => `
                <tr>
                    ${showPgColumn ? `<td><strong>${t.pg_name || 'N/A'}</strong></td>` : ''}
                    ${showTenantColumn ? `<td><strong>${t.tenant_name || 'N/A'}</strong></td>` : ''}
                    <td>#${t.bill_id || 'N/A'}</td>
                    <td><span class="chip ${t._type === 'online' ? 'chip-blue' : t._type === 'cash' ? 'chip-amber' : 'chip-gray'}">${t._display_type || 'N/A'}</span></td>
                    <td>${fmtINR(t.amount || t.amount_paid || 0)}</td>
                    <td><span class="chip chip-gray">${t.payment_method || t._gateway || 'N/A'}</span></td>
                    <td><code class="small">${t.transaction_id || t._type || 'N/A'}</code></td>
                    <td>${getPaymentStatusBadge(t.status, t._type)}</td>
                    <td>${formatDateTime(t.created_at)}</td>
                    <td class="text-end">
                        <button class="btn-icon" title="View Receipt" onclick="viewReceipt('${t.id}', '${t._type}')"><i class="bi bi-receipt"></i></button>
                    </td>
                </tr>
                `).join("")}
            </tbody>
        </table>`;
    }

    function updateStats(transactions) {
        const total = transactions.length;
        let success = 0;
        let pending = 0;
        let failed = 0;
        
        transactions.forEach(t => {
            const status = t.status || 'pending';
            if (status === 'verified' || status === 'success' || status === 'completed' || status === 'paid') {
                success++;
            } else if (status === 'pending' || status === 'processing') {
                pending++;
            } else if (status === 'failed' || status === 'rejected' || status === 'cancelled') {
                failed++;
            }
        });
        
        document.getElementById("statTotal").textContent = total;
        document.getElementById("statSuccess").textContent = success;
        document.getElementById("statPending").textContent = pending;
        document.getElementById("statFailed").textContent = failed;
    }

    function getPaymentStatusBadge(status, type) {
        let displayStatus = status || 'pending';
        let colorClass = 'status-pending';
        
        if (type === 'proof') {
            if (status === 'verified') { colorClass = 'status-success'; displayStatus = 'Verified'; }
            else if (status === 'rejected') { colorClass = 'status-failed'; displayStatus = 'Rejected'; }
            else { colorClass = 'status-pending'; displayStatus = 'Pending'; }
        } else if (type === 'cash') {
            if (status === 'verified') { colorClass = 'status-success'; displayStatus = 'Verified'; }
            else { colorClass = 'status-pending'; displayStatus = 'Pending'; }
        } else {
            if (status === 'success' || status === 'paid') { colorClass = 'status-success'; displayStatus = 'Success'; }
            else if (status === 'processing') { colorClass = 'status-processing'; displayStatus = 'Processing'; }
            else if (status === 'failed' || status === 'cancelled') { colorClass = 'status-failed'; displayStatus = 'Failed'; }
            else if (status === 'refunded') { colorClass = 'status-refunded'; displayStatus = 'Refunded'; }
            else { colorClass = 'status-pending'; displayStatus = 'Pending'; }
        }
        
        return `<span class="status-badge ${colorClass}">${displayStatus}</span>`;
    }

    // ============================================
    // VIEW RECEIPT
    // ============================================
    window.viewReceipt = function(id, type) {
        const token = Auth.getTokenFromStorage();
        if (!token) {
            showToast("Please login to view receipts.", "warning");
            return;
        }
        const url = `${API_CONFIG.baseURL}/payments/receipt/${type}/${id}?token=${encodeURIComponent(token)}`;
        const receiptWindow = window.open(url, '_blank');
        if (!receiptWindow) {
            showToast("Please allow popups to view receipt.", "warning");
        }
    };

    // ============================================
    // GENERATE PAYMENT LINK FOR TENANT
    // ============================================
    document.getElementById("generatePaymentLinkBtn")?.addEventListener("click", async function() {
        const tenantId = document.getElementById("paymentTenantFilter").value;
        if (!tenantId) {
            showToast("Please select a tenant first.", "warning");
            return;
        }

        try {
            const billsRes = await API.bills.getByTenant(tenantId);
            if (!billsRes.success || !billsRes.data || billsRes.data.length === 0) {
                showToast("No bills found for this tenant.", "warning");
                return;
            }

            const unpaidBill = billsRes.data.find(b => b.status === 'unpaid' || b.status === 'partially_paid' || b.status === 'delayed');
            if (!unpaidBill) {
                showToast("No unpaid bills found for this tenant.", "warning");
                return;
            }

            const btn = this;
            const originalText = btn.innerHTML;
            LOADER.show(btn, 'Generating...');

            const res = await API.payments.generateLink(unpaidBill.id);
            if (res.success) {
                showToast(res.message || "Payment link generated and sent to tenant.", "success");
                if (res.data?.payment_options?.qr_code) {
                    showQRCode(res.data.payment_options.qr_code, res.data.payment_options.total_due);
                }
                // Refresh the current view
                const currentTenant = document.getElementById("paymentTenantFilter").value;
                if (currentTenant) {
                    loadPaymentHistory(currentTenant);
                } else {
                    loadAllTenantsPaymentHistory(selectedPgId);
                }
            } else {
                showToast(res.message || "Failed to generate payment link.", "danger");
            }
            LOADER.hide(btn);
            btn.innerHTML = originalText;
        } catch (error) {
            showToast("Error: " + error.message, "danger");
            LOADER.hide(btn);
        }
    });

    function showQRCode(qrUrl, amount) {
        const modal = new bootstrap.Modal(document.getElementById("qrCodeModal"));
        document.getElementById("qrCodeImage").src = qrUrl;
        document.getElementById("qrCodeAmount").textContent = fmtINR(amount);
        modal.show();
    }

    // ============================================
    // FILTERS
    // ============================================
    document.getElementById("paymentPgFilter")?.addEventListener("change", function() {
        selectedPgId = this.value;
        // Reset tenant filter when PG changes
        document.getElementById("paymentTenantFilter").value = "";
        selectedTenantId = null;
        
        // Load tenants based on selected PG
        loadTenants(selectedPgId);
    });

    document.getElementById("paymentTenantFilter")?.addEventListener("change", function() {
        selectedTenantId = this.value;
        if (!this.value) {
            // Load all tenants with current PG filter
            loadAllTenantsPaymentHistory(selectedPgId);
        } else {
            // Load specific tenant
            loadPaymentHistory(this.value);
        }
    });

    document.getElementById("paymentStatusFilter")?.addEventListener("change", function() {
        applyFilters();
    });

    document.getElementById("paymentGatewayFilter")?.addEventListener("change", function() {
        applyFilters();
    });

    function applyFilters() {
        const statusFilter = document.getElementById("paymentStatusFilter").value;
        const gatewayFilter = document.getElementById("paymentGatewayFilter").value;
        
        let filtered = [...allTransactions];
        
        if (statusFilter) {
            filtered = filtered.filter(t => {
                const status = t.status || 'pending';
                return status === statusFilter;
            });
        }
        
        if (gatewayFilter) {
            filtered = filtered.filter(t => {
                const gateway = t._gateway || t.payment_method || 'unknown';
                if (gatewayFilter === 'online') {
                    return gateway === 'online' || gateway === 'qr_code';
                } else if (gatewayFilter === 'cash') {
                    return gateway === 'cash';
                } else if (gatewayFilter === 'proof') {
                    return gateway === 'proof';
                } else if (gatewayFilter === 'qr_code') {
                    return gateway === 'qr_code';
                }
                return gateway === gatewayFilter;
            });
        }
        
        renderPaymentHistory(filtered);
        updateStats(filtered);
    }

    // ============================================
    // REFRESH
    // ============================================
    document.getElementById("refreshPaymentsBtn")?.addEventListener("click", function() {
        const currentTenant = document.getElementById("paymentTenantFilter").value;
        if (currentTenant) {
            loadPaymentHistory(currentTenant);
        } else {
            loadAllTenantsPaymentHistory(selectedPgId);
        }
    });

    // ============================================
    // PG FILTER CLEAR
    // ============================================
    document.getElementById("paymentPgFilterClear")?.addEventListener("click", function() {
        const select = document.getElementById("paymentPgFilter");
        if (select) {
            select.value = "all";
            selectedPgId = "all";
            // Reset tenant filter
            document.getElementById("paymentTenantFilter").value = "";
            selectedTenantId = null;
            loadTenants("all");
        }
    });

    // ============================================
    // INIT
    // ============================================
    async function init() {
        await loadPgs();
        await loadTenants("all");
    }
    
    init();
});