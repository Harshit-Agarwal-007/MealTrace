/* ═══════════════════════════════════════════════════════
   MealTrace Digital — MVP Testing UI Logic
   All API calls hit the FastAPI backend at same origin.
   ═══════════════════════════════════════════════════════ */

const API = window.location.origin;  // e.g. http://localhost:8000

// ── Auth State ──
let authToken = null;
let currentUser = null;  // { user_id, role, email, name, ... }
let vendorScanLog = [];

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

async function apiCall(method, path, body = null, isBlob = false) {
    const opts = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (authToken) opts.headers['Authorization'] = `Bearer ${authToken}`;
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API}${path}`, opts);
        if (isBlob) {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.blob();
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || data.message || `HTTP ${res.status}`);
        return data;
    } catch (err) {
        console.error(`API ${method} ${path}:`, err);
        throw err;
    }
}

function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

function timeAgo(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════

async function initLogin() {
    show('login-loading');
    try {
        const data = await apiCall('GET', '/dev/users');
        const grid = document.getElementById('login-users');
        grid.innerHTML = '';

        const roleEmoji = { RESIDENT: '🏠', VENDOR: '📷', SUPER_ADMIN: '👑' };
        const roleDesc = {
            RESIDENT: 'View QR, balance & transactions',
            VENDOR: 'Scan meals, validate QR codes',
            SUPER_ADMIN: 'Full dashboard, reports & management',
        };

        data.users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'role-card';
            card.onclick = () => loginAs(user.id, user.role);
            card.innerHTML = `
                <span class="role-emoji">${roleEmoji[user.role] || '👤'}</span>
                <div class="role-info">
                    <strong>${user.name}</strong>
                    <small>${user.email} ${user.site_id ? '• ' + user.site_id : ''} ${user.balance !== undefined ? '• Balance: ' + user.balance : ''}</small>
                </div>
                <span class="role-tag ${user.role.toLowerCase()}">${user.role.replace('SUPER_', '')}</span>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        setHtml('login-error', `Failed to load users: ${err.message}`);
        show('login-error');
    }
    hide('login-loading');
}

async function loginAs(userId, role) {
    show('login-loading');
    hide('login-error');
    try {
        const data = await apiCall('POST', '/dev/login', { user_id: userId });
        authToken = data.access_token;
        currentUser = {
            user_id: data.user_id,
            role: data.role,
        };

        // Fetch user details
        const users = await apiCall('GET', '/dev/users');
        const uinfo = users.users.find(u => u.id === data.user_id);
        if (uinfo) {
            currentUser.name = uinfo.name;
            currentUser.email = uinfo.email;
            currentUser.site_id = uinfo.site_id;
        }

        enterApp();
    } catch (err) {
        setHtml('login-error', `Login failed: ${err.message}`);
        show('login-error');
    }
    hide('login-loading');
}

function logout() {
    authToken = null;
    currentUser = null;
    hide('app-screen');
    document.getElementById('app-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
    show('login-screen');
    // Reset views
    ['view-resident', 'view-vendor', 'view-admin'].forEach(id => hide(id));
}

// ═══════════════════════════════════════
// APP ENTRY
// ═══════════════════════════════════════

function enterApp() {
    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('app-screen').classList.add('active');

    // Set navbar
    const badge = document.getElementById('nav-role-badge');
    badge.textContent = currentUser.role.replace('SUPER_', '');
    badge.className = `role-badge ${currentUser.role}`;
    document.getElementById('nav-user-name').textContent = currentUser.name || currentUser.email || '';

    // Show the right view
    ['view-resident', 'view-vendor', 'view-admin'].forEach(id => hide(id));

    if (currentUser.role === 'RESIDENT') {
        show('view-resident');
        loadResidentView();
    } else if (currentUser.role === 'VENDOR') {
        show('view-vendor');
        loadVendorView();
    } else if (currentUser.role === 'SUPER_ADMIN') {
        show('view-admin');
        loadAdminView();
    }
}

// ═══════════════════════════════════════
// RESIDENT VIEW
// ═══════════════════════════════════════

async function loadResidentView() {
    loadResidentProfile();
    loadResidentBalance();
    refreshQR();
    loadResidentTransactions();
}

async function loadResidentProfile() {
    try {
        const p = await apiCall('GET', '/resident/profile');
        setHtml('resident-profile-info', `
            <div class="profile-row"><span class="label">Name</span><span class="value">${p.name}</span></div>
            <div class="profile-row"><span class="label">Email</span><span class="value">${p.email}</span></div>
            <div class="profile-row"><span class="label">Phone</span><span class="value">${p.phone || '—'}</span></div>
            <div class="profile-row"><span class="label">Room</span><span class="value">${p.room_number}</span></div>
            <div class="profile-row"><span class="label">Site</span><span class="value">${p.site_name || p.site_id}</span></div>
            <div class="profile-row"><span class="label">Status</span><span class="value"><span class="status status-${p.status.toLowerCase()}">${p.status}</span></span></div>
        `);
    } catch (err) {
        setHtml('resident-profile-info', `<p class="error-msg">${err.message}</p>`);
    }
}

async function loadResidentBalance() {
    try {
        const b = await apiCall('GET', '/resident/balance');
        document.getElementById('resident-balance').textContent = b.balance;
        const pct = Math.min(100, (b.balance / 30) * 100);
        document.getElementById('balance-bar').style.width = pct + '%';
    } catch (err) {
        document.getElementById('resident-balance').textContent = '!';
    }
}

async function refreshQR() {
    setHtml('qr-display', '<div class="loading"><div class="spinner"></div></div>');
    try {
        const qr = await apiCall('GET', '/resident/qr-code');
        setHtml('qr-display', `<img src="data:image/png;base64,${qr.qr_base64}" alt="Meal QR Code">`);
        toast('QR code refreshed', 'success');
    } catch (err) {
        setHtml('qr-display', `<p class="error-msg">Failed: ${err.message}</p>`);
    }
}

async function loadResidentTransactions() {
    try {
        const data = await apiCall('GET', '/resident/transactions?page=1&page_size=15');
        if (data.transactions.length === 0) {
            setHtml('resident-transactions', '<p class="empty-state">No transactions yet</p>');
            return;
        }
        let html = `<table><thead><tr>
            <th>Time</th><th>Meal</th><th>Site</th><th>Status</th><th>Reason</th>
        </tr></thead><tbody>`;
        data.transactions.forEach(t => {
            html += `<tr>
                <td>${timeAgo(t.timestamp)}</td>
                <td>${t.meal_type || '—'}</td>
                <td>${t.site_name || t.site_id || '—'}</td>
                <td><span class="status status-${t.status.toLowerCase()}">${t.status}</span></td>
                <td>${t.block_reason || '—'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        setHtml('resident-transactions', html);
    } catch (err) {
        setHtml('resident-transactions', `<p class="error-msg">${err.message}</p>`);
    }
}

// ═══════════════════════════════════════
// VENDOR VIEW
// ═══════════════════════════════════════

async function loadVendorView() {
    // Load sites
    try {
        const data = await apiCall('GET', '/dev/sites');
        const select = document.getElementById('vendor-site-select');
        select.innerHTML = '';
        data.sites.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.id})`;
            // pre-select vendor's assigned site
            if (currentUser.site_id && s.id === currentUser.site_id) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        toast('Failed to load sites: ' + err.message, 'error');
    }

    // Load residents for QR selection
    try {
        const data = await apiCall('GET', '/dev/users');
        const select = document.getElementById('vendor-resident-select');
        select.innerHTML = '<option value="">— Pick a resident —</option>';
        data.users.filter(u => u.role === 'RESIDENT').forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} (${u.id}) — Balance: ${u.balance ?? '?'}`;
            select.appendChild(opt);
        });
    } catch (err) {
        toast('Failed to load residents: ' + err.message, 'error');
    }
}

async function performScan() {
    const siteId = document.getElementById('vendor-site-select').value;
    const residentId = document.getElementById('vendor-resident-select').value;

    if (!residentId) {
        toast('Select a resident to scan', 'error');
        return;
    }

    const resultDiv = document.getElementById('scan-result');
    resultDiv.className = 'scan-result scan-idle';
    resultDiv.innerHTML = '<div class="loading"><div class="spinner"></div><span>Scanning...</span></div>';

    try {
        // First generate fresh QR for the resident
        const qrData = await apiCall('GET', `/dev/generate-qr/${residentId}`);

        // Now scan it
        const result = await apiCall('POST', '/scan/validate', {
            qr_payload: qrData.qr_payload,
            site_id: siteId,
            vendor_id: currentUser.user_id,
        });

        if (result.status === 'SUCCESS') {
            resultDiv.className = 'scan-result scan-success';
            resultDiv.innerHTML = `
                <div class="scan-icon">✅</div>
                <h2>MEAL CONFIRMED</h2>
                <p><strong>${result.resident_name}</strong></p>
                <div class="result-detail">
                    Meal: ${result.meal_type} &nbsp;|&nbsp; Balance: ${result.balance_after} remaining
                </div>
            `;
            toast(`${result.resident_name} — ${result.meal_type} recorded`, 'success');
        } else {
            resultDiv.className = 'scan-result scan-blocked';
            const reasonMap = {
                INVALID_QR: '🔒 Invalid or tampered QR code',
                INACTIVE_RESIDENT: '⛔ Resident account is inactive',
                WRONG_SITE: '📍 QR code is for a different site',
                OUTSIDE_MEAL_WINDOW: '⏰ Outside meal serving hours',
                DUPLICATE_SCAN: '🔁 Already scanned for this meal today',
                ZERO_BALANCE: '💳 No meal credits remaining',
            };
            resultDiv.innerHTML = `
                <div class="scan-icon">❌</div>
                <h2>BLOCKED</h2>
                <p>${reasonMap[result.block_reason] || result.block_reason}</p>
                <div class="result-detail">
                    ${result.resident_name ? 'Resident: ' + result.resident_name : ''}
                    ${result.meal_type ? '&nbsp;|&nbsp; Meal: ' + result.meal_type : ''}
                </div>
            `;
            toast(`BLOCKED: ${result.block_reason}`, 'error');
        }

        // Add to vendor scan log
        vendorScanLog.unshift(result);
        renderVendorLog();

    } catch (err) {
        resultDiv.className = 'scan-result scan-blocked';
        resultDiv.innerHTML = `
            <div class="scan-icon">⚠️</div>
            <h2>SCAN ERROR</h2>
            <p>${err.message}</p>
        `;
        toast('Scan failed: ' + err.message, 'error');
    }
}

function renderVendorLog() {
    if (vendorScanLog.length === 0) {
        setHtml('vendor-scan-log', '<p class="empty-state">No scans yet this session</p>');
        return;
    }
    let html = `<table><thead><tr>
        <th>Time</th><th>Resident</th><th>Meal</th><th>Status</th><th>Reason</th>
    </tr></thead><tbody>`;
    vendorScanLog.slice(0, 20).forEach(r => {
        html += `<tr>
            <td>${timeAgo(r.timestamp)}</td>
            <td>${r.resident_name || r.resident_id || '—'}</td>
            <td>${r.meal_type || '—'}</td>
            <td><span class="status status-${r.status.toLowerCase()}">${r.status}</span></td>
            <td>${r.block_reason || '—'}</td>
        </tr>`;
    });
    html += '</tbody></table>';
    setHtml('vendor-scan-log', html);
}

// ═══════════════════════════════════════
// ADMIN VIEW
// ═══════════════════════════════════════

async function loadAdminView() {
    loadDashboardStats();
    loadScanFeed();
}

function switchAdminTab(tab) {
    // Hide all panels
    document.querySelectorAll('.admin-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    show(`admin-tab-${tab}`);
    document.getElementById(`tab-${tab}`).classList.add('active');

    // Load data for the tab
    if (tab === 'dashboard') { loadDashboardStats(); loadScanFeed(); }
    if (tab === 'residents') loadAdminResidents();
    if (tab === 'credits') loadCreditResidents();
    if (tab === 'sites') loadAdminSites();
}

async function loadDashboardStats() {
    try {
        const s = await apiCall('GET', '/admin/dashboard/stats');
        setHtml('admin-stats', `
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${s.total_residents}</div><div class="stat-label">Total Residents</div></div>
            <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${s.active_residents}</div><div class="stat-label">Active</div></div>
            <div class="stat-card"><div class="stat-icon">📷</div><div class="stat-value">${s.today_total_scans}</div><div class="stat-label">Scans Today</div></div>
            <div class="stat-card"><div class="stat-icon">🍳</div><div class="stat-value">${s.meal_counts.BREAKFAST}</div><div class="stat-label">Breakfast</div></div>
            <div class="stat-card"><div class="stat-icon">🍛</div><div class="stat-value">${s.meal_counts.LUNCH}</div><div class="stat-label">Lunch</div></div>
            <div class="stat-card"><div class="stat-icon">🍽️</div><div class="stat-value">${s.meal_counts.DINNER}</div><div class="stat-label">Dinner</div></div>
            <div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-value">${s.today_blocked_scans}</div><div class="stat-label">Blocked</div></div>
            <div class="stat-card"><div class="stat-icon">🏠</div><div class="stat-value">${s.total_sites}</div><div class="stat-label">Sites</div></div>
        `);
    } catch (err) {
        setHtml('admin-stats', `<p class="error-msg">${err.message}</p>`);
    }
}

async function loadScanFeed() {
    try {
        const data = await apiCall('GET', '/admin/dashboard/scan-feed?limit=25');
        if (!data.feed || data.feed.length === 0) {
            setHtml('admin-scan-feed', '<p class="empty-state">No scan activity yet</p>');
            return;
        }
        let html = `<table><thead><tr>
            <th>Time</th><th>Resident</th><th>Site</th><th>Meal</th><th>Status</th><th>Block Reason</th>
        </tr></thead><tbody>`;
        data.feed.forEach(f => {
            html += `<tr>
                <td>${timeAgo(f.timestamp)}</td>
                <td>${f.resident_name || f.resident_id || '—'}</td>
                <td>${f.site_id || '—'}</td>
                <td>${f.meal_type || '—'}</td>
                <td><span class="status status-${(f.status || '').toLowerCase()}">${f.status || '—'}</span></td>
                <td>${f.block_reason || '—'}</td>
            </tr>`;
        });
        html += '</tbody></table>';
        setHtml('admin-scan-feed', html);
    } catch (err) {
        setHtml('admin-scan-feed', `<p class="error-msg">${err.message}</p>`);
    }
}

async function loadAdminResidents() {
    try {
        const data = await apiCall('GET', '/admin/residents?page=1&page_size=50');
        if (data.residents.length === 0) {
            setHtml('admin-residents-list', '<p class="empty-state">No residents found</p>');
            return;
        }
        let html = `<table><thead><tr>
            <th>ID</th><th>Name</th><th>Email</th><th>Room</th><th>Site</th><th>Balance</th><th>Status</th><th>Actions</th>
        </tr></thead><tbody>`;
        data.residents.forEach(r => {
            html += `<tr>
                <td style="font-family:monospace;font-size:.75rem">${r.id}</td>
                <td><strong>${r.name}</strong></td>
                <td>${r.email}</td>
                <td>${r.room_number}</td>
                <td>${r.site_id}</td>
                <td><strong>${r.balance}</strong></td>
                <td><span class="status status-${r.status.toLowerCase()}">${r.status}</span></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deactivateResident('${r.id}')">Deactivate</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        setHtml('admin-residents-list', html);

        // Also populate the site dropdown for add-resident form
        await loadSiteDropdowns();
    } catch (err) {
        setHtml('admin-residents-list', `<p class="error-msg">${err.message}</p>`);
    }
}

async function loadSiteDropdowns() {
    try {
        const data = await apiCall('GET', '/dev/sites');
        ['new-res-site'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '<option value="">Select site</option>';
            data.sites.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id;
                opt.textContent = s.name;
                el.appendChild(opt);
            });
        });
    } catch(e) {}
}

function showAddResident() { show('add-resident-form'); }
function hideAddResident() { hide('add-resident-form'); }

async function addResident() {
    const name = document.getElementById('new-res-name').value.trim();
    const email = document.getElementById('new-res-email').value.trim();
    const phone = document.getElementById('new-res-phone').value.trim();
    const room = document.getElementById('new-res-room').value.trim();
    const site = document.getElementById('new-res-site').value;

    if (!name || !email || !room || !site) {
        toast('Please fill all required fields', 'error');
        return;
    }

    try {
        await apiCall('POST', '/admin/residents', {
            name, email, phone: phone || null, room_number: room, site_id: site,
        });
        toast(`Resident ${name} added successfully`, 'success');
        hideAddResident();
        loadAdminResidents();
    } catch (err) {
        toast('Failed: ' + err.message, 'error');
    }
}

async function deactivateResident(id) {
    if (!confirm(`Deactivate resident ${id}? This will invalidate their QR.`)) return;
    try {
        await apiCall('DELETE', `/admin/residents/${id}`);
        toast('Resident deactivated', 'success');
        loadAdminResidents();
    } catch (err) {
        toast('Failed: ' + err.message, 'error');
    }
}

// ── Credits ──

async function loadCreditResidents() {
    try {
        const data = await apiCall('GET', '/dev/users');
        const select = document.getElementById('credit-resident');
        select.innerHTML = '<option value="">— Select resident —</option>';
        data.users.filter(u => u.role === 'RESIDENT').forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.textContent = `${u.name} (Balance: ${u.balance ?? '?'})`;
            select.appendChild(opt);
        });
    } catch (err) {
        toast('Failed to load residents', 'error');
    }
}

async function submitCreditOverride() {
    const residentId = document.getElementById('credit-resident').value;
    const amount = parseInt(document.getElementById('credit-amount').value);
    const reason = document.getElementById('credit-reason').value.trim();

    if (!residentId || isNaN(amount) || !reason) {
        toast('Fill all fields', 'error');
        return;
    }

    try {
        const result = await apiCall('POST', '/admin/credit-override', {
            resident_id: residentId, amount, reason,
        });
        setHtml('credit-result', `
            <div class="card" style="background:var(--success-bg);border-color:var(--success);">
                <strong>✅ Override applied</strong><br>
                Previous: ${result.previous_balance} → New: ${result.new_balance}<br>
                Changed by: ${result.amount_changed > 0 ? '+' : ''}${result.amount_changed} | Reason: ${result.reason}
            </div>
        `);
        show('credit-result');
        toast(`Credits updated: ${result.previous_balance} → ${result.new_balance}`, 'success');
        // Reset
        document.getElementById('credit-amount').value = '';
        document.getElementById('credit-reason').value = '';
        loadCreditResidents();
    } catch (err) {
        toast('Override failed: ' + err.message, 'error');
    }
}

// ── Reports ──

async function downloadReport(type) {
    toast(`Generating ${type} report...`, 'info');
    try {
        const res = await fetch(`${API}/admin/reports/${type}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_report.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
        toast(`${type} report downloaded`, 'success');
    } catch (err) {
        toast('Download failed: ' + err.message, 'error');
    }
}

// ── Sites ──

async function loadAdminSites() {
    try {
        const data = await apiCall('GET', '/dev/sites');
        if (data.sites.length === 0) {
            setHtml('admin-sites-list', '<p class="empty-state">No sites configured</p>');
            return;
        }
        let html = `<table><thead><tr>
            <th>ID</th><th>Name</th><th>Breakfast</th><th>Lunch</th><th>Dinner</th><th>Status</th>
        </tr></thead><tbody>`;
        data.sites.forEach(s => {
            const mw = s.meal_windows || {};
            const fmt = (w) => w ? `${w.start} – ${w.end}` : '—';
            html += `<tr>
                <td style="font-family:monospace;font-size:.75rem">${s.id}</td>
                <td><strong>${s.name}</strong></td>
                <td>${fmt(mw.breakfast)}</td>
                <td>${fmt(mw.lunch)}</td>
                <td>${fmt(mw.dinner)}</td>
                <td><span class="status status-${s.is_active ? 'active' : 'inactive'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
            </tr>`;
        });
        html += '</tbody></table>';
        setHtml('admin-sites-list', html);
    } catch (err) {
        setHtml('admin-sites-list', `<p class="error-msg">${err.message}</p>`);
    }
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initLogin();
});
