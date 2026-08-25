// Livinkey Admin - API Service Layer
// Complete backend integration for all admin modules

// ============ CONFIGURATION ============
const API_CONFIG = {
    baseURL: 'https://livinkey-backend-e15s.onrender.com/api',
    useMock: false
};

// ============ MOCK DATA (Only for testing) ============
const MOCK_RESPONSES = {
    'POST /auth/login': (data) => ({
        success: true,
        message: "OTP sent to your email. Please check and enter the code.",
        demoOTP: "123456"
    }),
    'POST /auth/verify-otp': (data) => {
        if (data.otp === '123456') {
            return {
                success: true,
                message: "OTP verified successfully.",
                token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InN1cGVyX2FkbWluIiwiZW1haWwiOiJhZG1pbkBsaXZpbmtleS5jb20iLCJpYXQiOjE3MjM3NjU0MzJ9.mock_signature",
                user: {
                    id: 1,
                    name: "Super Admin",
                    email: data.email || "admin@livinkey.com",
                    role: "super_admin",
                    permissions: {}
                }
            };
        }
        return { success: false, message: "Invalid OTP. Please try again." };
    },
    'POST /auth/resend-otp': (data) => ({
        success: true,
        message: "New OTP sent successfully. Demo OTP: 123456"
    }),
    'POST /auth/forgot-password': (data) => ({
        success: true,
        message: "OTP sent to your email for password reset."
    }),
    'POST /auth/verify-forgot-password-otp': (data) => {
        if (data.otp === '123456') {
            return {
                success: true,
                message: "OTP verified successfully.",
                resetToken: "mock_reset_token_12345"
            };
        }
        return { success: false, message: "Invalid OTP." };
    },
    'POST /auth/reset-password': (data) => ({
        success: true,
        message: "Password reset successfully."
    }),
    'GET /admins/dashboard': () => ({
        success: true,
        data: {
            greeting: "Good Morning",
            name: "Super Admin",
            email: "admin@livinkey.com",
            role: "super_admin",
            role_display: "Super Admin",
            message: "Good Morning, Super Admin! Welcome to Livinkey Admin Dashboard."
        }
    })
};

function getMockResponse(endpoint, method, data) {
    const key = `${method} ${endpoint}`;
    if (MOCK_RESPONSES[key]) {
        return MOCK_RESPONSES[key](data);
    }
    for (const [mockKey, handler] of Object.entries(MOCK_RESPONSES)) {
        const [mockMethod, mockEndpoint] = mockKey.split(' ');
        if (mockMethod === method && endpoint.startsWith(mockEndpoint.replace(/\*$/, ''))) {
            return handler(data);
        }
    }
    return { success: true, data: [], message: "Mock response" };
}

// ============ AUTH PAGE DETECTION ============
function isOnAuthPage() {
    const p = window.location.pathname;
    return p.includes('index.html') ||
           p.includes('otp-verify.html') ||
           p.includes('forgot-password.html') ||
           p === '/' ||
           p === '';
}

// ============ API REQUEST HELPER ============
async function apiRequest(endpoint, method, data = null, isFormData = false) {
    if (API_CONFIG.useMock) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return getMockResponse(endpoint, method, data);
    }

    // FIX: sessionStorage is the ONLY source of truth for the token.
    // No fallback to localStorage.
    let token = sessionStorage.getItem('lk_token');

    const headers = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!isFormData && data) {
        headers['Content-Type'] = 'application/json';
    }

    const config = {
        method: method,
        headers: headers,
        credentials: 'include'
    };

    if (data) {
        config.body = isFormData ? data : JSON.stringify(data);
    }

    let response;
    try {
        response = await fetch(`${API_CONFIG.baseURL}${endpoint}`, config);
    } catch (networkError) {
        throw {
            status: 0,
            message: '⚠️ We\'re having trouble connecting to our services right now. Please try again later.'
        };
    }

    let result;
    try {
        result = await response.json();
    } catch (parseError) {
        result = {};
    }

    if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
            // FIX: Clear sessionStorage on auth failure.
            // localStorage is also cleared for cleanup of legacy tokens.
            Auth.clear();
            Auth.clearLocalStorage();
            if (!isOnAuthPage()) {
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1200);
            }
        }
        throw {
            status: response.status,
            message: result.message || 'An error occurred',
            data: result
        };
    }

    return result;
}

// ============ PERMISSION UTILITIES ============
function getAdminPermissions() {
    const session = Auth.getSession();
    if (!session) return {};
    if (session.role === 'super_admin') {
        const allModules = ['tenants', 'guests', 'bills', 'pgs', 'maintenance', 'documents', 'feedbacks'];
        const perms = {};
        allModules.forEach(m => {
            perms[m] = { view: true, add: true, edit: true, delete: true };
        });
        return perms;
    }
    return session.permissions || {};
}

function hasPermission(module, action) {
    const session = Auth.getSession();
    if (session?.role === 'super_admin') return true;
    const permissions = getAdminPermissions();
    if (!permissions[module]) return false;
    return permissions[module][action] === true;
}

function canView(module) {
    return hasPermission(module, 'view');
}

function canAdd(module) {
    return hasPermission(module, 'add');
}

function canEdit(module) {
    return hasPermission(module, 'edit');
}

function canDelete(module) {
    return hasPermission(module, 'delete');
}

window.Permissions = {
    canView,
    canAdd,
    canEdit,
    canDelete,
    hasPermission,
    getAdminPermissions
};

// ============ API ENDPOINTS ============
const API = {
    auth: {
        login: (email, password) => 
            apiRequest('/auth/login', 'POST', { email, password }),
        verifyOTP: (email, otp) => 
            apiRequest('/auth/verify-otp', 'POST', { email, otp }),
        resendOTP: (email) => 
            apiRequest('/auth/resend-otp', 'POST', { email }),
        forgotPassword: (email) => 
            apiRequest('/auth/forgot-password', 'POST', { email }),
        verifyForgotOTP: (email, otp) => 
            apiRequest('/auth/verify-forgot-password-otp', 'POST', { email, otp }),
        resetPassword: (resetToken, password, confirmPassword) => 
            apiRequest('/auth/reset-password', 'POST', { resetToken, password, confirmPassword }),
        changePassword: (current_password, new_password, confirm_password) => 
            apiRequest('/auth/change-password', 'POST', { current_password, new_password, confirm_password }),
        validateToken: () => 
            apiRequest('/auth/validate', 'GET')
    },

    admins: {
        create: (data, file) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (file) formData.append('id_document', file);
            return apiRequest('/admins', 'POST', formData, true);
        },
        getAll: (search = '') => 
            apiRequest(`/admins?search=${encodeURIComponent(search)}`, 'GET'),
        getById: (id) => 
            apiRequest(`/admins/${id}`, 'GET'),
        update: (id, data, file) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (file) formData.append('id_document', file);
            return apiRequest(`/admins/${id}`, 'PUT', formData, true);
        },
        delete: (id) => 
            apiRequest(`/admins/${id}`, 'DELETE'),
        updatePermissions: (id, permissions) => 
            apiRequest(`/admins/${id}/permissions`, 'PUT', { permissions }),
        dashboard: () => 
            apiRequest('/admins/dashboard', 'GET')
    },

    tenants: {
        create: (data, files) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (files?.document) formData.append('document', files.document);
            if (files?.otherDocuments) {
                files.otherDocuments.forEach(f => formData.append('otherDocuments', f));
            }
            return apiRequest('/tenants', 'POST', formData, true);
        },
        getAll: (params = {}) => {
            const qs = new URLSearchParams();
            Object.keys(params).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    qs.append(k, params[k]);
                }
            });
            return apiRequest(`/tenants?${qs.toString()}`, 'GET');
        },
        getById: (id) => 
            apiRequest(`/tenants/${id}`, 'GET'),
        update: (id, data, files) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (files?.document) formData.append('document', files.document);
            if (files?.otherDocuments) {
                files.otherDocuments.forEach(f => formData.append('otherDocuments', f));
            }
            return apiRequest(`/tenants/${id}`, 'PUT', formData, true);
        },
        delete: (id) => 
            apiRequest(`/tenants/${id}`, 'DELETE'),
        stats: () => 
            apiRequest('/tenants/stats', 'GET'),
        guestStats: () => 
            apiRequest('/tenants/stats/guests', 'GET'),
        efrroStats: () => 
            apiRequest('/tenants/stats/efrro', 'GET'),
        efrroExpiring: (range = null) => 
            apiRequest(`/tenants/efrro/expiring${range ? `?daysRange=${range}` : ''}`, 'GET'),
        sendMessage: (id, message, subject) => 
            apiRequest(`/tenants/${id}/send-message`, 'POST', { message, subject }),
        login: (email, password) => 
            apiRequest('/tenants/auth/login', 'POST', { email, password }),
        changePassword: (current_password, new_password, confirm_password) => 
            apiRequest('/tenants/auth/change-password', 'POST', { current_password, new_password, confirm_password }),
        forgotPassword: (email) => 
            apiRequest('/tenants/auth/forgot-password', 'POST', { email }),
        verifyOTP: (email, otp) => 
            apiRequest('/tenants/auth/verify-otp', 'POST', { email, otp }),
        resetPassword: (resetToken, new_password, confirm_password) => 
            apiRequest('/tenants/auth/reset-password', 'POST', { resetToken, new_password, confirm_password }),
        home: () => 
            apiRequest('/tenants/home', 'GET'),
        profile: () => 
            apiRequest('/tenants/profile', 'GET')
    },

    guests: {
        register: (data) => 
            apiRequest('/guests/register', 'POST', data),
        login: (email, password) => 
            apiRequest('/guests/login', 'POST', { email, password }),
        forgotPassword: (email) => 
            apiRequest('/guests/forgot-password', 'POST', { email }),
        verifyOTP: (email, otp) => 
            apiRequest('/guests/verify-otp', 'POST', { email, otp }),
        resetPassword: (resetToken, new_password, confirm_password) => 
            apiRequest('/guests/reset-password', 'POST', { resetToken, new_password, confirm_password }),
        profile: () => 
            apiRequest('/guests/profile', 'GET'),
        updateProfile: (data) => 
            apiRequest('/guests/profile', 'PUT', data),
        changePassword: (current_password, new_password, confirm_password) => 
            apiRequest('/guests/change-password', 'POST', { current_password, new_password, confirm_password }),
        dashboard: () => 
            apiRequest('/guests/dashboard', 'GET'),
        notifications: {
            get: (limit = 50, offset = 0) => 
                apiRequest(`/guests/notifications?limit=${limit}&offset=${offset}`, 'GET'),
            unread: (limit = 20) => 
                apiRequest(`/guests/notifications/unread?limit=${limit}`, 'GET'),
            unreadCount: () => 
                apiRequest('/guests/notifications/unread/count', 'GET'),
            markRead: (id) => 
                apiRequest(`/guests/notifications/${id}/read`, 'PUT'),
            markAllRead: () => 
                apiRequest('/guests/notifications/read-all', 'PUT'),
            delete: (id) => 
                apiRequest(`/guests/notifications/${id}`, 'DELETE')
        },
        admin: {
            all: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/guests/admin/all?${qs.toString()}`, 'GET');
            },
            stats: () => 
                apiRequest('/guests/admin/stats', 'GET'),
            update: (id, data) => 
                apiRequest(`/guests/admin/${id}`, 'PUT', data),
            delete: (id) => 
                apiRequest(`/guests/admin/${id}`, 'DELETE'),
            sendMessage: (id, message, subject) => 
                apiRequest(`/guests/admin/${id}/send-message`, 'POST', { message, subject })
        }
    },

    bills: {
        create: (data, files) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (files?.meterImage) formData.append('meterImage', files.meterImage);
            if (files?.paymentQr) formData.append('paymentQr', files.paymentQr);
            if (files?.adminQr) formData.append('adminQr', files.adminQr);
            return apiRequest('/bills', 'POST', formData, true);
        },
        getAll: (params = {}) => {
            const qs = new URLSearchParams();
            Object.keys(params).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    qs.append(k, params[k]);
                }
            });
            return apiRequest(`/bills?${qs.toString()}`, 'GET');
        },
        getById: (id) => 
            apiRequest(`/bills/${id}`, 'GET'),
        getByTenant: (tenantId) => 
            apiRequest(`/bills/tenant/${tenantId}`, 'GET'),
        stats: () => 
            apiRequest('/bills/stats', 'GET'),
        unpaidTenants: () => 
            apiRequest('/bills/unpaid-tenants', 'GET'),
        processDelayed: () => 
            apiRequest('/bills/process-delayed', 'POST'),
        addPayment: (id, data, file) => {
            if (file) {
                const formData = new FormData();
                Object.keys(data).forEach(k => formData.append(k, data[k]));
                formData.append('payment_proof', file);
                return apiRequest(`/bills/${id}/payment`, 'POST', formData, true);
            }
            return apiRequest(`/bills/${id}/payment`, 'POST', data);
        },
        sendCustomMessage: (id, subject, message, file) => {
            const formData = new FormData();
            formData.append('subject', subject);
            formData.append('message', message);
            if (file) formData.append('adminQr', file);
            return apiRequest(`/bills/${id}/send-message`, 'POST', formData, true);
        },
        cashPayments: (params = {}) => {
            const qs = new URLSearchParams();
            Object.keys(params).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    qs.append(k, params[k]);
                }
            });
            return apiRequest(`/bills/cash-payments?${qs.toString()}`, 'GET');
        },
        requestCashOTP: (id, data) => 
            apiRequest(`/bills/${id}/cash-payment/request-otp`, 'POST', data),
        verifyCash: (id, data) => 
            apiRequest(`/bills/${id}/cash-payment/verify`, 'POST', data),

        paymentProofs: {
            stats: () => 
                apiRequest('/bills/payment-proofs/stats', 'GET'),
            getAll: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/bills/payment-proofs?${qs.toString()}`, 'GET');
            },
            getById: (id) => 
                apiRequest(`/bills/payment-proofs/${id}`, 'GET'),
            verify: (id, data) => {
                return apiRequest(`/bills/payment-proofs/${id}/verify`, 'PUT', data);
            },
            reject: (id, admin_notes = null) => 
                apiRequest(`/bills/payment-proofs/${id}/reject`, 'PUT', { admin_notes }),
            delete: (id) => 
                apiRequest(`/bills/payment-proofs/${id}`, 'DELETE')
        },

        fineAdjustment: {
            adjust: (billId, data) => 
                apiRequest(`/bills/${billId}/fine-adjust`, 'PUT', data),
            getHistory: (billId) => 
                apiRequest(`/bills/${billId}/fine-adjustments`, 'GET'),
            getAll: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/bills/fine-adjustments/all?${qs.toString()}`, 'GET');
            }
        }
    },

    pgs: {
        create: (data, files) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => {
                if (typeof data[k] === 'object') {
                    formData.append(k, JSON.stringify(data[k]));
                } else {
                    formData.append(k, data[k]);
                }
            });
            if (files?.images) {
                files.images.forEach(f => formData.append('images', f));
            }
            if (files?.paymentQr) formData.append('paymentQr', files.paymentQr);
            return apiRequest('/pgs', 'POST', formData, true);
        },
        getAll: (params = {}) => {
            const qs = new URLSearchParams();
            Object.keys(params).forEach(k => {
                if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                    qs.append(k, params[k]);
                }
            });
            return apiRequest(`/pgs?${qs.toString()}`, 'GET');
        },
        getById: (id) => 
            apiRequest(`/pgs/${id}`, 'GET'),
        update: (id, data, files) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => {
                if (typeof data[k] === 'object') {
                    formData.append(k, JSON.stringify(data[k]));
                } else {
                    formData.append(k, data[k]);
                }
            });
            if (files?.images) {
                files.images.forEach(f => formData.append('images', f));
            }
            if (files?.paymentQr) formData.append('paymentQr', files.paymentQr);
            return apiRequest(`/pgs/${id}`, 'PUT', formData, true);
        },
        delete: (id) => 
            apiRequest(`/pgs/${id}`, 'DELETE'),
        toggleStatus: (id, is_active) => 
            apiRequest(`/pgs/${id}/status`, 'PATCH', { is_active }),
        stats: () => 
            apiRequest('/pgs/stats', 'GET')
    },

    documents: {
        upload: (document_type, file) => {
            const formData = new FormData();
            formData.append('document_type', document_type);
            formData.append('document', file);
            return apiRequest('/documents/upload', 'POST', formData, true);
        },
        getMyDocuments: () => 
            apiRequest('/documents/my-documents', 'GET'),
        getTypes: () => 
            apiRequest('/documents/types', 'GET'),
        admin: {
            getAll: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/documents/admin/all?${qs.toString()}`, 'GET');
            },
            getByTenant: (tenantId) => 
                apiRequest(`/documents/admin/tenant/${tenantId}`, 'GET'),
            delete: (documentId) => 
                apiRequest(`/documents/admin/${documentId}`, 'DELETE'),
            deleteAll: (tenantId) => 
                apiRequest(`/documents/admin/tenant/${tenantId}/all`, 'DELETE'),
            download: (documentIds) => 
                apiRequest('/documents/admin/download', 'POST', { documentIds }),
            downloadSingle: (documentId) => 
                apiRequest(`/documents/admin/${documentId}/download`, 'GET')
        }
    },

    maintenance: {
        create: (data, file) => {
            const formData = new FormData();
            Object.keys(data).forEach(k => formData.append(k, data[k]));
            if (file) formData.append('image', file);
            return apiRequest('/maintenance/request', 'POST', formData, true);
        },
        getMyRequests: (status = null) => 
            apiRequest(`/maintenance/my-requests${status ? `?status=${status}` : ''}`, 'GET'),
        getMyStats: () => 
            apiRequest('/maintenance/my-stats', 'GET'),
        admin: {
            getAll: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/maintenance/admin/all?${qs.toString()}`, 'GET');
            },
            stats: (pg_id = null) => 
                apiRequest(`/maintenance/admin/stats${pg_id ? `?pg_id=${pg_id}` : ''}`, 'GET'),
            getById: (id) => 
                apiRequest(`/maintenance/admin/${id}`, 'GET'),
            start: (id) => 
                apiRequest(`/maintenance/admin/${id}/start`, 'PUT'),
            complete: (id) => 
                apiRequest(`/maintenance/admin/${id}/complete`, 'PUT'),
            delete: (id) => 
                apiRequest(`/maintenance/admin/${id}`, 'DELETE')
        }
    },

    feedbacks: {
        submit: (data) => 
            apiRequest('/feedbacks/submit', 'POST', data),
        getMyFeedback: () => 
            apiRequest('/feedbacks/my-feedback', 'GET'),
        status: () => 
            apiRequest('/feedbacks/status', 'GET'),
        publicReviews: () => 
            apiRequest('/feedbacks/public/pg-reviews', 'GET'),
        guest: {
            submit: (data) => 
                apiRequest('/feedbacks/guest/submit', 'POST', data),
            getMyFeedback: () => 
                apiRequest('/feedbacks/guest/my-feedback', 'GET'),
            status: () => 
                apiRequest('/feedbacks/guest/status', 'GET'),
        },
        public: {
            submit: (data) => 
                apiRequest('/feedbacks/public/submit', 'POST', data),
            status: (email, phone) => 
                apiRequest(`/feedbacks/public/status?email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`, 'GET'),
        },
        admin: {
            stats: () => 
                apiRequest('/feedbacks/admin/stats', 'GET'),
            all: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/feedbacks/admin/all?${qs.toString()}`, 'GET');
            },
            delete: (id) => 
                apiRequest(`/feedbacks/admin/${id}`, 'DELETE')
        }
    },

    notifications: {
        get: (limit = 50, offset = 0) => 
            apiRequest(`/notifications?limit=${limit}&offset=${offset}`, 'GET'),
        unread: (limit = 20) => 
            apiRequest(`/notifications/unread?limit=${limit}`, 'GET'),
        unreadCount: () => 
            apiRequest('/notifications/unread/count', 'GET'),
        markRead: (id) => 
            apiRequest(`/notifications/${id}/read`, 'PUT'),
        markAllRead: () => 
            apiRequest('/notifications/read-all', 'PUT'),
        delete: (id) => 
            apiRequest(`/notifications/${id}`, 'DELETE')
    },

    tenantNotifications: {
        get: (limit = 50, offset = 0) => 
            apiRequest(`/tenant-notifications?limit=${limit}&offset=${offset}`, 'GET'),
        unread: (limit = 20) => 
            apiRequest(`/tenant-notifications/unread?limit=${limit}`, 'GET'),
        unreadCount: () => 
            apiRequest('/tenant-notifications/unread/count', 'GET'),
        markRead: (id) => 
            apiRequest(`/tenant-notifications/${id}/read`, 'PUT'),
        markAllRead: () => 
            apiRequest('/tenant-notifications/read-all', 'PUT'),
        delete: (id) => 
            apiRequest(`/tenant-notifications/${id}`, 'DELETE')
    },

    payments: {
        generateLink: (billId) => 
            apiRequest(`/payments/generate/${billId}`, 'POST'),
        status: (transactionId) => 
            apiRequest(`/payments/status/${transactionId}`, 'GET'),
        history: (tenantId) => 
            apiRequest(`/payments/history/${tenantId}`, 'GET'),
        webhook: (gateway, data) => 
            apiRequest(`/payments/webhook/${gateway}`, 'POST', data),
        receiptUrl: (type, paymentId) => {
            const token = Auth.getToken();
            return `${API_CONFIG.baseURL}/payments/receipt/${type}/${paymentId}?token=${encodeURIComponent(token || '')}`;
        },
        downloadUrl: (type, paymentId) => {
            const token = Auth.getToken();
            return `${API_CONFIG.baseURL}/payments/receipt/${type}/${paymentId}/download?token=${encodeURIComponent(token || '')}`;
        },
        tenant: {
            bill: () => 
                apiRequest('/tenant-payments/bill', 'GET'),
            proof: (bill_id, transaction_id, amount_paid, file) => {
                const formData = new FormData();
                formData.append('bill_id', bill_id);
                formData.append('transaction_id', transaction_id);
                formData.append('amount_paid', amount_paid);
                formData.append('payment_screenshot', file);
                return apiRequest('/tenant-payments/proof', 'POST', formData, true);
            },
            history: () => 
                apiRequest('/tenant-payments/history', 'GET'),
            receipt: (type, paymentId) => 
                apiRequest(`/tenant-payments/receipt/${type}/${paymentId}`, 'GET'),
            downloadReceipt: (type, paymentId) => 
                apiRequest(`/tenant-payments/receipt/${type}/${paymentId}/download`, 'GET')
        }
    },

    public: {
        welcome: () => 
            apiRequest('/public/welcome', 'GET'),
        pgs: {
            all: (params = {}) => {
                const qs = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
                        qs.append(k, params[k]);
                    }
                });
                return apiRequest(`/public/pgs?${qs.toString()}`, 'GET');
            },
            getById: (id) => 
                apiRequest(`/public/pgs/${id}`, 'GET'),
            stats: () => 
                apiRequest('/public/pgs/stats', 'GET')
        }
    }
};

// ============ EXPOSE GLOBALLY ============
window.API = API;
window.API_CONFIG = API_CONFIG;
window.showToast = showToast;
window.fmtINR = fmtINR;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;

// ============ FORMATTING UTILITY ============
function fmtINR(n) {
    return '₹' + Number(n).toLocaleString('en-IN');
}

function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============ TOAST UTILITY ============
function showToast(message, type = 'success') {
    const icons = {
        success: 'bi-check-circle-fill',
        info: 'bi-info-circle-fill',
        danger: 'bi-x-circle-fill',
        warning: 'bi-exclamation-triangle-fill'
    };
    const colors = {
        success: '#4F8F2E',
        info: '#3E7CB1',
        danger: '#D9483F',
        warning: '#E2A238'
    };
    
    let container = document.getElementById('lkToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'lkToastContainer';
        container.className = 'toast-lk d-flex flex-column gap-2';
        document.body.appendChild(container);
    }
    
    const el = document.createElement('div');
    el.className = 'fade-in';
    el.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow-lg);padding:.85rem 1.1rem;display:flex;gap:.6rem;align-items:flex-start;min-width:280px;max-width:360px;';
    el.innerHTML = `<i class="bi ${icons[type]}" style="color:${colors[type]};font-size:1.1rem;margin-top:.1rem;"></i><div style="font-size:.87rem;color:var(--ink);">${message}</div>`;
    container.appendChild(el);
    setTimeout(() => {
        el.style.transition = '.3s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 300);
    }, 3800);
}

// ============ AUTH HELPER ============
const Auth = {
    // FIX: sessionStorage is the ONLY source of truth.
    // No fallback to localStorage.
    getToken: () => {
        return sessionStorage.getItem('lk_token');
    },
    
    setToken: (token) => {
        sessionStorage.setItem('lk_token', token);
        // Do NOT write to localStorage
    },
    
    getTokenFromStorage: () => {
        // FIX: Only sessionStorage - no fallback
        return sessionStorage.getItem('lk_token');
    },
    
    getSession: () => {
        try {
            const session = sessionStorage.getItem('lk_session');
            return session ? JSON.parse(session) : null;
        } catch {
            return null;
        }
    },
    
    setSession: (user) => {
        const userData = {
            ...user,
            permissions: user?.permissions || {}
        };
        sessionStorage.setItem('lk_session', JSON.stringify(userData));
        // Do NOT write to localStorage
    },
    
    // FIX: Clear sessionStorage only (the real session)
    clear: () => {
        sessionStorage.removeItem('lk_token');
        sessionStorage.removeItem('lk_session');
        sessionStorage.removeItem('lk_login_pending');
        sessionStorage.removeItem('lk_reset_pending');
        sessionStorage.removeItem('lk_change_password_pending');
    },
    
    // FIX: Separate method for localStorage cleanup (legacy tokens only)
    clearLocalStorage: () => {
        localStorage.removeItem('lk_token');
        localStorage.removeItem('lk_session');
    },
    
    // FIX: Clear both (for logout and hard reset)
    clearAll: () => {
        Auth.clear();
        Auth.clearLocalStorage();
    },
    
    isAuthenticated: () => {
        // FIX: sessionStorage is the ONLY check
        return !!sessionStorage.getItem('lk_token');
    },
    
    // FIX: Verify session with the backend
    verifySession: async () => {
        const token = Auth.getToken();
        if (!token) return false;
        
        try {
            // Try the dedicated validate endpoint first
            const res = await API.auth.validateToken();
            if (res.success) {
                return true;
            } else {
                Auth.clear();
                return false;
            }
        } catch (error) {
            // Fallback: try /admins/dashboard
            try {
                const res = await API.admins.dashboard();
                if (res.success) {
                    return true;
                } else {
                    Auth.clear();
                    return false;
                }
            } catch (fallbackError) {
                Auth.clear();
                return false;
            }
        }
    },
    
    logout: () => {
        Auth.clearAll();
        window.location.href = 'index.html';
    },
    
    pending: (key) => {
        try {
            return JSON.parse(sessionStorage.getItem(key));
        } catch {
            return null;
        }
    },
    
    setPending: (key, val) => {
        sessionStorage.setItem(key, JSON.stringify(val));
    },
    
    clearPending: (key) => {
        sessionStorage.removeItem(key);
    }
};

window.Auth = Auth;