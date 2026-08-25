// Livinkey Admin - Authentication Flow
// Full backend integration

if (typeof LOADER === 'undefined') {
    const LOADER = {
        show(button, text = null) {
            if (!button) return;
            button.disabled = true;
            button._originalText = button.innerHTML;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${text || 'Loading...'}`;
        },
        hide(button) {
            if (!button) return;
            button.disabled = false;
            if (button._originalText) {
                button.innerHTML = button._originalText;
            }
        }
    };
    window.LOADER = LOADER;
}

// ============================================
// LOGIN PAGE
// ============================================
function initLoginPage() {
    const form = document.getElementById("loginForm");
    if (!form) return;
    const errorBox = document.getElementById("loginError");

    // Check for change password requirement
    const changePasswordPending = Auth.pending("lk_change_password_pending");
    if (changePasswordPending) {
        showChangePasswordUI(changePasswordPending);
        return;
    }

    // FIX: If there's a session token, verify it with the backend before redirecting.
    // This prevents a stale token from bypassing login.
    if (Auth.isAuthenticated()) {
        Auth.verifySession().then(isValid => {
            if (isValid) {
                window.location.href = "tenants.html";
            } else {
                // Token was invalid or expired - already cleared by verifySession
                // Stay on login page
            }
        }).catch(() => {
            // Any error means we should stay on login page
            Auth.clear();
        });
        return;
    }

    // FIX: If there's a token in localStorage but not sessionStorage, it's a legacy
    // "remember me" token. Do NOT auto-restore - force a fresh login.
    const localToken = localStorage.getItem('lk_token');
    if (localToken && !sessionStorage.getItem('lk_token')) {
        // Clean up legacy localStorage token
        Auth.clearLocalStorage();
    }

    document.getElementById("togglePwd")?.addEventListener("click", function() {
        const pwd = document.getElementById("password");
        const isPwd = pwd.type === "password";
        pwd.type = isPwd ? "text" : "password";
        this.querySelector("i").className = isPwd ? "bi bi-eye-slash" : "bi bi-eye";
    });

    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        errorBox.classList.add("d-none");
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Signing in...');

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        try {
            const res = await API.auth.login(email, password);
            
            if (res.success) {
                // Check if admin must change password
                if (res.must_change_password) {
                    Auth.setPending("lk_change_password_pending", {
                        email: email,
                        token: res.token,
                        user: res.user
                    });
                    if (res.token) {
                        Auth.setToken(res.token);
                    }
                    showChangePasswordUI({
                        email: email,
                        token: res.token,
                        user: res.user,
                        name: res.user?.name || 'Admin'
                    });
                    LOADER.hide(btn);
                    return;
                }

                Auth.setPending("lk_login_pending", { email, purpose: "login" });
                if (res.demoOTP) {
                    showToast(`📧 Demo OTP: ${res.demoOTP}. Check your email for the actual code.`, "info");
                } else {
                    showToast("📧 OTP sent to your email. Please check and enter the code.", "info");
                }
                window.location.href = "otp-verify.html";
            } else {
                errorBox.textContent = res.message || "Invalid email or password.";
                errorBox.classList.remove("d-none");
                LOADER.hide(btn);
            }
        } catch (error) {
            console.error("Login error:", error);
            errorBox.textContent = error.message || "An error occurred. Please try again.";
            errorBox.classList.remove("d-none");
            LOADER.hide(btn);
        }
    });
}

// ============================================
// CHANGE PASSWORD UI (When must_change_password is true)
// ============================================
function showChangePasswordUI(data) {
    const loginCard = document.querySelector('.auth-card');
    if (!loginCard) return;

    window._changePasswordData = data;

    loginCard.innerHTML = `
        <div class="d-lg-none text-center mb-4">
            <img src="assets/img/black_logo.png" height="34" alt="Livinkey">
        </div>
        <span class="step-eyebrow">Security Required</span>
        <h1 class="h3 mb-1">Change Your Password</h1>
        <p class="text-muted-soft mb-4">As a new admin, you must change your password before continuing.</p>

        <div class="alert alert-danger py-2 small d-none" id="changePwdError"></div>
        <div class="alert alert-success py-2 small d-none" id="changePwdSuccess"></div>

        <form id="changePwdForm">
            <div class="mb-3">
                <label class="form-label">Current Password</label>
                <input type="password" class="form-control" id="changeCurrentPwd" placeholder="Enter your current password" required>
            </div>
            <div class="mb-3">
                <label class="form-label">New Password</label>
                <input type="password" class="form-control" id="changeNewPwd" placeholder="At least 6 characters" required>
            </div>
            <div class="mb-4">
                <label class="form-label">Confirm New Password</label>
                <input type="password" class="form-control" id="changeConfirmPwd" placeholder="Re-enter new password" required>
            </div>
            <button type="submit" class="btn btn-brand w-100 py-2">Change Password <i class="bi bi-arrow-right ms-1"></i></button>
        </form>

        <div class="mt-3">
            <p class="small text-muted-soft mb-0">You'll need to login again after changing your password.</p>
        </div>
    `;

    document.getElementById("changePwdForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        const errorBox = document.getElementById("changePwdError");
        const successBox = document.getElementById("changePwdSuccess");
        errorBox.classList.add("d-none");
        successBox.classList.add("d-none");

        const currentPassword = document.getElementById("changeCurrentPwd").value;
        const newPassword = document.getElementById("changeNewPwd").value;
        const confirmPassword = document.getElementById("changeConfirmPwd").value;

        if (newPassword.length < 6) {
            errorBox.textContent = "Password must be at least 6 characters long.";
            errorBox.classList.remove("d-none");
            return;
        }

        if (newPassword !== confirmPassword) {
            errorBox.textContent = "Passwords do not match.";
            errorBox.classList.remove("d-none");
            return;
        }

        LOADER.show(btn, 'Changing password...');

        try {
            const token = window._changePasswordData?.token || Auth.getToken();
            if (token) {
                Auth.setToken(token);
            }

            const res = await API.auth.changePassword(currentPassword, newPassword, confirmPassword);
            
            if (res.success) {
                successBox.textContent = res.message || "Password changed successfully. Please login again.";
                successBox.classList.remove("d-none");
                
                Auth.clearPending("lk_change_password_pending");
                Auth.clearAll();
                
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2000);
            } else {
                errorBox.textContent = res.message || "Failed to change password.";
                errorBox.classList.remove("d-none");
            }
        } catch (error) {
            console.error("Change password error:", error);
            errorBox.textContent = error.message || "An error occurred. Please try again.";
            errorBox.classList.remove("d-none");
        }
        LOADER.hide(btn);
    });
}

// ============================================
// OTP VERIFICATION PAGE
// ============================================
function initOtpPage() {
    const wrap = document.getElementById("otpForm");
    if (!wrap) return;

    const changePwdPending = Auth.pending("lk_change_password_pending");
    if (changePwdPending) {
        showChangePasswordUI(changePwdPending);
        return;
    }

    // FIX: If there's a session token, verify it with the backend.
    if (Auth.isAuthenticated()) {
        Auth.verifySession().then(isValid => {
            if (isValid) {
                window.location.href = "tenants.html";
            } else {
                // Token invalid - stay on OTP page
                Auth.clear();
            }
        }).catch(() => {
            Auth.clear();
        });
        return;
    }

    const loginPending = Auth.pending("lk_login_pending");
    const resetPending = Auth.pending("lk_reset_pending");
    const purpose = loginPending?.purpose === "login" ? "login" : (resetPending ? "reset" : null);

    if (!purpose) {
        window.location.href = "index.html";
        return;
    }

    const email = purpose === "login" ? loginPending.email : resetPending.email;
    document.getElementById("otpEmailTarget").textContent = email;

    const inputs = Array.from(document.querySelectorAll(".otp-box"));
    inputs.forEach((box, i) => {
        box.addEventListener("input", () => {
            box.value = box.value.replace(/[^0-9]/g, "").slice(0, 1);
            if (box.value && inputs[i + 1]) inputs[i + 1].focus();
        });
        box.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !box.value && inputs[i - 1]) inputs[i - 1].focus();
        });
    });

    const errorBox = document.getElementById("otpError");

    inputs.forEach((box, i) => {
        box.addEventListener("input", () => {
            const allFilled = inputs.every(b => b.value.length === 1);
            if (allFilled) {
                wrap.dispatchEvent(new Event("submit"));
            }
        });
    });

    wrap.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Verifying...');

        const code = inputs.map(i => i.value).join("");
        if (code.length < 6) {
            errorBox.textContent = "Please enter the complete 6-digit code.";
            errorBox.classList.remove("d-none");
            LOADER.hide(btn);
            return;
        }

        try {
            let res;
            if (purpose === "login") {
                res = await API.auth.verifyOTP(email, code);
            } else {
                res = await API.auth.verifyForgotOTP(email, code);
            }

            if (res.success) {
                errorBox.classList.add("d-none");
                if (purpose === "login") {
                    if (res.token) {
                        // FIX: Store token in sessionStorage only (tab-specific)
                        Auth.setToken(res.token);
                        const userData = {
                            ...res.user,
                            permissions: res.user?.permissions || {}
                        };
                        Auth.setSession(userData);
                        Auth.clearPending("lk_login_pending");
                        showToast("✅ Login successful! Redirecting...", "success");
                        setTimeout(() => {
                            window.location.href = "tenants.html";
                        }, 500);
                    } else {
                        showToast("Login successful but no token received.", "warning");
                        if (res.user) {
                            Auth.setSession({
                                ...res.user,
                                permissions: res.user?.permissions || {}
                            });
                            setTimeout(() => {
                                window.location.href = "tenants.html";
                            }, 500);
                        }
                    }
                } else {
                    Auth.setPending("lk_reset_pending", { 
                        email: email, 
                        verified: true,
                        resetToken: res.resetToken 
                    });
                    showToast("✅ OTP verified. Please set a new password.", "success");
                    setTimeout(() => {
                        window.location.href = "forgot-password.html#reset";
                    }, 500);
                }
            } else {
                errorBox.textContent = res.message || "Invalid OTP. Please try again.";
                errorBox.classList.remove("d-none");
                inputs.forEach(i => i.value = "");
                inputs[0].focus();
            }
        } catch (error) {
            console.error("OTP verification error:", error);
            errorBox.textContent = error.message || "An error occurred. Please try again.";
            errorBox.classList.remove("d-none");
        }
        LOADER.hide(btn);
    });

    document.getElementById("resendOtp")?.addEventListener("click", async function(e) {
        e.preventDefault();
        try {
            let res;
            if (purpose === "login") {
                res = await API.auth.resendOTP(email);
            } else {
                res = await API.auth.forgotPassword(email);
            }
            if (res.success) {
                if (res.demoOTP) {
                    showToast(`📧 New Demo OTP: ${res.demoOTP}`, "info");
                } else {
                    showToast(res.message || "New OTP sent successfully.", "success");
                }
            } else {
                showToast(res.message || "Failed to resend OTP.", "danger");
            }
        } catch (error) {
            console.error("Resend OTP error:", error);
            showToast("Error resending OTP: " + error.message, "danger");
        }
    });

    const backBtn = document.getElementById('backToSignInBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            Auth.clearPending('lk_login_pending');
            Auth.clearPending('lk_reset_pending');
        });
    }
}

// ============================================
// FORGOT PASSWORD PAGE
// ============================================
function initForgotPasswordPage() {
    const stepEmail = document.getElementById("stepEmail");
    if (!stepEmail) return;

    const stepReset = document.getElementById("stepReset");
    const stepDone = document.getElementById("stepDone");
    const resetPending = Auth.pending("lk_reset_pending");

    function show(step) {
        [stepEmail, stepReset, stepDone].forEach(s => s.classList.add("d-none"));
        step.classList.remove("d-none");
    }

    if (window.location.hash === "#reset" && resetPending?.verified) {
        show(stepReset);
        if (resetPending.resetToken) {
            const tokenInput = document.getElementById("resetToken");
            if (tokenInput) tokenInput.value = resetPending.resetToken;
        }
    } else {
        show(stepEmail);
    }

    document.getElementById("emailForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Sending OTP...');

        const email = document.getElementById("fpEmail").value.trim().toLowerCase();
        const errorBox = document.getElementById("fpEmailError");

        try {
            const res = await API.auth.forgotPassword(email);
            if (res.success) {
                errorBox.classList.add("d-none");
                Auth.setPending("lk_reset_pending", { email, verified: false });
                if (res.demoOTP) {
                    showToast(`📧 Demo OTP: ${res.demoOTP}. Check your email for the actual code.`, "info");
                } else {
                    showToast("📧 OTP sent to your email for password reset.", "info");
                }
                setTimeout(() => {
                    window.location.href = "otp-verify.html";
                }, 500);
            } else {
                errorBox.textContent = res.message || "Email not found.";
                errorBox.classList.remove("d-none");
            }
        } catch (error) {
            console.error("Forgot password error:", error);
            errorBox.textContent = error.message || "An error occurred.";
            errorBox.classList.remove("d-none");
        }
        LOADER.hide(btn);
    });

    document.getElementById("resetForm")?.addEventListener("submit", async function(e) {
        e.preventDefault();
        const btn = this.querySelector('button[type="submit"]');
        LOADER.show(btn, 'Setting password...');

        const resetToken = document.getElementById("resetToken")?.value;
        const p1 = document.getElementById("newPwd").value;
        const p2 = document.getElementById("confirmPwd").value;
        const errorBox = document.getElementById("fpResetError");

        if (p1.length < 6) {
            errorBox.textContent = "Password must be at least 6 characters.";
            errorBox.classList.remove("d-none");
            LOADER.hide(btn);
            return;
        }
        if (p1 !== p2) {
            errorBox.textContent = "Passwords do not match.";
            errorBox.classList.remove("d-none");
            LOADER.hide(btn);
            return;
        }

        try {
            const res = await API.auth.resetPassword(resetToken, p1, p2);
            if (res.success) {
                errorBox.classList.add("d-none");
                Auth.clearPending("lk_reset_pending");
                show(stepDone);
                showToast(res.message || "Password reset successfully.", "success");
            } else {
                errorBox.textContent = res.message || "Failed to reset password.";
                errorBox.classList.remove("d-none");
            }
        } catch (error) {
            console.error("Reset password error:", error);
            errorBox.textContent = error.message || "An error occurred.";
            errorBox.classList.remove("d-none");
        }
        LOADER.hide(btn);
    });

    document.querySelectorAll('a[href="index.html"]').forEach(link => {
        link.addEventListener("click", function() {
            Auth.clearPending("lk_login_pending");
            Auth.clearPending("lk_reset_pending");
        });
    });
}

// ============================================
// INIT
// ============================================
document.addEventListener("DOMContentLoaded", () => {
    const isAuthPage = window.location.pathname.includes('index.html') || 
                       window.location.pathname.includes('otp-verify.html') ||
                       window.location.pathname.includes('forgot-password.html');
    
    if (!isAuthPage) {
        // FIX: Verify session with the backend before allowing access to any protected page
        if (Auth.isAuthenticated()) {
            Auth.verifySession().then(isValid => {
                if (!isValid) {
                    // Token invalid - redirect to login
                    window.location.href = 'index.html';
                }
                // If valid, continue - page will load normally
            }).catch(() => {
                window.location.href = 'index.html';
            });
        } else {
            // FIX: Check if there's a legacy token in localStorage but not session
            const localToken = localStorage.getItem('lk_token');
            if (localToken) {
                // Clean up legacy localStorage token
                Auth.clearLocalStorage();
            }
            window.location.href = 'index.html';
            return;
        }
    }
    
    initLoginPage();
    initOtpPage();
    initForgotPasswordPage();
});