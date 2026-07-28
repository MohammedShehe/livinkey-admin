/* ==========================================================================
   Livinkey Admin — Auth flow (frontend simulation)
   OTP is mocked as 123456 and shown in a toast, since there is no backend/SMS
   provider wired up in this frontend-only build.
   ========================================================================== */

const AUTH = {
  DEMO_OTP: "123456",

  session(){
    try { return JSON.parse(sessionStorage.getItem("lk_session")); } catch(e){ return null; }
  },
  setSession(email){
    const cred = LK.credentials[email];
    sessionStorage.setItem("lk_session", JSON.stringify({ email, role: cred.role, name: cred.name }));
  },
  logout(){
    sessionStorage.removeItem("lk_session");
    window.location.href = "index.html";
  },
  requireAuth(){
    if(!this.session()){
      window.location.href = "index.html";
    }
  },
  pending(key){
    try { return JSON.parse(sessionStorage.getItem(key)); } catch(e){ return null; }
  },
  setPending(key, val){ sessionStorage.setItem(key, JSON.stringify(val)); },
  clearPending(key){ sessionStorage.removeItem(key); }
};

/* ---------------- Login page ---------------- */
function initLoginPage(){
  const form = document.getElementById("loginForm");
  if(!form) return;
  const errorBox = document.getElementById("loginError");

  document.getElementById("togglePwd")?.addEventListener("click", function(){
    const pwd = document.getElementById("password");
    const isPwd = pwd.type === "password";
    pwd.type = isPwd ? "text" : "password";
    this.querySelector("i").className = isPwd ? "bi bi-eye-slash" : "bi bi-eye";
  });

  form.addEventListener("submit", function(e){
    e.preventDefault();
    errorBox.classList.add("d-none");
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const cred = LK.credentials[email];

    if(!cred || cred.password !== password){
      errorBox.textContent = "Incorrect email or password. Please try again.";
      errorBox.classList.remove("d-none");
      return;
    }
    AUTH.setPending("lk_login_pending", { email, purpose: "login" });
    window.location.href = "otp-verify.html";
  });
}

/* ---------------- OTP page (shared: login + forgot password) ---------------- */
function initOtpPage(){
  const wrap = document.getElementById("otpForm");
  if(!wrap) return;

  const loginPending = AUTH.pending("lk_login_pending");
  const resetPending = AUTH.pending("lk_reset_pending");
  const purpose = loginPending?.purpose === "login" ? "login" : (resetPending ? "reset" : null);

  if(!purpose){ window.location.href = "index.html"; return; }

  const email = purpose === "login" ? loginPending.email : resetPending.email;
  document.getElementById("otpEmailTarget").textContent = email;

  // demo OTP toast
  showToast(`Demo OTP sent to ${email}: <strong>${AUTH.DEMO_OTP}</strong>`, "info");

  const inputs = Array.from(document.querySelectorAll(".otp-box"));
  inputs.forEach((box, i) => {
    box.addEventListener("input", () => {
      box.value = box.value.replace(/[^0-9]/g, "").slice(0,1);
      if(box.value && inputs[i+1]) inputs[i+1].focus();
    });
    box.addEventListener("keydown", (e) => {
      if(e.key === "Backspace" && !box.value && inputs[i-1]) inputs[i-1].focus();
    });
  });

  const errorBox = document.getElementById("otpError");
  wrap.addEventListener("submit", function(e){
    e.preventDefault();
    const code = inputs.map(i => i.value).join("");
    if(code.length < 6){
      errorBox.textContent = "Please enter the complete 6-digit code.";
      errorBox.classList.remove("d-none");
      return;
    }
    if(code !== AUTH.DEMO_OTP){
      errorBox.textContent = "Incorrect OTP. Please try again.";
      errorBox.classList.remove("d-none");
      inputs.forEach(i => i.value = "");
      inputs[0].focus();
      return;
    }
    errorBox.classList.add("d-none");

    if(purpose === "login"){
      AUTH.clearPending("lk_login_pending");
      AUTH.setSession(email);
      window.location.href = "members.html";
    } else {
      AUTH.setPending("lk_reset_pending", { email, verified: true });
      window.location.href = "forgot-password.html#reset";
    }
  });

  document.getElementById("resendOtp")?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast(`A new demo OTP has been sent: <strong>${AUTH.DEMO_OTP}</strong>`, "info");
  });
}

/* ---------------- Forgot password page (3 steps) ---------------- */
function initForgotPasswordPage(){
  const stepEmail = document.getElementById("stepEmail");
  if(!stepEmail) return;

  const stepReset = document.getElementById("stepReset");
  const stepDone = document.getElementById("stepDone");
  const resetPending = AUTH.pending("lk_reset_pending");

  function show(step){
    [stepEmail, stepReset, stepDone].forEach(s => s.classList.add("d-none"));
    step.classList.remove("d-none");
  }

  if(window.location.hash === "#reset" && resetPending?.verified){
    show(stepReset);
  } else {
    show(stepEmail);
  }

  document.getElementById("emailForm").addEventListener("submit", function(e){
    e.preventDefault();
    const email = document.getElementById("fpEmail").value.trim().toLowerCase();
    const errorBox = document.getElementById("fpEmailError");
    if(!LK.credentials[email]){
      errorBox.textContent = "This email is not registered with Livinkey.";
      errorBox.classList.remove("d-none");
      return;
    }
    errorBox.classList.add("d-none");
    AUTH.setPending("lk_reset_pending", { email, verified: false });
    window.location.href = "otp-verify.html";
  });

  document.getElementById("resetForm").addEventListener("submit", function(e){
    e.preventDefault();
    const p1 = document.getElementById("newPwd").value;
    const p2 = document.getElementById("confirmPwd").value;
    const errorBox = document.getElementById("fpResetError");
    if(p1.length < 6){
      errorBox.textContent = "Password must be at least 6 characters.";
      errorBox.classList.remove("d-none");
      return;
    }
    if(p1 !== p2){
      errorBox.textContent = "Passwords do not match.";
      errorBox.classList.remove("d-none");
      return;
    }
    errorBox.classList.add("d-none");
    AUTH.clearPending("lk_reset_pending");
    show(stepDone);
  });
}

/* ---------------- Toast helper (used app-wide) ---------------- */
function showToast(message, type = "success"){
  const icons = { success: "bi-check-circle-fill", info: "bi-info-circle-fill", danger: "bi-x-circle-fill", warning: "bi-exclamation-triangle-fill" };
  const colors = { success: "var(--success)", info: "var(--info)", danger: "var(--danger)", warning: "var(--warning)" };
  let container = document.getElementById("lkToastContainer");
  if(!container){
    container = document.createElement("div");
    container.id = "lkToastContainer";
    container.className = "toast-lk d-flex flex-column gap-2";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = "fade-in";
  el.style.cssText = "background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:.85rem 1.1rem;display:flex;gap:.6rem;align-items:flex-start;min-width:280px;max-width:360px;";
  el.innerHTML = `<i class="bi ${icons[type]}" style="color:${colors[type]};font-size:1.1rem;margin-top:.1rem;"></i><div style="font-size:.87rem;color:var(--ink);">${message}</div>`;
  container.appendChild(el);
  setTimeout(() => { el.style.transition = ".3s"; el.style.opacity = "0"; el.style.transform = "translateX(20px)"; setTimeout(() => el.remove(), 300); }, 3800);
}

document.addEventListener("DOMContentLoaded", () => {
  initLoginPage();
  initOtpPage();
  initForgotPasswordPage();
});
