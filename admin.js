const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@lostandfound.com';
const ADMIN_PASSWORD = 'admin123';

let selectedLostItem = null;
let selectedFoundItem = null;
let allReports = [];

// ============= INITIALIZATION =============
window.addEventListener('DOMContentLoaded', async function () {
    // Check admin login
    const currentUser = localStorage.getItem('currentUser');

    if (!currentUser) {
        const email = prompt('Admin Email:');
        const password = prompt('Admin Password:');

        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            alert('❌ Access Denied! Invalid admin credentials.');
            window.location.href = 'index.html';
            return;
        }

        localStorage.setItem('currentUser', JSON.stringify({
            id: 'admin',
            name: 'Administrator',
            email: ADMIN_EMAIL,
            isAdmin: true
        }));
    } else {
        const user = JSON.parse(currentUser);
        if (!user.isAdmin || user.email !== ADMIN_EMAIL) {
            alert('❌ Access Denied! Admin privileges required.');
            window.location.href = 'index.html';
            return;
        }
    }

    await loadInitialData();
    setupEventListeners();
});

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('sendMatchBtn').addEventListener('click', handleMatchItems);
}

// ============= LOAD DATA =============
async function loadInitialData() {
    await loadStats();
    await loadReports();
    await loadUsers();
    await loadMatchingItems();
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        const reports = await response.json();

        const lost = reports.filter(r => r.type === 'lost' && r.status === 'active').length;
        const found = reports.filter(r => r.type === 'found' && r.status === 'active').length;
        const matched = reports.filter(r => r.status === 'matched').length;

        document.getElementById('totalReports').textContent = reports.length;
        document.getElementById('lostItems').textContent = lost;
        document.getElementById('foundItems').textContent = found;
        document.getElementById('matchedItems').textContent = matched;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadReports() {
    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        const reports = await response.json();
        allReports = reports;

        const tbody = document.getElementById('reportsBody');

        if (reports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:rgba(255,255,255,0.5)">No reports yet</td></tr>';
            return;
        }

        tbody.innerHTML = reports.map((item) => `
            <tr>
                <td><span class="status-badge badge-${item.type}">${item.type.toUpperCase()}</span></td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.location}</td>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${item.reportedByName || item.reportedBy}</td>
                <td><span class="status-badge badge-${item.status}">${item.status.toUpperCase()}</span></td>
                <td>
                    <button class="btn btn-delete" onclick="deleteReport('${item.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading reports:', error);
        const tbody = document.getElementById('reportsBody');
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#ffaaaa">Connection error. Please make sure the server is running.</td></tr>';
    }
}

async function loadUsers() {
    const tbody = document.getElementById('usersBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;">Loading users...</td></tr>';

    try {
        // Fetch users and reports
        const [usersResponse, reportsResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/users`),
            fetch(`${API_BASE_URL}/reports`)
        ]);

        const users = await usersResponse.json();
        const reports = await reportsResponse.json();

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:rgba(255,255,255,0.5)">No users registered yet</td></tr>';
            return;
        }

        // Create user rows with report counts
        tbody.innerHTML = users.map(user => {
            const userReports = reports.filter(r => r.reportedBy === user.id);
            const registeredDate = new Date(user.createdAt).toLocaleDateString();

            return `
                <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                    <td style="padding: 1rem;">
                        <div style="font-weight: 600;">${user.name}</div>
                    </td>
                    <td style="padding: 1rem;">${user.email}</td>
                    <td style="padding: 1rem;">${registeredDate}</td>
                    <td style="padding: 1rem;">
                        <span style="background: rgba(102, 126, 234, 0.3); padding: 0.3rem 0.8rem; border-radius: 12px; font-weight: 600;">
                            ${userReports.length} ${userReports.length === 1 ? 'report' : 'reports'}
                        </span>
                    </td>
                    <td style="padding: 1rem;">
                        <button 
                            onclick="deleteUser('${user.id}', '${user.name}')" 
                            style="background: rgba(255, 71, 87, 0.2); color: #ff6b81; border: 1px solid rgba(255, 71, 87, 0.4); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease;"
                            onmouseover="this.style.background='#ff4757'; this.style.color='white'; this.style.borderColor='#ff4757';"
                            onmouseout="this.style.background='rgba(255, 71, 87, 0.2)'; this.style.color='#ff6b81'; this.style.borderColor='rgba(255, 71, 87, 0.4)';"
                        >
                            🗑️ Delete
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#ff6b81">Error loading users. Please check server connection.</td></tr>';
    }
}

async function loadMatchingItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        const reports = await response.json();

        const lostItems = reports.filter(r => r.type === 'lost' && r.status === 'active');
        const foundItems = reports.filter(r => r.type === 'found' && r.status === 'active');

        const lostList = document.getElementById('lostItemsList');
        const foundList = document.getElementById('foundItemsList');

        if (lostItems.length === 0) {
            lostList.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px">No unmatched lost items</p>';
        } else {
            lostList.innerHTML = lostItems.map((item) => `
                <div class="match-item ${selectedLostItem === item.id ? 'selected' : ''}" data-id="${item.id}" onclick="selectLostItem('${item.id}')">
                    ${item.image ? `<img src="${API_BASE_URL.replace('/api', '')}${item.image}" class="match-item-image" alt="${item.name}">` : '<div class="match-item-image" style="background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>'}
                    <div class="match-item-content">
                        <h4>${item.name}</h4>
                        <p>${item.category} • ${item.location} • ${new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <div class="match-item-actions">
                        <button class="btn-view" onclick="event.stopPropagation(); viewItemDetails('${item.id}')">👁️ View</button>
                    </div>
                </div>
            `).join('');
        }

        if (foundItems.length === 0) {
            foundList.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px">No unmatched found items</p>';
        } else {
            foundList.innerHTML = foundItems.map((item) => `
                <div class="match-item ${selectedFoundItem === item.id ? 'selected' : ''}" data-id="${item.id}" onclick="selectFoundItem('${item.id}')">
                    ${item.image ? `<img src="${API_BASE_URL.replace('/api', '')}${item.image}" class="match-item-image" alt="${item.name}">` : '<div class="match-item-image" style="background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>'}
                    <div class="match-item-content">
                        <h4>${item.name}</h4>
                        <p>${item.category} • ${item.location} • ${new Date(item.date).toLocaleDateString()}</p>
                    </div>
                    <div class="match-item-actions">
                        <button class="btn-view" onclick="event.stopPropagation(); viewItemDetails('${item.id}')">👁️ View</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading matching items:', error);
    }
}

// ============= ITEM SELECTION =============
function selectLostItem(itemId) {
    // Toggle selection if clicking the same item
    if (selectedLostItem === itemId) {
        selectedLostItem = null;
    } else {
        selectedLostItem = itemId;
    }

    document.querySelectorAll('#lostItemsList .match-item').forEach(el => {
        if (el.dataset.id === itemId && selectedLostItem === itemId) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    updateMatchButton();
}

function selectFoundItem(itemId) {
    // Toggle selection if clicking the same item
    if (selectedFoundItem === itemId) {
        selectedFoundItem = null;
    } else {
        selectedFoundItem = itemId;
    }

    document.querySelectorAll('#foundItemsList .match-item').forEach(el => {
        if (el.dataset.id === itemId && selectedFoundItem === itemId) {
            el.classList.add('selected');
        } else {
            el.classList.remove('selected');
        }
    });

    updateMatchButton();
}

function updateMatchButton() {
    const btn = document.getElementById('sendMatchBtn');
    btn.disabled = !selectedLostItem || !selectedFoundItem;
}

// ============= MATCH ITEMS =============
async function handleMatchItems() {
    if (!selectedLostItem || !selectedFoundItem) {
        alert('Please select both a lost and found item to match.');
        return;
    }

    const confirmMatch = confirm('Are you sure you want to match these items? Both users will be notified.');
    if (!confirmMatch) return;

    try {
        const response = await fetch(`${API_BASE_URL}/admin/match-items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lostItemId: selectedLostItem,
                foundItemId: selectedFoundItem
            })
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Items matched successfully! Both users have been notified.');

            // Reset selections
            selectedLostItem = null;
            selectedFoundItem = null;

            // Reload data
            await loadStats();
            await loadReports();
            await loadMatchingItems();
        } else {
            alert('❌ Error matching items: ' + result.error);
        }
    } catch (error) {
        console.error('Error matching items:', error);
        alert('❌ Error matching items. Please make sure the server is running.');
    }
}

// ============= DELETE REPORT =============
async function deleteReport(itemId) {
    const confirmDelete = confirm('Are you sure you want to delete this report?');
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/reports/${itemId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Report deleted successfully!');
            await loadStats();
            await loadReports();
            await loadMatchingItems();
        }
    } catch (error) {
        console.error('Error deleting report:', error);
        alert('❌ Error deleting report.');
    }
}

// ============= TAB SWITCHING =============
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// ============= DELETE USER =============
async function deleteUser(userId, userName) {
    const confirmDelete = confirm(`Are you sure you want to delete user "${userName}"?\n\nThis will also delete:\n- All their reports\n- All their notifications\n\nThis action cannot be undone!`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ User "${userName}" has been deleted successfully!`);
            // Reload all data to reflect changes
            await loadStats();
            await loadReports();
            await loadUsers();
            await loadMatchingItems();
        } else {
            alert('❌ Failed to delete user. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('❌ Error deleting user. Please make sure the server is running.');
    }
}

// ============= LOGOUT =============
function handleLogout(e) {
    e.preventDefault();
    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
        localStorage.removeItem('currentUser');
        alert('✅ Logged out successfully!');
        window.location.href = 'index.html';
    }
}

// ============= VIEW ITEM DETAILS =============
function viewItemDetails(itemId) {
    const item = allReports.find(r => r.id === itemId);
    if (!item) {
        alert('Item not found');
        return;
    }

    const modal = document.getElementById('viewModal');
    const detailsContainer = document.getElementById('viewDetails');

    detailsContainer.innerHTML = `
        <div class="detail-row">
            <div class="detail-label">Item Type</div>
            <div class="detail-value">
                <span class="status-badge badge-${item.type}">${item.type.toUpperCase()}</span>
            </div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Item Name</div>
            <div class="detail-value">${item.name}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Category</div>
            <div class="detail-value">${item.category}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Description</div>
            <div class="detail-value">${item.description || 'No description provided'}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Location</div>
            <div class="detail-value">${item.location}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Date</div>
            <div class="detail-value">${new Date(item.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Reported By</div>
            <div class="detail-value">${item.reportedByName || item.reportedBy}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Contact Information</div>
            <div class="detail-value">${item.contact || 'Not provided'}</div>
        </div>
        
        <div class="detail-row">
            <div class="detail-label">Status</div>
            <div class="detail-value">
                <span class="status-badge badge-${item.status}">${item.status.toUpperCase()}</span>
            </div>
        </div>
        
        ${item.image ? `
            <div class="detail-row">
                <div class="detail-label">Image</div>
                <img src="${API_BASE_URL.replace('/api', '')}${item.image}" class="detail-image" alt="${item.name}">
            </div>
        ` : ''}
    `;

    modal.classList.add('active');
}

function closeViewModal() {
    const modal = document.getElementById('viewModal');
    modal.classList.remove('active');
}

