// Livinkey Admin - Payments Management
// Full backend integration for payment links and transactions

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("payments", "Payments", "Manage payment links and transaction history");

    const canEditBills = Permissions.canEdit('bills');
    const canViewBills = Permissions.canView('bills');

    let tenants = [];
    let selectedTenantId = null;
    let allTransactions = [];

    // ============================================
    // LOAD TENANTS FOR DROPDOWN
    // ============================================
    async function loadTenants() {
        try {
            const res = await API.tenants.getAll({ role: 'tenant' });
            if (res.success) {
                tenants = res.data || [];
                populateTenantDropdown();
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
    // LOAD PAYMENT HISTORY - FIXED
    // ============================================
    async function loadPaymentHistory(tenantId = null) {
        try {
            const id = tenantId || selectedTenantId;
            if (!id) {
                document.getElementById("paymentHistoryWrap").innerHTML = `
                    <div class="text-center text-muted-soft py-4">
                        <i class="bi bi-credit-card" style="font-size:2rem;display:block;margin-bottom:8px;"></i>
                        Select a tenant to view payment history
                    </div>
                `;
                updateStats([]);
                return;
            }

            const res = await API.payments.history(id);
            if (res.success && res.data) {
                const onlinePayments = (res.data.online_payments || []).map(p => ({
                    ...p,
                    _type: 'online',
                    _display_type: 'Online Payment',
                    _gateway: p.payment_method || 'online'
                }));
                const cashPayments = (res.data.cash_payments || []).map(p => ({
                    ...p,
                    _type: 'cash',
                    _display_type: 'Cash Payment',
                    _gateway: 'cash'
                }));
                const paymentProofs = (res.data.payment_proofs || []).map(p => ({
                    ...p,
                    _type: 'proof',
                    _display_type: 'Payment Proof',
                    _gateway: 'proof'
                }));
                
                allTransactions = [...onlinePayments, ...cashPayments, ...paymentProofs]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                
                renderPaymentHistory(allTransactions);
                updateStats(allTransactions);
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

        container.innerHTML = `
        <table class="data-table">
            <thead><tr>
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
    // FIX: this previously called `API.payments.tenant.receipt(type, id)`,
    // which hits the TENANT-only `/tenant-payments/receipt/...` route
    // (guarded by tenantAuthMiddleware). An admin's JWT always fails
    // that role check with 403 "Invalid user role" — so this button
    // never worked. On top of that, the endpoint returns raw HTML, but
    // the generic apiRequest() helper always calls response.json(),
    // which would throw a parse error even if auth passed.
    //
    // Fix: use the new admin-scoped receipt endpoint and open it
    // directly with the token as a query param (same pattern already
    // used for document downloads elsewhere in this app) — this avoids
    // both the wrong-role problem and the JSON-parsing problem.
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
                loadPaymentHistory(tenantId);
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
    document.getElementById("paymentTenantFilter")?.addEventListener("change", function() {
        selectedTenantId = this.value;
        loadPaymentHistory(this.value);
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
                return gateway === gatewayFilter;
            });
        }
        
        renderPaymentHistory(filtered);
    }

    // ============================================
    // REFRESH
    // ============================================
    document.getElementById("refreshPaymentsBtn")?.addEventListener("click", function() {
        loadPaymentHistory(selectedTenantId);
    });

    // ============================================
    // INIT
    // ============================================
    loadTenants();
});