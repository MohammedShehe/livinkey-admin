document.addEventListener("DOMContentLoaded", () => {
  renderLayout("feedbacks", "Feedbacks Management", "View and manage all tenant feedback and ratings.");

  // ============================================
  // FEEDBACK DATA - Mock feedbacks from tenants
  // ============================================
  
  // Generate feedbacks for tenants who have ratings
  function generateMockFeedbacks() {
    const feedbacks = [];
    const tenants = LK.tenants.filter(t => t.role === "Tenant");
    
    // Only create feedbacks for some tenants
    const feedbackTenants = tenants.filter((_, i) => i % 2 === 0 || i === 0 || i === 3 || i === 5);
    
    const comments = [
      "Great place to stay! The facilities are well maintained and the staff is very helpful.",
      "Overall good experience. The room is spacious and the location is convenient.",
      "Decent PG, but maintenance response could be faster. The amenities are good though.",
      "Excellent living experience! The management is very responsive and the place is clean.",
      "Good value for money. The room is comfortable and the food is decent.",
      "The PG is well managed. The Wi-Fi is fast and the common areas are clean.",
      "Average experience. The room is okay but the kitchen could be better maintained.",
      "Wonderful stay! The staff is friendly and the facilities are top-notch.",
      "The PG is good but the rent is a bit high for the amenities provided.",
      "Excellent location and great facilities. Highly recommended for students.",
      "The maintenance team is very responsive. Any issues are fixed quickly.",
      "Good place but the noise from the nearby construction is bothersome.",
      "Amazing experience! The community here is great and the PG is well-run.",
      "The PG is clean and well-maintained. The food is also good.",
      "Decent place but the room could use better ventilation.",
      "Perfect for students! Great location, good food, and friendly staff."
    ];
    
    let feedbackId = 1;
    
    feedbackTenants.forEach((tenant) => {
      // Generate random ratings (out of 10)
      const livingExperience = Math.floor(Math.random() * 5) + 6;
      const maintenanceHandling = Math.floor(Math.random() * 5) + 4;
      const communication = Math.floor(Math.random() * 5) + 5;
      const amenities = Math.floor(Math.random() * 5) + 4;
      const technologyHandling = Math.floor(Math.random() * 5) + 4;
      
      const overall = (livingExperience + maintenanceHandling + communication + amenities + technologyHandling) / 5;
      
      let sentiment = 'neutral';
      if (overall >= 7) sentiment = 'positive';
      else if (overall <= 5) sentiment = 'negative';
      
      let commentIndex;
      if (sentiment === 'positive') {
        commentIndex = Math.floor(Math.random() * 5) + 8;
      } else if (sentiment === 'negative') {
        commentIndex = Math.floor(Math.random() * 5) + 2;
      } else {
        commentIndex = Math.floor(Math.random() * 3) + 6;
      }
      
      const submittedDate = new Date();
      submittedDate.setDate(submittedDate.getDate() - Math.floor(Math.random() * 60));
      
      const pg = LK.pgs.find(p => p.id === tenant.pgId);
      
      feedbacks.push({
        id: "F" + String(feedbackId++).padStart(3, '0'),
        tenantId: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone || "9876543210",
        pgId: tenant.pgId,
        pgName: pg ? pg.name : "Unknown PG",
        roomNo: tenant.roomNo,
        nationality: tenant.nationality,
        gender: tenant.gender,
        residency: tenant.residency,
        ratings: {
          livingExperience: livingExperience,
          maintenanceHandling: maintenanceHandling,
          communication: communication,
          amenities: amenities,
          technologyHandling: technologyHandling
        },
        overall: parseFloat(overall.toFixed(1)),
        sentiment: sentiment,
        comment: comments[commentIndex] || "No comment provided.",
        submittedDate: submittedDate.toISOString().split('T')[0]
      });
    });
    
    return feedbacks;
  }

  function getPgName(pgId) {
    const pg = LK.pgs.find(p => p.id === pgId);
    return pg ? pg.name : "—";
  }

  // Initialize feedbacks data
  LK.feedbacks = LK.feedbacks || generateMockFeedbacks();

  // ============================================
  // STATE
  // ============================================
  let currentFilter = "all";
  let currentPgFilter = "all";
  let searchTerm = "";

  // ============================================
  // POPULATE PG FILTER
  // ============================================
  function populatePgFilter() {
    const select = document.getElementById("pgFilter");
    if (!select) return;
    
    select.innerHTML = '<option value="all">All PGs</option>';
    
    LK.pgs.forEach(pg => {
      const option = document.createElement("option");
      option.value = pg.id;
      option.textContent = pg.name;
      select.appendChild(option);
    });
  }

  // ============================================
  // RENDER STATS
  // ============================================
  function renderStats(filteredFeedbacks) {
    const data = filteredFeedbacks || LK.feedbacks;
    const total = data.length;
    const positive = data.filter(f => f.sentiment === 'positive' || f.overall >= 7).length;
    const negative = data.filter(f => f.sentiment === 'negative' || f.overall <= 5).length;
    const avgOverall = total > 0 ? (data.reduce((sum, f) => sum + f.overall, 0) / total) : 0;
    
    const stats = [
      { 
        label: "Total Feedbacks", 
        value: total, 
        icon: "bi-chat-dots-fill", 
        color: "var(--lk-green)",
        filter: "all"
      },
      { 
        label: "Positive (7+)", 
        value: positive, 
        icon: "bi-emoji-smile-fill", 
        color: "var(--lk-green)",
        filter: "positive"
      },
      { 
        label: "Negative (≤5)", 
        value: negative, 
        icon: "bi-emoji-frown-fill", 
        color: "var(--danger)",
        filter: "negative"
      },
      { 
        label: "Avg Rating", 
        value: avgOverall.toFixed(1) + "/10", 
        icon: "bi-star-fill", 
        color: "var(--warning)",
        filter: "all"
      }
    ];
    
    document.getElementById("feedbackStats").innerHTML = stats.map(s => `
      <div class="col-6 col-md-3">
        <div class="stat-card stat-card-feedback" onclick="filterByStat('${s.filter}')">
          <div class="stat-icon" style="background:${s.color}22;color:${s.color};"><i class="bi ${s.icon}"></i></div>
          <div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
        </div>
      </div>`).join("");
  }

  // ============================================
  // RENDER FEEDBACK CARDS
  // ============================================
  function renderFeedbacks() {
    let feedbacks = [...LK.feedbacks];
    
    // Filter by PG
    if (currentPgFilter !== "all") {
      feedbacks = feedbacks.filter(f => f.pgId === currentPgFilter);
    }
    
    // Apply sentiment filter
    if (currentFilter === "positive") {
      feedbacks = feedbacks.filter(f => f.sentiment === 'positive' || f.overall >= 7);
    } else if (currentFilter === "negative") {
      feedbacks = feedbacks.filter(f => f.sentiment === 'negative' || f.overall <= 5);
    } else if (currentFilter === "national") {
      feedbacks = feedbacks.filter(f => f.residency === "National");
    } else if (currentFilter === "international") {
      feedbacks = feedbacks.filter(f => f.residency === "International");
    } else if (currentFilter === "male") {
      feedbacks = feedbacks.filter(f => f.gender === "Male");
    } else if (currentFilter === "female") {
      feedbacks = feedbacks.filter(f => f.gender === "Female");
    }
    
    // Apply search
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      feedbacks = feedbacks.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.roomNo.toLowerCase().includes(term) ||
        f.pgName.toLowerCase().includes(term) ||
        f.nationality.toLowerCase().includes(term) ||
        f.email.toLowerCase().includes(term)
      );
    }
    
    // Sort by date (newest first)
    feedbacks.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
    
    const container = document.getElementById("feedbacksContainer");
    
    if (feedbacks.length === 0) {
      container.innerHTML = '';
      document.getElementById("feedbacksEmpty").classList.remove("d-none");
    } else {
      document.getElementById("feedbacksEmpty").classList.add("d-none");
      container.innerHTML = feedbacks.map(f => {
        const sentimentLabel = f.sentiment === 'positive' ? 'Positive' : f.sentiment === 'negative' ? 'Negative' : 'Neutral';
        const sentimentClass = f.sentiment === 'positive' ? 'positive' : f.sentiment === 'negative' ? 'negative' : 'neutral';
        const stars = renderStars(f.overall);
        const submittedDate = new Date(f.submittedDate).toLocaleDateString('en-IN', { 
          day: 'numeric', month: 'short', year: 'numeric' 
        });
        
        return `
        <div class="feedback-card" onclick="openFeedbackDetail('${f.id}')" style="cursor:pointer;">
          <div class="feedback-header">
            <div>
              <div class="d-flex align-items-center gap-2">
                <span class="fw-semibold">${f.name}</span>
                <span class="text-muted-soft small">•</span>
                <span class="text-muted-soft small">${f.pgName}</span>
                <span class="text-muted-soft small">•</span>
                <span class="text-muted-soft small">Room ${f.roomNo}</span>
              </div>
              <div class="feedback-meta">
                <span><i class="bi bi-envelope"></i> ${f.email}</span>
                <span><i class="bi bi-phone"></i> ${f.phone || "—"}</span>
                <span><i class="bi bi-flag"></i> ${f.nationality}</span>
                <span><i class="bi bi-gender-${f.gender === 'Male' ? 'male' : 'female'}"></i> ${f.gender}</span>
                <span><i class="bi bi-calendar3"></i> ${submittedDate}</span>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <span class="sentiment-badge ${sentimentClass}">${f.sentiment === 'positive' ? '👍' : f.sentiment === 'negative' ? '👎' : '😐'} ${sentimentLabel}</span>
              <span class="fw-bold" style="font-size:1.1rem;color:${f.overall >= 7 ? 'var(--lk-green)' : f.overall <= 5 ? 'var(--danger)' : 'var(--warning)'}">${f.overall}/10</span>
            </div>
          </div>
          
          <div class="ratings-grid">
            <div class="rating-item">
              <span class="label">Living Experience</span>
              <span class="value">${f.ratings.livingExperience}/10</span>
            </div>
            <div class="rating-item">
              <span class="label">Maintenance</span>
              <span class="value">${f.ratings.maintenanceHandling}/10</span>
            </div>
            <div class="rating-item">
              <span class="label">Communication</span>
              <span class="value">${f.ratings.communication}/10</span>
            </div>
            <div class="rating-item">
              <span class="label">Amenities</span>
              <span class="value">${f.ratings.amenities}/10</span>
            </div>
            <div class="rating-item">
              <span class="label">Technology</span>
              <span class="value">${f.ratings.technologyHandling}/10</span>
            </div>
          </div>
          
          ${f.comment ? `<div class="feedback-comment">${f.comment}</div>` : ''}
        </div>`;
      }).join("");
    }
    
    // Update stats with filtered data
    renderStats(feedbacks);
  }

  function renderStars(overall) {
    const fullStars = Math.floor(overall / 2);
    const halfStar = overall % 2 >= 1 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;
    
    let html = '';
    for (let i = 0; i < fullStars; i++) {
      html += '<i class="bi bi-star-fill"></i>';
    }
    if (halfStar) {
      html += '<i class="bi bi-star-half"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
      html += '<i class="bi bi-star"></i>';
    }
    return `<span class="rating-stars">${html}</span>`;
  }

  // ============================================
  // FILTER FUNCTIONS
  // ============================================
  window.filterByStat = function(filter) {
    currentFilter = filter;
    // Update chip active state
    document.querySelectorAll('.chip-filter').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.filter === filter);
    });
    renderFeedbacks();
  };

  function filterByPg(pgId) {
    currentPgFilter = pgId;
    renderFeedbacks();
  }

  // ============================================
  // SEARCH
  // ============================================
  document.getElementById("feedbackSearch").addEventListener("input", (e) => {
    searchTerm = e.target.value;
    renderFeedbacks();
  });

  // ============================================
  // FILTER CHIPS
  // ============================================
  document.getElementById("filterChips").addEventListener("click", (e) => {
    const chip = e.target.closest('.chip-filter');
    if (!chip) return;
    
    const filter = chip.dataset.filter;
    currentFilter = filter;
    
    document.querySelectorAll('.chip-filter').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    
    renderFeedbacks();
  });

  // ============================================
  // PG FILTER
  // ============================================
  const pgFilter = document.getElementById("pgFilter");
  if (pgFilter) {
    populatePgFilter();
    pgFilter.addEventListener("change", (e) => {
      filterByPg(e.target.value);
    });
  }

  // ============================================
  // FEEDBACK DETAIL MODAL
  // ============================================
  const detailModal = new bootstrap.Modal(document.getElementById("feedbackDetailModal"));
  
  window.openFeedbackDetail = function(id) {
    const feedback = LK.feedbacks.find(f => f.id === id);
    if (!feedback) return;
    
    document.getElementById("detailName").textContent = feedback.name;
    document.getElementById("detailMeta").innerHTML = `
      ${feedback.pgName} • Room ${feedback.roomNo} • ${feedback.nationality} • ${feedback.gender} • 
      <i class="bi bi-envelope"></i> ${feedback.email} • 
      <i class="bi bi-phone"></i> ${feedback.phone || "—"} • 
      <i class="bi bi-calendar3"></i> ${new Date(feedback.submittedDate).toLocaleDateString('en-IN', { 
        day: 'numeric', month: 'short', year: 'numeric' 
      })}
    `;
    
    const sentimentLabel = feedback.sentiment === 'positive' ? 'Positive' : feedback.sentiment === 'negative' ? 'Negative' : 'Neutral';
    const sentimentClass = feedback.sentiment === 'positive' ? 'positive' : feedback.sentiment === 'negative' ? 'negative' : 'neutral';
    document.getElementById("detailSentiment").textContent = `${feedback.sentiment === 'positive' ? '👍' : feedback.sentiment === 'negative' ? '👎' : '😐'} ${sentimentLabel} • ${feedback.overall}/10`;
    document.getElementById("detailSentiment").className = `sentiment-badge ${sentimentClass}`;
    
    // Ratings breakdown
    const ratings = feedback.ratings;
    const ratingItems = [
      { label: 'Living Experience', value: ratings.livingExperience },
      { label: 'Maintenance Handling', value: ratings.maintenanceHandling },
      { label: 'Communication', value: ratings.communication },
      { label: 'Amenities', value: ratings.amenities },
      { label: 'Technology Handling', value: ratings.technologyHandling }
    ];
    
    document.getElementById("detailRatings").innerHTML = ratingItems.map(item => `
      <div class="breakdown-item">
        <span class="label">${item.label}</span>
        <span class="value" style="color:${item.value >= 7 ? 'var(--lk-green)' : item.value <= 5 ? 'var(--danger)' : 'var(--warning)'}">${item.value}/10</span>
      </div>
    `).join('');
    
    document.getElementById("detailComment").textContent = feedback.comment || "No comment provided.";
    
    detailModal.show();
  };

  // ============================================
  // DELETE FEEDBACK
  // ============================================
  const confirmModal = new bootstrap.Modal(document.getElementById("confirmModal"));
  let deleteTargetId = null;

  window.deleteFeedback = function(id) {
    const feedback = LK.feedbacks.find(f => f.id === id);
    if (!feedback) return;
    
    deleteTargetId = id;
    document.getElementById("confirmTitle").textContent = `Delete feedback from ${feedback.name}?`;
    document.getElementById("confirmBody").textContent = "This will permanently remove this feedback. This action cannot be undone.";
    document.getElementById("confirmActionBtn").onclick = function() {
      const btn = this;
      LOADER.show(btn, 'Deleting...');
      setTimeout(() => {
        LK.feedbacks = LK.feedbacks.filter(f => f.id !== deleteTargetId);
        confirmModal.hide();
        showToast(`Feedback from ${feedback.name} was deleted.`, "danger");
        renderFeedbacks();
        LOADER.hide(btn);
      }, 500);
    };
    confirmModal.show();
  };

  // ============================================
  // INIT
  // ============================================
  renderFeedbacks();
});