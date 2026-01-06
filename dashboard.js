const API_BASE_URL = 'http://localhost:3000/api';
let currentUser = null;

// ============= INITIALIZATION =============
window.addEventListener('DOMContentLoaded', async function () {
    // Check if user is logged in
    const userData = localStorage.getItem('currentUser');

    if (!userData) {
        alert('⚠️ Please login first to access the dashboard!');
        window.location.href = 'login.html';
        return;
    }

    currentUser = JSON.parse(userData);
    document.getElementById('userName').textContent = '👤 ' + currentUser.name;

    // Set default tab to Lost Items
    switchTab('lost');

    // Load initial data
    await loadLostItems();
    await loadNotificationBadge();

    // Set up event listeners
    setupEventListeners();
});

// ============= EVENT LISTENERS =============
function setupEventListeners() {
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Notification bell
    document.getElementById('notificationBell').addEventListener('click', toggleNotificationDropdown);

    // Mark all read
    document.getElementById('markAllRead').addEventListener('click', markAllNotificationsRead);

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const dropdown = document.getElementById('notificationDropdown');
        const bell = document.getElementById('notificationBell');
        if (!dropdown.contains(e.target) && !bell.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Report form
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);

    // Image upload
    setupImageUpload();
}

// ============= TAB SWITCHING =============
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabName).classList.add('active');

    // Add active class to clicked nav item
    const activeNavItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Load data based on tab
    switch (tabName) {
        case 'lost':
            loadLostItems();
            break;
        case 'found':
            loadFoundItems();
            break;
        case 'my-items':
            loadMyReports();
            break;
        case 'notifications':
            loadNotifications();
            break;
    }
}

// ============= IMAGE UPLOAD =============
function setupImageUpload() {
    const uploadArea = document.getElementById('imageUploadArea');
    const fileInput = document.getElementById('itemImage');
    const placeholder = document.getElementById('uploadPlaceholder');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const removeBtn = document.getElementById('removeImage');

    // Click to upload
    uploadArea.addEventListener('click', function (e) {
        if (!e.target.classList.contains('remove-image')) {
            fileInput.click();
        }
    });

    // File selection
    fileInput.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            displayImagePreview(file);
        }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.8)';
    });

    uploadArea.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
    });

    uploadArea.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadArea.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            fileInput.files = e.dataTransfer.files;
            displayImagePreview(file);
        }
    });

    // Remove image
    removeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        fileInput.value = '';
        placeholder.style.display = 'flex';
        preview.style.display = 'none';
    });
}

function displayImagePreview(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('uploadPlaceholder').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

// ============= FORM SUBMISSION =============
async function handleReportSubmit(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('type', document.getElementById('itemType').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('name', document.getElementById('itemName').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('location', document.getElementById('location').value);
    formData.append('date', document.getElementById('date').value);
    formData.append('contact', document.getElementById('contact').value);
    formData.append('reportedBy', currentUser.id);
    formData.append('reportedByName', currentUser.name);

    const imageFile = document.getElementById('itemImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/reports`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert('✅ Item reported successfully!\n\nItem: ' + result.report.name + '\nType: ' + result.report.type.toUpperCase());

            // Reset form
            document.getElementById('reportForm').reset();
            document.getElementById('uploadPlaceholder').style.display = 'flex';
            document.getElementById('imagePreview').style.display = 'none';

            // Ask if user wants to view reports
            const viewReports = confirm('Would you like to view your reports?');
            if (viewReports) {
                switchTab('my-items');
            }
        }
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('❌ Error submitting report. Please make sure the server is running.');
    }
}

// ============= LOAD ITEMS =============
async function loadLostItems() {
    const grid = document.getElementById('lostItemsGrid');
    grid.innerHTML = '<div class="loading">Loading lost items...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        const reports = await response.json();

        const lostItems = reports.filter(r => r.type === 'lost' && r.status === 'active');

        if (lostItems.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔍</div>
                    <h3>No Lost Items</h3>
                    <p>No lost items have been reported yet.</p>
                </div>
            `;
        } else {
            grid.innerHTML = lostItems.map(item => createItemCard(item)).join('');
        }
    } catch (error) {
        console.error('Error loading lost items:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Unable to load lost items. Please make sure the server is running.</p>
            </div>
        `;
    }
}

async function loadFoundItems() {
    const grid = document.getElementById('foundItemsGrid');
    grid.innerHTML = '<div class="loading">Loading found items...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/reports`);
        const reports = await response.json();

        const foundItems = reports.filter(r => r.type === 'found' && r.status === 'active');

        if (foundItems.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">✅</div>
                    <h3>No Found Items</h3>
                    <p>No found items have been reported yet.</p>
                </div>
            `;
        } else {
            grid.innerHTML = foundItems.map(item => createItemCard(item)).join('');
        }
    } catch (error) {
        console.error('Error loading found items:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Unable to load found items. Please make sure the server is running.</p>
            </div>
        `;
    }
}

async function loadMyReports() {
    const grid = document.getElementById('myItemsGrid');
    grid.innerHTML = '<div class="loading">Loading your reports...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/reports/user/${currentUser.id}`);
        const myReports = await response.json();

        if (myReports.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📦</div>
                    <h3>No Reports Yet</h3>
                    <p>You haven't reported any items. Use the "Report Item" tab to get started.</p>
                </div>
            `;
        } else {
            grid.innerHTML = myReports.map(item => createItemCard(item, true)).join('');
        }
    } catch (error) {
        console.error('Error loading my reports:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Unable to load your reports. Please make sure the server is running.</p>
            </div>
        `;
    }
}

// ============= CREATE ITEM CARD =============
function createItemCard(item, isMyReport = false) {
    const statusClass = item.status === 'matched' ? 'status-matched' : (item.type === 'lost' ? 'status-lost' : 'status-found');
    const statusText = item.status === 'matched' ? 'MATCHED' : item.type.toUpperCase();

    return `
        <div class="item-card">
            ${item.image ? `<img src="${API_BASE_URL.replace('/api', '')}${item.image}" alt="${item.name}" class="item-image">` : ''}
            <span class="item-status ${statusClass}">${statusText}</span>
            <h3>${item.name}</h3>
            <div class="item-details">
                <p><strong>Category:</strong> ${item.category}</p>
                <p><strong>Description:</strong> ${item.description}</p>
                <p><strong>Location:</strong> ${item.location}</p>
                ${isMyReport ? `<p><strong>Status:</strong> ${item.status}</p>` : ''}
            </div>
            <div class="item-meta">
                <span>📅 ${new Date(item.date).toLocaleDateString()}</span>
                ${!isMyReport && item.status === 'active' ? `<button class="view-btn" onclick="viewItemDetails('${item.id}')">👁️ View</button>` : ''}
                ${isMyReport ? `<button class="view-btn" onclick="viewItemDetails('${item.id}')">👁️ View</button>` : ''}
            </div>
        </div>
    `;
}

// ============= NOTIFICATIONS =============
async function loadNotifications() {
    const grid = document.getElementById('notificationsGrid');
    grid.innerHTML = '<div class="loading">Loading notifications...</div>';

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${currentUser.id}`);
        const notifications = await response.json();

        if (notifications.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔔</div>
                    <h3>No Notifications</h3>
                    <p>You don't have any notifications yet. When your items are matched, you'll see notifications here.</p>
                </div>
            `;
        } else {
            // Sort by timestamp (newest first)
            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            grid.innerHTML = notifications.map(notif => createNotificationCard(notif)).join('');
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>Connection Error</h3>
                <p>Unable to load notifications. Please make sure the server is running.</p>
            </div>
        `;
    }
}

function createNotificationCard(notif) {
    const timeAgo = getTimeAgo(new Date(notif.timestamp));
    const isMatchFound = notif.type === 'match_found';

    return `
        <div class="notification-card ${!notif.read ? 'unread' : ''}" data-notification-id="${notif.id}">
            <div class="notification-header">
                <div class="notification-title">${notif.title}</div>
                ${!notif.read ? '<span class="unread-badge">NEW</span>' : ''}
            </div>
            <div class="notification-body">
                <p>${notif.message}</p>
                <br>
                <p><strong>Your ${isMatchFound && notif.lostItem ? 'Lost' : 'Found'} Item:</strong></p>
                ${notif.lostItem ? `
                    <p>📦 ${notif.lostItem.name}</p>
                    <p>📍 ${notif.lostItem.location}</p>
                    <p>📅 ${new Date(notif.lostItem.date).toLocaleDateString()}</p>
                ` : ''}
                <br>
                <p><strong>${isMatchFound && notif.foundItem ? 'Found' : 'Lost'} Item Match:</strong></p>
                ${notif.foundItem ? `
                    <p>📦 ${notif.foundItem.name}</p>
                    <p>📍 ${notif.foundItem.location}</p>
                    <p>📅 ${new Date(notif.foundItem.date).toLocaleDateString()}</p>
                    <p>👤 Found by: ${notif.foundItem.reportedByName}</p>
                    <p>📞 Contact: ${notif.foundItem.contact}</p>
                ` : ''}
            </div>
            <div class="notification-footer">
                <span class="notification-time">⏰ ${timeAgo}</span>
                <button class="delete-notification-btn" onclick="deleteNotification('${notif.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

async function loadNotificationBadge() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${currentUser.id}`);
        const notifications = await response.json();

        const unreadCount = notifications.filter(n => !n.read).length;

        const badge = document.getElementById('notificationBadge');
        const sidebarCount = document.getElementById('sidebarNotificationCount');

        if (unreadCount > 0) {
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badge.style.display = 'flex';
            sidebarCount.textContent = unreadCount > 9 ? '9+' : unreadCount;
            sidebarCount.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
            sidebarCount.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading notification badge:', error);
    }
}

function toggleNotificationDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.classList.toggle('active');

    if (dropdown.classList.contains('active')) {
        loadNotificationDropdown();
    }
}

async function loadNotificationDropdown() {
    const dropdownBody = document.getElementById('notificationDropdownBody');

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${currentUser.id}`);
        const notifications = await response.json();

        if (notifications.length === 0) {
            dropdownBody.innerHTML = `
                <div class="notification-empty">
                    <div style="font-size:48px;margin-bottom:10px">🔔</div>
                    <div>No notifications yet</div>
                </div>
            `;
        } else {
            notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            dropdownBody.innerHTML = notifications.slice(0, 5).map(notif => {
                const timeAgo = getTimeAgo(new Date(notif.timestamp));
                return `
                    <div class="notification-item ${!notif.read ? 'unread' : ''}" data-notification-id="${notif.id}">
                        <div class="notification-item-header">
                            <div class="notification-item-title">${notif.title}</div>
                            <div class="notification-item-time">${timeAgo}</div>
                        </div>
                        <div class="notification-item-message">
                            ${notif.message}
                        </div>
                        <div class="notification-item-actions">
                            <button class="delete-notification-btn" onclick="deleteNotification('${notif.id}', true)">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading dropdown:', error);
    }
}

async function markAllNotificationsRead() {
    try {
        await fetch(`${API_BASE_URL}/notifications/user/${currentUser.id}/read-all`, {
            method: 'PUT'
        });
        await loadNotificationBadge();
        await loadNotificationDropdown();
    } catch (error) {
        console.error('Error marking notifications as read:', error);
    }
}

// ============= HELPER FUNCTIONS =============
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return date.toLocaleDateString();
}

// Store all reports for details view
let allReports = [];

async function viewItemDetails(itemId) {
    try {
        // Fetch reports if not already loaded
        if (allReports.length === 0) {
            const response = await fetch(`${API_BASE_URL}/reports`);
            allReports = await response.json();
        }

        const item = allReports.find(r => r.id === itemId);
        if (!item) {
            alert('Item not found');
            return;
        }

        const modal = document.getElementById('itemDetailsModal');
        const detailsContainer = document.getElementById('itemDetailsContent');

        const statusClass = item.status === 'matched' ? 'status-matched' : (item.type === 'lost' ? 'status-lost' : 'status-found');
        const statusText = item.status === 'matched' ? 'MATCHED' : item.type.toUpperCase();

        detailsContainer.innerHTML = `
            <div class="detail-row">
                <div class="detail-label">Item Type</div>
                <div class="detail-value">
                    <span class="detail-badge ${statusClass}">${statusText}</span>
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
            
            ${item.image ? `
                <div class="detail-row">
                    <div class="detail-label">Image</div>
                    <img src="${API_BASE_URL.replace('/api', '')}${item.image}" class="detail-image" alt="${item.name}">
                </div>
            ` : ''}
        `;

        modal.classList.add('active');
    } catch (error) {
        console.error('Error loading item details:', error);
        alert('❌ Error loading item details. Please try again.');
    }
}

function closeItemDetailsModal() {
    const modal = document.getElementById('itemDetailsModal');
    modal.classList.remove('active');
}

async function deleteNotification(notificationId, isDropdown = false) {
    // Confirm deletion
    const confirmDelete = confirm('Are you sure you want to delete this notification?');
    if (!confirmDelete) return;

    try {
        // Delete from server
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Find the notification element and animate removal
            const notificationElement = document.querySelector(`[data-notification-id="${notificationId}"]`);
            if (notificationElement) {
                notificationElement.style.opacity = '0';
                notificationElement.style.transform = 'translateX(-20px)';

                // Wait for animation to complete
                setTimeout(() => {
                    notificationElement.remove();
                }, 300);
            }

            // Refresh the appropriate view
            if (isDropdown) {
                setTimeout(() => loadNotificationDropdown(), 300);
            } else {
                setTimeout(() => loadNotifications(), 300);
            }

            // Always refresh the notification badge
            setTimeout(() => loadNotificationBadge(), 300);
        } else {
            alert('❌ Failed to delete notification. Please try again.');
        }
    } catch (error) {
        console.error('Error deleting notification:', error);
        alert('❌ Error deleting notification. Please make sure the server is running.');
    }
}

function handleLogout(e) {
    e.preventDefault();

    const confirmLogout = confirm('Are you sure you want to logout?');
    if (confirmLogout) {
        localStorage.removeItem('currentUser');
        alert('✅ Logged out successfully!');
        window.location.href = 'index.html';
    }
}
