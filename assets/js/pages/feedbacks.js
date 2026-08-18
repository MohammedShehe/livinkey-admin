document.addEventListener("DOMContentLoaded", () => {
    renderLayout("feedbacks", "Feedbacks Management", "View and manage all tenant feedback and ratings.");

    // ============================================
    // PERMISSION CHECKS
    // ============================================
    const canViewFeedbacks = Permissions.canView('feedbacks');
    
    // Feedbacks are read-only in the backend (no add/edit/delete permissions)
    // So we only need to check view permission

    let feedbackData = [];
    let currentFilter = "all";
    let currentPgFilter = "all";
    let searchTerm = "";
    let pgList = [];

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
            if (currentFilter !== "all") params.type = currentFilter;
            if (currentPgFilter !== "all") params.pg_id = currentPgFilter;
            if (searchTerm) params.pg_name = searchTerm;

            const res = await API.feedbacks.admin.all(params);
            if (res.success) {
                feedbackData = res.data || [];
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
        const positive = feedbackData.filter(f => f.overall_rating >= 7).length;
        const negative = feedbackData.filter(f => f.overall_rating <= 5).length;
        const avgOverall = total > 0 ? (feedbackData.reduce((sum, f) => sum + (f.overall_rating || 0), 0) / total) : 0;

        const stats = [
            { label: "Total Feedbacks", value: total, icon: "bi-chat-dots-fill", color: "var(--lk-green)", filter: "all" },
            { label: "Positive (7+)", value: positive, icon: "bi-emoji-smile-fill", color: "var(--lk-green)", filter: "positive" },
            { label: "Negative (≤5)", value: negative, icon: "bi-emoji-frown-fill", color: "var(--danger)", filter: "negative" },
            { label: "Avg Rating", value: avgOverall.toFixed(1) + "/10", icon: "bi-star-fill", color: "var(--warning)", filter: "all" }
        ];

        document.getElementById("feedbackStats").innerHTML = stats.map(s => `
            <div class="col-6 col-md-3">
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
                            <span><i class="bi bi-flag"></i> ${f.nationality || '—'}</span>
                            <span><i class="bi bi-gender-${(f.gender || 'male') === 'Male' ? 'male' : 'female'}"></i> ${f.gender || '—'}</span>
                            <span><i class="bi bi-calendar3"></i> ${date}</span>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <span class="sentiment-badge ${sentimentClass}">${sentiment === 'positive' ? '👍' : sentiment === 'negative' ? '👎' : '😐'} ${sentimentLabel}</span>
                        <span class="fw-bold" style="font-size:1.1rem;color:${f.overall_rating >= 7 ? 'var(--lk-green)' : f.overall_rating <= 5 ? 'var(--danger)' : 'var(--warning)'}">${f.overall_rating || 0}/10</span>
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
        const f = feedbackData.find(x => x.id === id);
        if (!f) return;

        document.getElementById("detailName").textContent = f.tenant_name || '—';
        document.getElementById("detailMeta").innerHTML = `
            ${f.pg_name || '—'} • Room ${f.room_number || '—'} • ${f.nationality || '—'} • ${f.gender || '—'} •
            <i class="bi bi-envelope"></i> ${f.tenant_email || '—'} •
            <i class="bi bi-calendar3"></i> ${f.created_at ? formatDate(f.created_at) : '—'}
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
        detailModal.show();
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