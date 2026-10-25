/*---------------------------------------------------------------------------------------------
 *  SHOORA TETHER Enterprise Admin Portal - Client Controller (TypeScript)
 *  Copyright (c) Cybershoora Pvt. Ltd. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
let API_BASE_URL = 'https://shooratether-backend.onrender.com';
let adminToken = localStorage.getItem('shoora_admin_token') || null;
let currentAdmin = JSON.parse(localStorage.getItem('shoora_admin_user') || 'null');
// Infinite scroll pagination state for Users
let currentPage = 1;
const currentLimit = 10;
let currentSearch = '';
let searchDebounceTimer = null;
let allUsers = [];
let totalUsersCount = 0;
let isLoadingMoreUsers = false;
// Infinite scroll pagination state for Payments
let currentPaymentPage = 1;
const currentPaymentLimit = 10;
let currentPaymentSearch = '';
let paymentSearchDebounceTimer = null;
let allPayments = [];
let totalPaymentsCount = 0;
let isLoadingMorePayments = false;
// Modal States
let activeModalUserId = null;
let currentActiveView = 'overview';
const ICONS = {
    google: `<svg width="14" height="14" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`,
    github: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`,
    email: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`
};
// Discover Backend Config
export async function initConfig() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            const data = await res.json();
            if (data.apiBaseUrl) {
                API_BASE_URL = data.apiBaseUrl;
            }
        }
    }
    catch {
        // Fallback default localhost:5000
    }
}
// Toast Notifications
export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container)
        return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
// Authenticated Fetch Helper
export async function apiFetch(endpoint, options = {}) {
    options.headers = (options.headers || {});
    options.headers['Content-Type'] = 'application/json';
    if (adminToken) {
        options.headers['Authorization'] = `Bearer ${adminToken}`;
    }
    const res = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Session expired. Please log in again.');
    }
    return res;
}
// Helper to trigger spin animation on a button's icon during async task
function withSpin(btnId, action) {
    const btn = document.getElementById(btnId);
    const svg = btn?.querySelector('svg') || btn;
    if (svg)
        svg.classList.add('spin-anim');
    return action().finally(() => {
        setTimeout(() => {
            if (svg)
                svg.classList.remove('spin-anim');
        }, 500);
    });
}
// View Switcher (Overview vs Users vs Payments vs AI Gateway)
export function switchView(viewName) {
    currentActiveView = viewName;
    const navOverview = document.getElementById('tabOverviewBtn');
    const navUsers = document.getElementById('tabUsersNavBtn');
    const navPayments = document.getElementById('tabPaymentsNavBtn');
    const navAiGateway = document.getElementById('tabAiGatewayNavBtn');
    [navOverview, navUsers, navPayments, navAiGateway].forEach(el => el?.classList.remove('active'));
    const viewOverview = document.getElementById('viewOverview');
    const viewUsers = document.getElementById('viewUsers');
    const viewPayments = document.getElementById('viewPayments');
    const viewAiGateway = document.getElementById('viewAiGateway');
    if (viewOverview)
        viewOverview.style.display = 'none';
    if (viewUsers)
        viewUsers.style.display = 'none';
    if (viewPayments)
        viewPayments.style.display = 'none';
    if (viewAiGateway)
        viewAiGateway.style.display = 'none';
    const greetingTitle = document.getElementById('greetingTitle');
    const greetingSubtitle = document.getElementById('greetingSubtitle');
    if (viewName === 'overview') {
        navOverview?.classList.add('active');
        if (viewOverview)
            viewOverview.style.display = 'flex';
        if (greetingTitle)
            greetingTitle.textContent = 'Hi, Superadmin!';
        if (greetingSubtitle)
            greetingSubtitle.textContent = 'Shoora Tether Enterprise platform overview & real-time telemetry.';
        loadDashboardStats();
    }
    else if (viewName === 'users') {
        navUsers?.classList.add('active');
        if (viewUsers)
            viewUsers.style.display = 'block';
        if (greetingTitle)
            greetingTitle.textContent = 'Users Directory';
        if (greetingSubtitle)
            greetingSubtitle.textContent = 'Manage registered developer accounts, subscription tiers, and access credentials.';
        if (allUsers.length === 0)
            loadUsers(true);
    }
    else if (viewName === 'payments') {
        navPayments?.classList.add('active');
        if (viewPayments)
            viewPayments.style.display = 'block';
        if (greetingTitle)
            greetingTitle.textContent = 'Payments & Revenue Ledger';
        if (greetingSubtitle)
            greetingSubtitle.textContent = 'Razorpay transactions, subscription orders, and financial reports.';
        if (allPayments.length === 0)
            loadPayments(true);
    }
    else if (viewName === 'aigateway') {
        navAiGateway?.classList.add('active');
        if (viewAiGateway)
            viewAiGateway.style.display = 'block';
        if (greetingTitle)
            greetingTitle.textContent = 'AI Models & Gateway';
        if (greetingSubtitle)
            greetingSubtitle.textContent = 'Central model routing, token quotas, and enterprise AI proxy keys.';
    }
    const canvas = document.querySelector('.main-canvas');
    if (canvas)
        canvas.scrollTop = 0;
}
// Check Auth & Render View
export function checkAuth() {
    const loginOverlay = document.getElementById('loginOverlay');
    const adminEmailDisplay = document.getElementById('adminEmailDisplay');
    const adminAvatarInitial = document.getElementById('adminAvatarInitial');
    if (!adminToken) {
        if (loginOverlay)
            loginOverlay.style.display = 'flex';
    }
    else {
        if (loginOverlay)
            loginOverlay.style.display = 'none';
        if (currentAdmin) {
            if (adminEmailDisplay)
                adminEmailDisplay.textContent = currentAdmin.email || 'Superadmin';
            if (adminAvatarInitial)
                adminAvatarInitial.textContent = (currentAdmin.email || 'A').charAt(0).toUpperCase();
        }
        switchView(currentActiveView);
    }
}
// Admin Login
export async function handleLogin(e) {
    e.preventDefault();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginSubmitBtn');
    if (!emailInput || !passwordInput || !loginBtn)
        return;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Authenticating...';
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Invalid credentials.');
        }
        adminToken = data.token;
        currentAdmin = data.admin;
        localStorage.setItem('shoora_admin_token', adminToken || '');
        localStorage.setItem('shoora_admin_user', JSON.stringify(currentAdmin));
        showToast('✓ Welcome back, Superadmin!');
        checkAuth();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        showToast(msg, 'error');
    }
    finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Dashboard';
    }
}
// Fill Default Credentials Helper
export function fillDefaultCredentials() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (emailInput)
        emailInput.value = 'admin@cybershoora.com';
    if (passwordInput)
        passwordInput.value = 'ShooraAdmin@2026!';
    showToast('Credentials filled. Click "Sign In" to authenticate.', 'success');
}
// Admin Logout
export function logout() {
    adminToken = null;
    currentAdmin = null;
    localStorage.removeItem('shoora_admin_token');
    localStorage.removeItem('shoora_admin_user');
    allUsers = [];
    allPayments = [];
    checkAuth();
    showToast('Signed out successfully.');
}
// Load KPI Stats
export async function loadDashboardStats() {
    try {
        const res = await apiFetch('/api/admin/stats');
        const data = await res.json();
        if (data.success && data.stats) {
            const st = data.stats;
            const totalUsersEl = document.getElementById('kpiTotalUsers');
            if (totalUsersEl)
                totalUsersEl.textContent = st.totalUsers.toLocaleString();
            const activeUsersEl = document.getElementById('kpiActiveUsers');
            if (activeUsersEl)
                activeUsersEl.textContent = st.activeUsers.toLocaleString();
            const activeMiniEl = document.getElementById('kpiActiveUsersMini');
            if (activeMiniEl)
                activeMiniEl.textContent = st.activeUsers.toLocaleString();
            const sessionsEl = document.getElementById('kpiActiveSessions');
            if (sessionsEl)
                sessionsEl.textContent = st.activeSessions.toLocaleString();
            const activePct = st.totalUsers > 0 ? Math.round((st.activeUsers / st.totalUsers) * 100) : 100;
            const subtitleEl = document.getElementById('kpiActiveSubtitle');
            if (subtitleEl)
                subtitleEl.textContent = `${activePct}% of users`;
            const proCount = st.planBreakdown?.find(p => p.plan === 'pro')?.count || 0;
            const proCountEl = document.getElementById('kpiProCount');
            if (proCountEl)
                proCountEl.textContent = `${proCount} Pro`;
            const proMiniEl = document.getElementById('kpiProMini');
            if (proMiniEl)
                proMiniEl.textContent = String(proCount);
            const rev = st.totalRevenue || 0;
            const revEl = document.getElementById('kpiTotalRevenue');
            if (revEl)
                revEl.textContent = `₹${rev.toLocaleString()}`;
            const revMiniEl = document.getElementById('kpiTotalRevenueMini');
            if (revMiniEl)
                revMiniEl.textContent = `₹${rev.toLocaleString()}`;
            const gaugeText = document.getElementById('gaugeProPercent');
            const gaugeCircle = document.getElementById('gaugeProgressCircle');
            if (gaugeText && gaugeCircle && st.totalUsers > 0) {
                const ratioPct = Math.min(100, Math.max(5, Math.round((proCount / st.totalUsers) * 100)));
                gaugeText.textContent = `${ratioPct}%`;
                const offset = 226 - (226 * ratioPct) / 100;
                gaugeCircle.style.strokeDashoffset = String(offset);
            }
        }
    }
    catch (err) {
        console.error('Stats error:', err);
    }
}
// ============================================================================
// USERS DIRECTORY: Infinite Scroll & Management Functions
// ============================================================================
export async function loadUsers(reset = true) {
    if (isLoadingMoreUsers)
        return;
    const tableBody = document.getElementById('usersTableBody');
    const statusContainer = document.getElementById('usersInfiniteStatus');
    if (reset) {
        currentPage = 1;
        allUsers = [];
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);"><span class="infinite-loading-dot"></span> Loading users...</td></tr>';
        }
    }
    isLoadingMoreUsers = true;
    try {
        const queryParams = new URLSearchParams({
            page: currentPage.toString(),
            limit: currentLimit.toString(),
            search: currentSearch
        });
        const res = await apiFetch(`/api/admin/users?${queryParams.toString()}`);
        const result = await res.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to load users');
        }
        const newUsers = result.data || [];
        totalUsersCount = result.pagination?.total || 0;
        if (reset) {
            allUsers = newUsers;
            if (tableBody)
                tableBody.innerHTML = '';
        }
        else {
            allUsers.push(...newUsers);
        }
        const badge = document.getElementById('totalUsersCountBadge');
        if (badge)
            badge.textContent = `${totalUsersCount} Registered`;
        renderUsersRows(newUsers, reset);
        // Update Infinite Scroll Status
        if (statusContainer) {
            if (allUsers.length === 0) {
                statusContainer.innerHTML = '<span class="infinite-end-badge">No users found</span>';
            }
            else if (allUsers.length >= totalUsersCount) {
                statusContainer.innerHTML = `<span class="infinite-end-badge" style="color: #10B981;">✓ All ${totalUsersCount} developers loaded</span>`;
            }
            else {
                statusContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="infinite-loading-dot"></span>
                        <span>Showing ${allUsers.length} of ${totalUsersCount} users</span>
                        <button class="btn-action-small" onclick="window.shooraAdmin.triggerLoadMoreUsers()" style="margin-left: 6px; padding: 4px 12px;">
                            Load Next 10 Users &darr;
                        </button>
                    </div>
                `;
            }
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Error loading users';
        showToast(msg, 'error');
        if (reset && tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 30px; color:#EF4444;">Error: ${escapeHtml(msg)}</td></tr>`;
        }
    }
    finally {
        isLoadingMoreUsers = false;
    }
}
// Render User Rows into Table
function renderUsersRows(users, reset) {
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody)
        return;
    if (reset && users.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">
                    No users found matching "${escapeHtml(currentSearch)}"
                </td>
            </tr>
        `;
        return;
    }
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.id = `user-row-${u.id}`;
        const displayName = escapeHtml(u.name || u.email.split('@')[0]);
        const avatarHtml = u.avatar_url
            ? `<img src="${escapeHtml(u.avatar_url)}" class="user-avatar-circle" alt="${displayName}"/>`
            : `<div class="user-avatar-fallback-circle">${displayName.charAt(0).toUpperCase()}</div>`;
        const provider = (u.auth_provider || 'email').toLowerCase();
        const providerIcon = ICONS[provider] || ICONS.email;
        const plan = (u.plan || 'free').toLowerCase();
        const status = (u.status || 'active').toLowerCase();
        const isActive = status === 'active';
        const statusClass = isActive ? 'active' : 'suspended';
        const statusLabel = isActive ? 'Active' : (status === 'disabled' ? 'Disabled' : 'Suspended');
        const joinedDate = u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
        const lastLogin = u.last_login ? formatRelativeTime(new Date(u.last_login)) : 'Never';
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--text-muted);">#${u.id}</td>
            <td>
                <div class="user-info-cell">
                    ${avatarHtml}
                    <div class="user-details-text">
                        <span class="user-name-text">${displayName}</span>
                        <span class="user-email-text">${escapeHtml(u.email)}</span>
                    </div>
                </div>
            </td>
            <td>
                <span class="provider-badge">
                    ${providerIcon}
                    <span style="text-transform: capitalize;">${provider}</span>
                </span>
            </td>
            <td>
                <span class="plan-badge ${plan}">${plan}</span>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    <span class="status-indicator-dot"></span>
                    <span>${statusLabel}</span>
                </span>
            </td>
            <td title="${u.last_login || ''}">
                <div style="font-size: 12px; color: var(--text-dark);">${lastLogin}</div>
                <div style="font-size: 11px; color: var(--text-muted);">Joined ${joinedDate}</div>
            </td>
            <td>
                <div class="action-btn-group">
                    <!-- Edit Button -->
                    <button class="btn-action-small btn-action-edit" title="Edit developer profile & plan" onclick="window.shooraAdmin.openEditUserModal(${u.id}, '${escapeHtml(u.name || '')}', '${escapeHtml(u.email)}', '${plan}', '${status}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        <span>Edit</span>
                    </button>

                    <!-- Disable / Enable Toggle -->
                    <button class="btn-action-small btn-action-toggle ${isActive ? 'disable' : 'enable'}" title="${isActive ? 'Disable account' : 'Enable account'}" onclick="window.shooraAdmin.toggleUserStatus(${u.id}, '${status}')">
                        ${isActive
            ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg><span>Disable</span>`
            : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Enable</span>`}
                    </button>

                    <!-- Delete Button -->
                    <button class="btn-action-small btn-action-delete" title="Permanently delete user" onclick="window.shooraAdmin.deleteUserAccount(${u.id}, '${escapeHtml(u.email)}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        <span>Delete</span>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
// Edit User Modal
export function openEditUserModal(id, name, email, plan, status) {
    const idInput = document.getElementById('editUserId');
    const nameInput = document.getElementById('editUserName');
    const emailInput = document.getElementById('editUserEmail');
    const planSelect = document.getElementById('editUserPlan');
    const statusSelect = document.getElementById('editUserStatus');
    const headerTitle = document.getElementById('editModalHeaderTitle');
    if (idInput)
        idInput.value = String(id);
    if (nameInput)
        nameInput.value = name || '';
    if (emailInput)
        emailInput.value = email || '';
    if (planSelect)
        planSelect.value = plan || 'free';
    if (statusSelect)
        statusSelect.value = status || 'active';
    if (headerTitle)
        headerTitle.textContent = `Edit User #${id}`;
    document.getElementById('editUserModalBackdrop')?.classList.add('open');
}
export function closeEditUserModal() {
    document.getElementById('editUserModalBackdrop')?.classList.remove('open');
}
export async function handleEditUserSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById('editUserId');
    const nameInput = document.getElementById('editUserName');
    const emailInput = document.getElementById('editUserEmail');
    const planSelect = document.getElementById('editUserPlan');
    const statusSelect = document.getElementById('editUserStatus');
    const submitBtn = document.getElementById('saveEditUserBtn');
    if (!idInput || !emailInput || !submitBtn)
        return;
    const userId = idInput.value;
    const name = nameInput?.value.trim() || '';
    const email = emailInput.value.trim();
    const plan = planSelect?.value || 'free';
    const status = statusSelect?.value || 'active';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    try {
        const res = await apiFetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify({ name, email, plan, status })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to update user.');
        }
        showToast(`✓ User #${userId} successfully updated!`);
        closeEditUserModal();
        loadUsers(true);
        loadDashboardStats();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Update failed';
        showToast(msg, 'error');
    }
    finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
}
// Delete User Account
export async function deleteUserAccount(userId, email) {
    const confirmMsg = `Are you sure you want to PERMANENTLY DELETE user #${userId} (${email})?\nThis action will erase their account and sessions permanently.`;
    if (!confirm(confirmMsg))
        return;
    try {
        const res = await apiFetch(`/api/admin/users/${userId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to delete user.');
        }
        showToast(`✓ User #${userId} deleted successfully.`);
        loadUsers(true);
        loadDashboardStats();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Delete failed';
        showToast(msg, 'error');
    }
}
// Toggle User Status (Disable vs Enable)
export async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const actionName = newStatus === 'suspended' ? 'DISABLE' : 'ENABLE';
    const confirmMsg = `Are you sure you want to ${actionName} User #${userId}?`;
    if (!confirm(confirmMsg))
        return;
    try {
        const res = await apiFetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to update status');
        }
        showToast(`✓ User status updated to ${newStatus.toUpperCase()}`);
        loadUsers(true);
        loadDashboardStats();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Error updating status';
        showToast(msg, 'error');
    }
}
// Plan Modal Logic
export function openPlanModal(userId, currentPlan) {
    activeModalUserId = userId;
    const select = document.getElementById('planSelectInput');
    if (select)
        select.value = currentPlan;
    document.getElementById('planModalBackdrop')?.classList.add('open');
}
export function closePlanModal() {
    activeModalUserId = null;
    document.getElementById('planModalBackdrop')?.classList.remove('open');
}
export async function saveUserPlan() {
    if (!activeModalUserId)
        return;
    const select = document.getElementById('planSelectInput');
    const saveBtn = document.getElementById('savePlanBtn');
    if (!select || !saveBtn)
        return;
    const newPlan = select.value;
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    try {
        const res = await apiFetch(`/api/admin/users/${activeModalUserId}/plan`, {
            method: 'PUT',
            body: JSON.stringify({ plan: newPlan })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Failed to update plan');
        }
        showToast(`✓ User plan successfully updated to ${newPlan.toUpperCase()}`);
        closePlanModal();
        loadUsers(true);
        loadDashboardStats();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Error updating plan';
        showToast(msg, 'error');
    }
    finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Update Plan';
    }
}
// ============================================================================
// PAYMENTS & REVENUE: Infinite Scroll & Export
// ============================================================================
export async function loadPayments(reset = true) {
    if (isLoadingMorePayments)
        return;
    const tableBody = document.getElementById('paymentsTableBody');
    const statusContainer = document.getElementById('paymentsInfiniteStatus');
    if (reset) {
        currentPaymentPage = 1;
        allPayments = [];
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);"><span class="infinite-loading-dot"></span> Loading transactions...</td></tr>';
        }
    }
    isLoadingMorePayments = true;
    try {
        const queryParams = new URLSearchParams({
            page: currentPaymentPage.toString(),
            limit: currentPaymentLimit.toString(),
            search: currentPaymentSearch
        });
        const res = await apiFetch(`/api/admin/payments?${queryParams.toString()}`);
        const result = await res.json();
        if (!result.success) {
            throw new Error(result.error || 'Failed to load payments ledger');
        }
        const newPayments = result.data || [];
        totalPaymentsCount = result.pagination?.total || 0;
        if (reset) {
            allPayments = newPayments;
            if (tableBody)
                tableBody.innerHTML = '';
        }
        else {
            allPayments.push(...newPayments);
        }
        renderPaymentsRows(newPayments, reset);
        // Update Infinite Scroll Status
        if (statusContainer) {
            if (allPayments.length === 0) {
                statusContainer.innerHTML = '<span class="infinite-end-badge">No payment records found</span>';
            }
            else if (allPayments.length >= totalPaymentsCount) {
                statusContainer.innerHTML = `<span class="infinite-end-badge" style="color: #10B981;">✓ All ${totalPaymentsCount} transactions loaded</span>`;
            }
            else {
                statusContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="infinite-loading-dot"></span>
                        <span>Showing ${allPayments.length} of ${totalPaymentsCount} transactions</span>
                        <button class="btn-action-small" onclick="window.shooraAdmin.triggerLoadMorePayments()" style="margin-left: 6px; padding: 4px 12px;">
                            Load Next 10 Transactions &darr;
                        </button>
                    </div>
                `;
            }
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : 'Error loading payments';
        showToast(msg, 'error');
        if (reset && tableBody) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color:#EF4444;">Error: ${escapeHtml(msg)}</td></tr>`;
        }
    }
    finally {
        isLoadingMorePayments = false;
    }
}
// Render Payments Rows
function renderPaymentsRows(payments, reset) {
    const tableBody = document.getElementById('paymentsTableBody');
    if (!tableBody)
        return;
    if (reset && payments.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">
                    No payment records found ${currentPaymentSearch ? `matching "${escapeHtml(currentPaymentSearch)}"` : ''}
                </td>
            </tr>
        `;
        return;
    }
    payments.forEach(p => {
        const tr = document.createElement('tr');
        const plan = (p.plan_id || 'pro').toLowerCase();
        const dateStr = p.created_at ? new Date(p.created_at).toLocaleString(undefined, {
            month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : 'N/A';
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--text-muted);">#${p.id}</td>
            <td>
                <div class="user-details-text">
                    <span class="user-name-text">${escapeHtml(p.user_name || p.user_email?.split('@')[0] || 'Developer')}</span>
                    <span class="user-email-text">${escapeHtml(p.user_email || 'N/A')}</span>
                </div>
            </td>
            <td>
                <span class="plan-badge ${plan}">${plan}</span>
            </td>
            <td>
                <span class="code-pill">${escapeHtml(p.order_id || 'N/A')}</span>
            </td>
            <td>
                <span class="code-pill">${escapeHtml(p.payment_id || 'N/A')}</span>
            </td>
            <td>
                <span class="revenue-text">₹${Number(p.amount || 0).toLocaleString()}</span>
            </td>
            <td>
                <span class="status-badge active">
                    <span class="status-indicator-dot"></span>
                    <span style="text-transform: capitalize;">${escapeHtml(p.status || 'success')}</span>
                </span>
            </td>
            <td style="text-align: right; font-size: 11.5px; color: var(--text-muted);">
                ${dateStr}
            </td>
        `;
        tableBody.appendChild(tr);
    });
}
// Format Relative Time
function formatRelativeTime(date) {
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60)
        return 'Just now';
    if (diffSec < 3600)
        return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400)
        return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800)
        return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function escapeHtml(text) {
    return String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
export function triggerLoadMoreUsers() {
    if (!isLoadingMoreUsers && allUsers.length < totalUsersCount) {
        currentPage++;
        loadUsers(false);
    }
}
export function triggerLoadMorePayments() {
    if (!isLoadingMorePayments && allPayments.length < totalPaymentsCount) {
        currentPaymentPage++;
        loadPayments(false);
    }
}
// Setup IntersectionObservers on Sentinels for auto-loading on scroll
function setupIntersectionObservers() {
    const userSentinel = document.getElementById('usersScrollSentinel');
    if (userSentinel) {
        const userObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (currentActiveView === 'users' && !isLoadingMoreUsers && allUsers.length < totalUsersCount && allUsers.length > 0) {
                    currentPage++;
                    loadUsers(false);
                }
            }
        }, { rootMargin: '100px' });
        userObserver.observe(userSentinel);
    }
    const paymentSentinel = document.getElementById('paymentsScrollSentinel');
    if (paymentSentinel) {
        const paymentObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                if (currentActiveView === 'payments' && !isLoadingMorePayments && allPayments.length < totalPaymentsCount && allPayments.length > 0) {
                    currentPaymentPage++;
                    loadPayments(false);
                }
            }
        }, { rootMargin: '100px' });
        paymentObserver.observe(paymentSentinel);
    }
}
// Global scope attachment for inline handlers
window.shooraAdmin = {
    openPlanModal,
    openEditUserModal,
    deleteUserAccount,
    toggleUserStatus,
    triggerLoadMoreUsers,
    triggerLoadMorePayments,
    showToast
};
// Event Listeners on DOM Ready
window.addEventListener('DOMContentLoaded', async () => {
    await initConfig();
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    document.getElementById('fillCredsBtn')?.addEventListener('click', fillDefaultCredentials);
    // Sidebar View Navigation
    document.getElementById('tabOverviewBtn')?.addEventListener('click', () => switchView('overview'));
    document.getElementById('tabUsersNavBtn')?.addEventListener('click', () => switchView('users'));
    document.getElementById('tabPaymentsNavBtn')?.addEventListener('click', () => switchView('payments'));
    document.getElementById('tabAiGatewayNavBtn')?.addEventListener('click', () => switchView('aigateway'));
    // Top Sync Button with Reload Spin Animation
    document.getElementById('topSyncBtn')?.addEventListener('click', () => {
        withSpin('topSyncBtn', async () => {
            await loadDashboardStats();
            if (currentActiveView === 'users')
                await loadUsers(true);
            if (currentActiveView === 'payments')
                await loadPayments(true);
            showToast('✓ Platform telemetry re-synchronized.');
        });
    });
    // Users Refresh with Spin Animation
    document.getElementById('refreshUsersBtn')?.addEventListener('click', () => {
        withSpin('refreshUsersBtn', async () => {
            await loadUsers(true);
            await loadDashboardStats();
        });
    });
    // Users Search with debounce
    const searchInput = document.getElementById('userSearchInput');
    searchInput?.addEventListener('input', (e) => {
        if (searchDebounceTimer)
            clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentSearch = e.target.value.trim();
            loadUsers(true);
        }, 300);
    });
    // Payments Refresh with Spin Animation
    document.getElementById('refreshPaymentsBtn')?.addEventListener('click', () => {
        withSpin('refreshPaymentsBtn', async () => {
            await loadPayments(true);
            await loadDashboardStats();
        });
    });
    // Payments Search with debounce
    const paymentSearchInput = document.getElementById('paymentSearchInput');
    paymentSearchInput?.addEventListener('input', (e) => {
        if (paymentSearchDebounceTimer)
            clearTimeout(paymentSearchDebounceTimer);
        paymentSearchDebounceTimer = setTimeout(() => {
            currentPaymentSearch = e.target.value.trim();
            loadPayments(true);
        }, 300);
    });
    // Infinite Scroll on Main Canvas & Window & Table Wrap
    const handleScroll = (target) => {
        const scrollTop = target === window ? window.scrollY : target.scrollTop;
        const clientHeight = target === window ? window.innerHeight : target.clientHeight;
        const scrollHeight = target === window ? document.documentElement.scrollHeight : target.scrollHeight;
        if (scrollTop + clientHeight >= scrollHeight - 80) {
            if (currentActiveView === 'users' && !isLoadingMoreUsers && allUsers.length < totalUsersCount && allUsers.length > 0) {
                currentPage++;
                loadUsers(false);
            }
            else if (currentActiveView === 'payments' && !isLoadingMorePayments && allPayments.length < totalPaymentsCount && allPayments.length > 0) {
                currentPaymentPage++;
                loadPayments(false);
            }
        }
    };
    const canvas = document.querySelector('.main-canvas');
    canvas?.addEventListener('scroll', () => handleScroll(canvas));
    window.addEventListener('scroll', () => handleScroll(window));
    document.querySelectorAll('.data-table-wrap').forEach(wrap => {
        wrap.addEventListener('scroll', () => handleScroll(wrap));
    });
    setupIntersectionObservers();
    // Export Payments CSV
    document.getElementById('downloadLedgerBtn')?.addEventListener('click', async () => {
        try {
            showToast('Preparing CSV export of payments ledger...');
            const res = await apiFetch('/api/admin/payments?page=1&limit=500');
            const data = await res.json();
            if (!data.success || !data.data || data.data.length === 0) {
                showToast('No payment transactions found to export.', 'error');
                return;
            }
            const headers = ['ID', 'User Email', 'Plan', 'Order ID', 'Payment ID', 'Amount', 'Status', 'Date'];
            const rows = data.data.map(p => [
                p.id,
                `"${p.user_email || ''}"`,
                p.plan_id || '',
                `"${p.order_id || ''}"`,
                `"${p.payment_id || ''}"`,
                p.amount || 0,
                p.status || '',
                `"${p.created_at || ''}"`
            ]);
            const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', `shoora_tether_payments_${new Date().toISOString().slice(0, 10)}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showToast('✓ Ledger exported successfully!');
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Export failed';
            showToast('Failed to export ledger: ' + msg, 'error');
        }
    });
    // Plan Modal Buttons
    document.getElementById('closeModalBtn')?.addEventListener('click', closePlanModal);
    document.getElementById('cancelPlanBtn')?.addEventListener('click', closePlanModal);
    document.getElementById('savePlanBtn')?.addEventListener('click', saveUserPlan);
    // Edit User Modal Buttons & Form
    document.getElementById('closeEditModalBtn')?.addEventListener('click', closeEditUserModal);
    document.getElementById('cancelEditModalBtn')?.addEventListener('click', closeEditUserModal);
    document.getElementById('editUserForm')?.addEventListener('submit', handleEditUserSubmit);
    checkAuth();
});
