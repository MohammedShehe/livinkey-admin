// Livinkey Admin - Send Notifications
// Full backend integration for admin-to-tenant notifications

document.addEventListener("DOMContentLoaded", () => {
    renderLayout("notifications", "Send Notifications", "Broadcast messages to tenants via push and email");

    // Permission check
    const canViewTenants = Permissions.canView('tenants');
    if (!canViewTenants) {
        showToast("You don't have permission to send notifications.", "warning");
        document.getElementById("sendNotifBtn").disabled = true;
        return;
    }

    // State
    let recipientType = 'all';
    let selectedPGs = [];
    let selectedTenants = [];
    let allTenants = [];
    let allPGs = [];
    let historyData = [];
    let tenantSearchResults = [];

    // Stats
    let totalSent = 0;
    let recentSent = 0;

    // ============================================
    // LOAD DATA
    // ============================================
    async function loadData() {
        try {
            const [tenantsRes, pgsRes, historyRes] = await Promise.all([
                API.tenants.getAll({ role: 'tenant' }),
                API.pgs.getAll(),
                API.adminNotifications.history()
            ]);

            if (tenantsRes.success) {
                allTenants = tenantsRes.data || [];
                document.getElementById('totalTenants').textContent = allTenants.length;
                // Store for search
                window.LK_ALL_TENANTS = allTenants;
            }

            if (pgsRes.success) {
                allPGs = pgsRes.data || [];
                document.getElementById('totalPGs').textContent = allPGs.length;
                populatePGSelect();
            }

            if (historyRes.success) {
                historyData = historyRes.data || [];
                // Calculate stats
                totalSent = historyData.length;
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                recentSent = historyData.filter(h => new Date(h.sent_at) >= thirtyDaysAgo).length;
                document.getElementById('totalSent').textContent = totalSent;
                document.getElementById('recentSent').textContent = recentSent;
                renderHistory();
            }

            updateSelectedCount();
            updateSelectedItems();
        } catch (error) {
            showToast("Error loading data: " + error.message, "danger");
        }
    }

    // ============================================
    // RECIPIENT TYPE SELECTION
    // ============================================
    window.selectRecipientType = function(type) {
        recipientType = type;
        
        // Update UI
        document.querySelectorAll('.recipient-card').forEach(card => {
            card.classList.toggle('active', card.dataset.type === type);
            const radio = card.querySelector('input[type="radio"]');
            if (radio) radio.checked = card.dataset.type === type;
        });

        // Update selection area
        const selectionArea = document.getElementById('selectionArea');
        const controls = document.getElementById('selectionControls');
        const label = document.getElementById('selectionLabel');

        if (type === 'all') {
            label.textContent = 'All active tenants will receive this notification';
            controls.classList.add('d-none');
            selectedPGs = [];
            selectedTenants = [];
        } else {
            controls.classList.remove('d-none');
            if (type === 'pg') {
                label.textContent = 'Select PGs to send notifications to all their tenants';
                document.getElementById('tenantSearchArea').classList.add('d-none');
                document.getElementById('pgSelect').classList.remove('d-none');
                // Pre-select all PGs initially
                if (selectedPGs.length === 0) {
                    selectedPGs = allPGs.map(p => p.id);
                    updatePGSelectionUI();
                }
                // Refresh the tenant list for the selected PGs
                renderTenantList();
            } else {
                label.textContent = 'Select individual tenants to notify';
                document.getElementById('tenantSearchArea').classList.remove('d-none');
                document.getElementById('pgSelect').classList.add('d-none');
                // Load tenant list
                renderTenantList();
            }
        }
        
        updateSelectedCount();
        updateSelectedItems();
    };

    // ============================================
    // PG SELECTION
    // ============================================
    function populatePGSelect() {
        const select = document.getElementById('pgSelect');
        if (!select) return;
        
        // Count tenants per PG
        const pgTenantCounts = {};
        allTenants.forEach(t => {
            if (t.pg_id) {
                pgTenantCounts[t.pg_id] = (pgTenantCounts[t.pg_id] || 0) + 1;
            }
        });
        
        select.innerHTML = '<option value="">Select PG...</option>' +
            allPGs.map(p => {
                const count = pgTenantCounts[p.id] || 0;
                return `<option value="${p.id}">${p.name} (${count} tenants)</option>`;
            }).join('');
    }

    window.updatePGSelection = function() {
        const select = document.getElementById('pgSelect');
        const pgId = parseInt(select.value);
        if (!pgId) return;
        
        // Add to selected PGs if not already
        if (!selectedPGs.includes(pgId)) {
            selectedPGs.push(pgId);
        }
        
        // Get all tenants in this PG and add to selected tenants
        const tenantsInPG = allTenants.filter(t => t.pg_id === pgId);
        tenantsInPG.forEach(t => {
            if (!selectedTenants.includes(t.id)) {
                selectedTenants.push(t.id);
            }
        });
        
        // Reset the select
        select.value = '';
        
        // Update UI
        updateSelectedCount();
        updateSelectedItems();
        renderTenantList();
        
        const pgName = allPGs.find(p => p.id === pgId)?.name || 'PG';
        showToast(`Added ${tenantsInPG.length} tenants from ${pgName}`, "success");
    };

    window.selectAllPGTenants = function() {
        if (recipientType !== 'pg') return;
        
        // Select all PGs
        selectedPGs = allPGs.map(p => p.id);
        
        // Get all tenant IDs from selected PGs
        const tenantIds = allTenants
            .filter(t => selectedPGs.includes(t.pg_id))
            .map(t => t.id);
        
        selectedTenants = [...new Set([...selectedTenants, ...tenantIds])];
        
        updateSelectedCount();
        updateSelectedItems();
        renderTenantList();
        showToast(`Selected all ${selectedTenants.length} tenants from all PGs`, "success");
    };

    function updatePGSelectionUI() {
        // Update the select to show selected PGs
        populatePGSelect();
        updateSelectedCount();
        updateSelectedItems();
        // Update tenant list
        renderTenantList();
    }

    // ============================================
    // TENANT SEARCH & SELECTION
    // ============================================
    window.filterTenants = function() {
        renderTenantList();
    };

    function renderTenantList() {
        const container = document.getElementById('tenantList');
        if (!container) return;
        
        const searchTerm = document.getElementById('tenantSearch')?.value?.toLowerCase() || '';
        
        let filtered = allTenants;
        
        // If in PG mode, only show tenants from selected PGs
        if (recipientType === 'pg') {
            filtered = filtered.filter(t => selectedPGs.includes(t.pg_id));
        }
        
        if (searchTerm) {
            filtered = filtered.filter(t => 
                t.full_name?.toLowerCase().includes(searchTerm) ||
                t.room_number?.toLowerCase().includes(searchTerm) ||
                t.pg_name?.toLowerCase().includes(searchTerm)
            );
        }
        
        tenantSearchResults = filtered;
        
        if (filtered.length === 0) {
            container.innerHTML = '<div class="text-muted-soft text-center py-2 small">No tenants found</div>';
            return;
        }
        
        container.innerHTML = filtered.map(t => {
            const isSelected = selectedTenants.includes(t.id);
            return `
                <div class="d-flex align-items-center justify-content-between py-1 px-2 ${isSelected ? 'bg-success bg-opacity-10' : ''}" 
                     style="border-bottom:1px solid var(--border);cursor:pointer;" 
                     onclick="toggleTenant(${t.id})">
                    <div>
                        <span class="fw-semibold">${t.full_name || '—'}</span>
                        <span class="text-muted-soft small ms-2">${t.room_number || '—'} · ${t.pg_name || '—'}</span>
                    </div>
                    <div>
                        ${isSelected ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-circle text-muted"></i>'}
                    </div>
                </div>
            `;
        }).join('');
    }

    window.toggleTenant = function(tenantId) {
        const index = selectedTenants.indexOf(tenantId);
        if (index > -1) {
            selectedTenants.splice(index, 1);
        } else {
            selectedTenants.push(tenantId);
        }
        updateSelectedCount();
        updateSelectedItems();
        renderTenantList();
    };

    // ============================================
    // UPDATE UI HELPERS
    // ============================================
    function updateSelectedCount() {
        let count = 0;
        if (recipientType === 'all') {
            count = allTenants.length;
        } else if (recipientType === 'pg') {
            count = allTenants.filter(t => selectedPGs.includes(t.pg_id)).length;
        } else {
            count = selectedTenants.length;
        }
        document.getElementById('selectedCount').textContent = `${count} tenant${count !== 1 ? 's' : ''}`;
    }

    function updateSelectedItems() {
        const container = document.getElementById('selectedItems');
        if (!container) return;
        
        let items = [];
        if (recipientType === 'all') {
            items = [{ label: `All ${allTenants.length} tenants`, type: 'all' }];
        } else if (recipientType === 'pg') {
            const pgNames = allPGs.filter(p => selectedPGs.includes(p.id)).map(p => p.name);
            if (pgNames.length === 0) {
                items = [{ label: 'No PGs selected', type: 'empty' }];
            } else if (pgNames.length <= 3) {
                items = pgNames.map(name => ({ label: name, type: 'pg' }));
            } else {
                items = [{ label: `${pgNames.length} PGs selected`, type: 'pg' }];
            }
        } else {
            const selected = allTenants.filter(t => selectedTenants.includes(t.id));
            if (selected.length === 0) {
                items = [{ label: 'No tenants selected', type: 'empty' }];
            } else if (selected.length <= 5) {
                items = selected.map(t => ({ 
                    label: `${t.full_name} (${t.room_number || '—'})`, 
                    type: 'tenant',
                    id: t.id 
                }));
            } else {
                items = [{ label: `${selected.length} tenants selected`, type: 'tenant' }];
            }
        }
        
        container.innerHTML = items.map(item => {
            if (item.type === 'empty') {
                return `<span class="text-muted-soft small">${item.label}</span>`;
            }
            return `
                <span class="tenant-tag">
                    ${item.label}
                    ${item.id ? `<span class="remove-tag" onclick="event.stopPropagation(); toggleTenant(${item.id})">&times;</span>` : ''}
                    ${item.type === 'pg' ? `<span class="remove-tag" onclick="event.stopPropagation(); removePG('${item.label}')">&times;</span>` : ''}
                </span>
            `;
        }).join('');
    }

    window.removePG = function(pgName) {
        const pg = allPGs.find(p => p.name === pgName);
        if (pg) {
            const index = selectedPGs.indexOf(pg.id);
            if (index > -1) {
                selectedPGs.splice(index, 1);
                // Remove all tenants from this PG
                const tenantsInPG = allTenants.filter(t => t.pg_id === pg.id);
                tenantsInPG.forEach(t => {
                    const idx = selectedTenants.indexOf(t.id);
                    if (idx > -1) selectedTenants.splice(idx, 1);
                });
                updateSelectedCount();
                updateSelectedItems();
                renderTenantList();
            }
        }
    };

    // ============================================
    // PREVIEW
    // ============================================
    window.updatePreview = function() {
        const title = document.getElementById('notifTitle').value || 'Your notification title';
        const message = document.getElementById('notifMessage').value || 'Your message will appear here...';
        
        document.getElementById('previewTitle').textContent = title;
        document.getElementById('previewBody').textContent = message;
        
        // Character counts
        document.getElementById('titleCount').textContent = `${title.length}/100`;
        document.getElementById('messageCount').textContent = `${message.length}/500`;
    };

    // ============================================
    // SEND NOTIFICATION
    // ============================================
    window.sendNotification = async function() {
        const btn = document.getElementById('sendNotifBtn');
        const title = document.getElementById('notifTitle').value.trim();
        const message = document.getElementById('notifMessage').value.trim();
        const sendPush = document.getElementById('sendPush').checked;
        const sendEmail = document.getElementById('sendEmail').checked;
        
        // Validate
        if (!title) {
            showToast("Please enter a notification title.", "warning");
            document.getElementById('notifTitle').focus();
            return;
        }
        if (!message) {
            showToast("Please enter a notification message.", "warning");
            document.getElementById('notifMessage').focus();
            return;
        }
        
        // Get recipient IDs
        let tenantIds = [];
        if (recipientType === 'all') {
            tenantIds = allTenants.map(t => t.id);
        } else if (recipientType === 'pg') {
            tenantIds = allTenants.filter(t => selectedPGs.includes(t.pg_id)).map(t => t.id);
        } else {
            tenantIds = selectedTenants;
        }
        
        if (tenantIds.length === 0) {
            showToast("No tenants selected to receive this notification.", "warning");
            return;
        }
        
        // Confirm
        const confirmMsg = `Send this notification to ${tenantIds.length} tenant(s)?\n\nTitle: ${title}\nMessage: ${message}\nPush: ${sendPush ? 'Yes' : 'No'}\nEmail: ${sendEmail ? 'Yes' : 'No'}`;
        if (!confirm(confirmMsg)) {
            return;
        }
        
        LOADER.show(btn, 'Sending...');
        
        try {
            const payload = {
                recipient_type: recipientType,
                title: title,
                message: message,
                send_push: sendPush,
                send_email: sendEmail
            };
            
            if (recipientType === 'individual') {
                payload.tenant_ids = tenantIds;
            } else if (recipientType === 'pg') {
                payload.pg_ids = selectedPGs;
            }
            
            const res = await API.adminNotifications.send(payload);
            
            if (res.success) {
                showToast(res.message || `Notification sent to ${res.data?.total_tenants || tenantIds.length} tenants.`, "success");
                
                // Reset form
                document.getElementById('notifTitle').value = '';
                document.getElementById('notifMessage').value = '';
                document.getElementById('sendPush').checked = true;
                document.getElementById('sendEmail').checked = false;
                updatePreview();
                
                // Reload history
                await loadData();
            } else {
                showToast(res.message || "Failed to send notification.", "danger");
            }
        } catch (error) {
            showToast("Error sending notification: " + error.message, "danger");
        }
        
        LOADER.hide(btn);
    };

    // ============================================
    // RENDER HISTORY - WITH DELETE BUTTONS
    // ============================================
    function renderHistory() {
        const container = document.getElementById('historyList');
        if (!container) return;
        
        if (historyData.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted-soft py-4">
                    <i class="bi bi-inbox" style="font-size:2rem;display:block;margin-bottom:0.5rem;"></i>
                    No notifications sent yet
                </div>
            `;
            return;
        }
        
        // Get the current admin's ID for permission checking
        const session = Auth.getSession();
        const currentAdminId = session?.id || null;
        const isSuperAdmin = session?.role === 'super_admin';
        
        container.innerHTML = historyData.slice(0, 20).map(h => {
            const badgeClass = h.recipient_type === 'all' ? 'all' : h.recipient_type === 'pg' ? 'pg' : 'individual';
            const badgeLabel = h.recipient_type === 'all' ? 'All' : h.recipient_type === 'pg' ? 'PG' : 'Individual';
            const pushIcon = h.send_push ? '<i class="bi bi-bell-fill text-success"></i>' : '<i class="bi bi-bell-slash text-muted"></i>';
            const emailIcon = h.send_email ? '<i class="bi bi-envelope-fill text-success"></i>' : '<i class="bi bi-envelope-slash text-muted"></i>';
            
            // Show delete button only if admin sent this notification OR is super admin
            const canDelete = isSuperAdmin || h.admin_id === currentAdminId;
            
            return `
                <div class="history-item" data-id="${h.id}">
                    <div class="d-flex justify-content-between align-items-start">
                        <div style="flex:1;min-width:0;">
                            <div class="h-title">${h.title || 'Untitled'}</div>
                            <div class="h-meta">
                                <span class="h-badge ${badgeClass}">${badgeLabel}</span>
                                ${pushIcon} ${emailIcon}
                                <span class="ms-2">${h.recipient_count || 0} recipients</span>
                            </div>
                        </div>
                        <div class="text-end" style="flex-shrink:0;">
                            <div class="h-meta">${formatDateTime(h.sent_at)}</div>
                            <div class="h-meta">by ${h.admin_name || 'Admin'}</div>
                            ${canDelete ? `
                                <button class="btn btn-sm btn-icon history-delete-btn" 
                                        data-id="${h.id}" 
                                        style="width:28px;height:28px;border-radius:6px;color:var(--danger);border-color:var(--danger);margin-top:4px;"
                                        title="Delete this notification log">
                                    <i class="bi bi-trash3" style="font-size:0.75rem;"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    <div class="h-meta mt-1 text-truncate" style="max-width:300px;">${h.message || ''}</div>
                </div>
            `;
        }).join('');
        
        // ============================================================
        // NEW: Attach delete event listeners to each delete button
        // ============================================================
        document.querySelectorAll('.history-delete-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const id = this.dataset.id;
                deleteNotificationLog(id);
            });
        });
    }

    // ============================================================
    // NEW: Delete a single notification log
    // ============================================================
    function deleteNotificationLog(id) {
        if (!id) return;
        
        // Find the history item to show confirmation
        const item = historyData.find(h => h.id === parseInt(id));
        if (!item) {
            showToast("Notification not found.", "warning");
            return;
        }
        
        if (!confirm(`Delete this notification log?\n\nTitle: "${item.title}"\nSent: ${formatDateTime(item.sent_at)}\nThis action cannot be undone.`)) {
            return;
        }
        
        const btn = document.querySelector(`.history-delete-btn[data-id="${id}"]`);
        if (btn) {
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm" style="width:14px;height:14px;"></span>';
            btn.disabled = true;
        }
        
        API.adminNotifications.delete(id)
            .then(res => {
                if (res.success) {
                    showToast(res.message || "Notification log deleted.", "success");
                    // Reload data
                    loadData();
                } else {
                    showToast(res.message || "Failed to delete notification.", "danger");
                    if (btn) {
                        btn.innerHTML = originalHTML;
                        btn.disabled = false;
                    }
                }
            })
            .catch(error => {
                showToast("Error deleting notification: " + error.message, "danger");
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
            });
    }

    // ============================================================
    // NEW: Clear all history (with confirmation) - Only for super admins
    // ============================================================
    window.clearAllHistory = function() {
        const session = Auth.getSession();
        if (session?.role !== 'super_admin') {
            showToast("Only Super Admins can clear all history.", "warning");
            return;
        }
        
        if (historyData.length === 0) {
            showToast("No history to clear.", "info");
            return;
        }
        
        if (!confirm(`Delete ALL ${historyData.length} notification logs? This action cannot be undone!`)) {
            return;
        }
        
        const ids = historyData.map(h => h.id);
        
        API.adminNotifications.deleteMultiple(ids)
            .then(res => {
                if (res.success) {
                    showToast(res.message || `${res.deleted_count || ids.length} notification logs deleted.`, "success");
                    loadData();
                } else {
                    showToast(res.message || "Failed to delete notifications.", "danger");
                }
            })
            .catch(error => {
                showToast("Error deleting notifications: " + error.message, "danger");
            });
    };

    // ============================================
    // LOAD HISTORY
    // ============================================
    window.loadHistory = function() {
        loadData();
    };

    // ============================================
    // INIT
    // ============================================
    loadData();
    
    // Initial preview
    updatePreview();
    
    // Set default selection
    selectRecipientType('all');
});