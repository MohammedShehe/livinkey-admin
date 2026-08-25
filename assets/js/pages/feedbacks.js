document.addEventListener("DOMContentLoaded", () => {
    renderLayout("feedbacks", "Feedbacks Management", "View and manage all tenant feedback and ratings.");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canViewFeedbacks = Permissions.canView('feedbacks');
    const canDeleteFeedbacks = Permissions.canDelete('feedbacks');
    
    // Feedbacks are read-only in the backend (no add/edit permissions)
    // But now admins can delete feedbacks with proper permission

    let feedbackData = [];
    let currentFilter = "all";
    let currentPgFilter = "all";
    let searchTerm = "";
    let pgList = [];
    let currentUserTypeFilter = "all";

    // ============================================
    // FETCH FEEDBACKS
    // ============================================
    async function loadFeedbacks() {
        // Check view permission
        if (!canViewFeedbacks) {
            showToast("You don't have permission to view feedbacks.", "warning");
            return;
        }
        
        try {
            const params = {};
            
            // Only send supported filters to the backend
            if (currentFilter === "positive" || currentFilter === "negative") {
                params.type = currentFilter;
            }
            
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;
            if (searchTerm) params.pg_name = searchTerm;
            if (currentUserTypeFilter !== "all") params.user_type = currentUserTypeFilter;

            const res = await API.feedbacks.admin.all(params);
            if (res.success) {
                let data = res.data || [];
                
                // ============================================================
                // FRONTEND FILTERING for nationality and gender
                // ============================================================
                if (currentFilter === "national") {
                    data = data.filter(f => f.nationality && f.nationality.toLowerCase() === 'indian');
                } else if (currentFilter === "international") {
                    data = data.filter(f => f.nationality && f.nationality.toLowerCase() !== 'indian');
                } else if (currentFilter === "male") {
                    data = data.filter(f => f.gender && f.gender.toLowerCase() === 'male');
                } else if (currentFilter === "female") {
                    data = data.filter(f => f.gender && f.gender.toLowerCase() === 'female');
                }
                
                feedbackData = data;
                renderFeedbacks();
            } else {
                showToast(res.message || "Failed to load feedbacks", "danger");
            }
        } catch (error) {
            showToast("Error loading feedbacks: " + error.message, "danger");
        }
    }

    // ============================================
    // LOAD PG LIST
    // ============================================
    async function loadPGs() {
        try {
            const res = await API.pgs.getAll();
            if (res.success) {
                pgList = res.data || [];
                populatePgFilter();
            }
        } catch (error) {
            console.error("Error loading PGs:", error);
        }
    }

    function populatePgFilter() {
        const select = document.getElementById("pgFilter");
        if (!select) return;
        let options = '<option value="all">All PGs</option>';
        pgList.forEach(pg => {
            const selected = currentPgFilter === String(pg.id) ? "selected" : "";
            options += `<option value="${pg.id}" ${selected}>${pg.name}</option>`;
        });
        select.innerHTML = options;
    }

    // ============================================
    // RENDER STATS
    // ============================================
    function renderStats() {
        const total = feedbackData.length;
        const positive = feedbackData.filter(f => parseFloat(f.overall_rating) >= 7).length;
        const negative = feedbackData.filter(f => parseFloat(f.overall_rating) <= 5).length;
        
        // FIX: Parse ratings as floats and handle NaN cases
        let avgOverall = 0;
        if (total > 0) {
            const sum = feedbackData.reduce((sum, f) => {
                const rating = parseFloat(f.overall_rating);
                return sum + (isNaN(rating) ? 0 : rating);
            }, 0);
            avgOverall = sum / total;
        }
        
        const tenantCount = feedbackData.filter(f => f.feedback_type === 'user' && f.user_type === 'tenant').length;
        const guestCount = feedbackData.filter(f => f.feedback_type === 'user' && f.user_type === 'guest').length;
        const publicCount = feedbackData.filter(f => f.feedback_type === 'public').length;

        const stats = [
            { label: "Total Feedbacks", value: total, icon: "bi-chat-dots-fill", color: "var(--lk-green)", filter: "all" },
            { label: "Positive (7+)", value: positive, icon: "bi-emoji-smile-fill", color: "var(--lk-green)", filter: "positive" },
            { label: "Negative (≤5)", value: negative, icon: "bi-emoji-frown-fill", color: "var(--danger)", filter: "negative" },
            { label: "Avg Rating", value: avgOverall > 0 ? avgOverall.toFixed(1) + "/10" : "0.0/10", icon: "bi-star-fill", color: "var(--warning)", filter: "all" },
            { label: "From Tenants", value: tenantCount, icon: "bi-person-fill", color: "#3498db", filter: "all" },
            { label: "From Guests", value: guestCount, icon: "bi-person-badge", color: "#9b59b6", filter: "all" },
            { label: "From Website", value: publicCount, icon: "bi-globe2", color: "#e67e22", filter: "all" }
        ];
        
        document.getElementById("feedbackStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-3 col-lg">
                <div class="stat-card stat-card-feedback" onclick="filterByStat('${s.filter}')">
                    <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
                    <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
                </div>
            </div>
        `).join("");
    }

    window.filterByStat = function(filter) {
        currentFilter = filter;
        document.querySelectorAll('.chip-filter').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });
        loadFeedbacks();
    };

    function filterByPg(pgId) {
        currentPgFilter = pgId;
        loadFeedbacks();
    }

    function filterByUserType(userType) {
        currentUserTypeFilter = userType;
        loadFeedbacks();
    }

    // ============================================
    // RENDER FEEDBACK CARDS
    // ============================================
    function renderFeedbacks() {
        const container = document.getElementById("feedbacksContainer");
        const empty = document.getElementById("feedbacksEmpty");

        if (feedbackData.length === 0) {
            container.innerHTML = '';
            empty.classList.remove("d-none");
            renderStats();
            return;
        }
        empty.classList.add("d-none");

        container.innerHTML = feedbackData.map(f => {
            const sentiment = f.overall_rating >= 7 ? 'positive' : f.overall_rating <= 5 ? 'negative' : 'neutral';
            const sentimentLabel = sentiment === 'positive' ? 'Positive' : sentiment === 'negative' ? 'Negative' : 'Neutral';
            const sentimentClass = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : 'neutral';
            const date = f.created_at ? formatDate(f.created_at) : '—';
            
            // Determine user type display
            let userTypeLabel = 'Unknown';
            let userTypeColor = 'var(--muted)';
            if (f.feedback_type === 'public') {
                userTypeLabel = 'Website Visitor';
                userTypeColor = '#e67e22';
            } else if (f.user_type === 'tenant') {
                userTypeLabel = 'Tenant';
                userTypeColor = '#3498db';
            } else if (f.user_type === 'guest') {
                userTypeLabel = 'Guest';
                userTypeColor = '#9b59b6';
            }

            return `
            <div class="feedback-card" onclick="openFeedbackDetail('${f.id}')" style="cursor:pointer;">
                <div class="feedback-header">
                    <div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-semibold">${f.tenant_name || '—'}</span>
                            <span class="text-muted-soft small">•</span>
                            <span class="text-muted-soft small">${f.pg_name || '—'}</span>
                            <span class="text-muted-soft small">•</span>
                            <span class="text-muted-soft small">Room ${f.room_number || '—'}</span>
                        </div>
                        <div class="feedback-meta">
                            <span><i class="bi bi-envelope"></i> ${f.tenant_email || '—'}</span>
                            ${f.nationality ? `<span><i class="bi bi-flag"></i> ${f.nationality}</span>` : ''}
                            ${f.gender ? `<span><i class="bi bi-gender-${(f.gender || 'male') === 'Male' ? 'male' : 'female'}"></i> ${f.gender}</span>` : ''}
                            <span><i class="bi bi-calendar3"></i> ${date}</span>
                            <span class="badge" style="background:${userTypeColor};color:white;">${userTypeLabel}</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="sentiment-badge ${sentimentClass}">${sentiment === 'positive' ? '👍' : sentiment === 'negative' ? '👎' : '😐'} ${sentimentLabel}</span>
                        <span class="fw-bold" style="font-size:1.1rem;color:${f.overall_rating >= 7 ? 'var(--lk-green)' : f.overall_rating <= 5 ? 'var(--danger)' : 'var(--warning)'}">${f.overall_rating || 0}/10</span>
                        ${canDeleteFeedbacks ? `<button class="btn-icon" style="color:var(--danger);border-color:var(--danger);" onclick="event.stopPropagation(); deleteFeedback('${f.id}')"><i class="bi bi-trash3"></i></button>` : ''}
                    </div>
                </div>

                <div class="ratings-grid">
                    <div class="rating-item">
                        <span class="label">Living Experience</span>
                        <span class="value">${f.living_experience_rating || 0}/10</span>
                    </div>
                    <div class="rating-item">
                        <span class="label">Maintenance</span>
                        <span class="value">${f.maintenance_handling_rating || 0}/10</span>
                    </div>
                    <div class="rating-item">
                        <span class="label">Communication</span>
                        <span class="value">${f.communication_rating || 0}/10</span>
                    </div>
                    <div class="rating-item">
                        <span class="label">Amenities</span>
                        <span class="value">${f.amenities_rating || 0}/10</span>
                    </div>
                    <div class="rating-item">
                        <span class="label">Technology</span>
                        <span class="value">${f.technology_handling_rating || 0}/10</span>
                    </div>
                </div>

                ${f.comment ? `<div class="feedback-comment">${f.comment}</div>` : ''}
            </div>`;
        }).join("");

        renderStats();
    }

    // ============================================
    // FEEDBACK DETAIL
    // ============================================
    const detailModal = new bootstrap.Modal(document.getElementById("feedbackDetailModal"));

    window.openFeedbackDetail = function(id) {
        // FIX: Convert to string for safe comparison
        const idStr = String(id);
        const f = feedbackData.find(x => String(x.id) === idStr);
        if (!f) {
            showToast("Feedback not found. Please refresh the page.", "warning");
            return;
        }

        // Determine user type display
        let userTypeLabel = 'Unknown';
        if (f.feedback_type === 'public') {
            userTypeLabel = 'Website Visitor';
        } else if (f.user_type === 'tenant') {
            userTypeLabel = 'Tenant';
        } else if (f.user_type === 'guest') {
            userTypeLabel = 'Guest';
        }

        document.getElementById("detailName").textContent = f.tenant_name || '—';
        document.getElementById("detailMeta").innerHTML = `
            ${f.pg_name || '—'} • Room ${f.room_number || '—'} • 
            ${f.nationality ? `${f.nationality} • ` : ''}${f.gender || '—'} • 
            <i class="bi bi-envelope"></i> ${f.tenant_email || '—'} • 
            <i class="bi bi-calendar3"></i> ${f.created_at ? formatDate(f.created_at) : '—'} •
            <span class="badge" style="background:${userTypeLabel === 'Tenant' ? '#3498db' : userTypeLabel === 'Guest' ? '#9b59b6' : '#e67e22'};color:white;">${userTypeLabel}</span>
        `;

        const sentiment = f.overall_rating >= 7 ? 'positive' : f.overall_rating <= 5 ? 'negative' : 'neutral';
        const sentimentLabel = sentiment === 'positive' ? 'Positive' : sentiment === 'negative' ? 'Negative' : 'Neutral';
        const sentimentClass = sentiment === 'positive' ? 'positive' : sentiment === 'negative' ? 'negative' : 'neutral';
        document.getElementById("detailSentiment").textContent = `${sentiment === 'positive' ? '👍' : sentiment === 'negative' ? '👎' : '😐'} ${sentimentLabel} • ${f.overall_rating || 0}/10`;
        document.getElementById("detailSentiment").className = `sentiment-badge ${sentimentClass}`;

        const ratings = [
            { label: 'Living Experience', value: f.living_experience_rating || 0 },
            { label: 'Maintenance Handling', value: f.maintenance_handling_rating || 0 },
            { label: 'Communication', value: f.communication_rating || 0 },
            { label: 'Amenities', value: f.amenities_rating || 0 },
            { label: 'Technology Handling', value: f.technology_handling_rating || 0 }
        ];

        document.getElementById("detailRatings").innerHTML = ratings.map(item => `
            <div class="breakdown-item">
                <span class="label">${item.label}</span>
                <span class="value" style="color:${item.value >= 7 ? 'var(--lk-green)' : item.value <= 5 ? 'var(--danger)' : 'var(--warning)'}">${item.value}/10</span>
            </div>
        `).join('');

        document.getElementById("detailComment").textContent = f.comment || "No comment provided.";

        // Show/hide delete button in modal
        const deleteBtn = document.getElementById("detailDeleteBtn");
        if (deleteBtn) {
            deleteBtn.style.display = canDeleteFeedbacks ? '' : 'none';
            deleteBtn.onclick = function() {
                detailModal.hide();
                deleteFeedback(f.id);
            };
        }

        detailModal.show();
    };

    // ============================================
    // DELETE FEEDBACK (FIXED)
    // ============================================
    const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));

    window.deleteFeedback = function(id) {
        if (!canDeleteFeedbacks) {
            showToast("You don't have permission to delete feedbacks.", "warning");
            return;
        }
        
        // FIX: Convert to string for safe comparison
        const idStr = String(id);
        const f = feedbackData.find(x => String(x.id) === idStr);
        
        if (!f) {
            showToast("Feedback not found. Please refresh the page.", "danger");
            return;
        }

        document.getElementById("confirmTitle").textContent = "Delete Feedback?";
        document.getElementById("confirmBody").textContent = `This will permanently remove feedback from ${f.tenant_name || 'User'} about ${f.pg_name || 'PG'}. This action cannot be undone.`;
        document.getElementById("confirmActionBtn").onclick = async function() {
            const btn = this;
            LOADER.show(btn, 'Deleting...');
            try {
                const res = await API.feedbacks.admin.delete(id);
                if (res.success) {
                    showToast(res.message || "Feedback deleted successfully.", "success");
                    confirmModal.hide();
                    loadFeedbacks();
                } else {
                    showToast(res.message || "Failed to delete feedback.", "danger");
                }
            } catch (error) {
                showToast("Error deleting feedback: " + error.message, "danger");
            }
            LOADER.hide(btn);
        };
        confirmModal.show();
    };

    // ============================================
    // FILTER CHIPS
    // ============================================
    document.getElementById("filterChips")?.addEventListener("click", function(e) {
        const chip = e.target.closest('.chip-filter');
        if (!chip) return;
        const filter = chip.dataset.filter;
        currentFilter = filter;
        document.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        loadFeedbacks();
    });

    // ============================================
    // USER TYPE FILTER
    // ============================================
    document.getElementById("userTypeFilter")?.addEventListener("change", function() {
        filterByUserType(this.value);
    });

    // ============================================
    // SEARCH
    // ============================================
    document.getElementById("feedbackSearch")?.addEventListener("input", function(e) {
        searchTerm = e.target.value;
        loadFeedbacks();
    });

    // ============================================
    // PG FILTER
    // ============================================
    document.getElementById("pgFilter")?.addEventListener("change", function() {
        filterByPg(this.value);
    });

    // ============================================
    // INIT
    // ============================================
    loadPGs();
    loadFeedbacks();
});