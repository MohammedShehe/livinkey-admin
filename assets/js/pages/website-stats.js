document.addEventListener("DOMContentLoaded", () => {
  renderLayout("website_stats", "Website Stats", "Manual boost for public property & tenant counts");

  const alertEl = document.getElementById("statsAlert");
  const enabledEl = document.getElementById("manualEnabled");
  const propsEl = document.getElementById("manualProperties");
  const tenantsEl = document.getElementById("manualTenants");
  const saveBtn = document.getElementById("saveStatsBtn");
  const reloadBtn = document.getElementById("reloadStatsBtn");
  const fieldsWrap = document.getElementById("manualFields");

  function showAlert(msg, type = "success") {
    if (!alertEl) return;
    alertEl.innerHTML = `<div class="alert alert-${type} border-0 shadow-sm rounded-3">${msg}</div>`;
    setTimeout(() => { alertEl.innerHTML = ""; }, 4000);
  }

  function syncFieldsState() {
    const on = !!enabledEl.checked;
    propsEl.disabled = !on;
    tenantsEl.disabled = !on;
    fieldsWrap.style.opacity = on ? "1" : "0.55";
  }

  enabledEl.addEventListener("change", () => {
    syncFieldsState();
    updatePreviewLocal();
  });
  propsEl.addEventListener("input", updatePreviewLocal);
  tenantsEl.addEventListener("input", updatePreviewLocal);

  let livePgs = 0;
  let liveTenants = 0;

  function updatePreviewLocal() {
    const on = !!enabledEl.checked;
    const mP = Math.max(0, parseInt(propsEl.value || "0", 10) || 0);
    const mT = Math.max(0, parseInt(tenantsEl.value || "0", 10) || 0);
    document.getElementById("livePgs").textContent = livePgs;
    document.getElementById("liveTenants").textContent = liveTenants;
    document.getElementById("displayPgs").textContent = on ? livePgs + mP : livePgs;
    document.getElementById("displayTenants").textContent = on ? liveTenants + mT : liveTenants;
    document.getElementById("previewNote").textContent = on
      ? `Displayed = live (${livePgs} / ${liveTenants}) + manual (${mP} / ${mT}).`
      : "Displayed = live only (manual boost off).";
  }

  async function load() {
    try {
      const settingsRes = await API.siteSettings.getManualStats();
      if (settingsRes && settingsRes.success && settingsRes.data) {
        const d = settingsRes.data;
        enabledEl.checked = !!d.manual_stats_enabled;
        propsEl.value = d.manual_properties_count ?? 0;
        tenantsEl.value = d.manual_happy_tenants_count ?? 0;
      }

      const statsRes = await API.public.pgs.stats();      const s = (statsRes && (statsRes.data || statsRes)) || {};
      livePgs = Number(s.total_pgs || 0);
      liveTenants = Number(s.total_tenants || 0);

      syncFieldsState();
      updatePreviewLocal();
    } catch (e) {
      console.error(e);
      showAlert((e && e.message) || "Failed to load website stats settings", "danger");
    }
  }

  saveBtn.addEventListener("click", async () => {
    const payload = {
      manual_stats_enabled: !!enabledEl.checked,
      manual_properties_count: Math.max(0, parseInt(propsEl.value || "0", 10) || 0),
      manual_happy_tenants_count: Math.max(0, parseInt(tenantsEl.value || "0", 10) || 0),
    };
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Saving…';
    try {
      const res = await API.siteSettings.updateManualStats(payload);
      if (!res || !res.success) throw new Error((res && res.message) || "Save failed");
      showAlert("Settings saved. Public website will use the new numbers.");
      await load();
    } catch (e) {
      showAlert((e && e.message) || "Unable to save settings", "danger");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Save settings';
    }
  });

  reloadBtn.addEventListener("click", load);
  load();
});
