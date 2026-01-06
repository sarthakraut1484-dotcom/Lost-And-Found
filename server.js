const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve HTML files for clean URLs
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// Data storage files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Initialize data files if they don't exist
const initializeDataFile = (filePath, defaultData = []) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

initializeDataFile(USERS_FILE);
initializeDataFile(REPORTS_FILE);
initializeDataFile(NOTIFICATIONS_FILE);

// Helper functions to read/write data
const readData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
};

const writeData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// ============= API ROUTES =============

// User Authentication
app.post('/api/signup', (req, res) => {
    const users = readData(USERS_FILE);
    const { email, password, name } = req.body;

    // Check if user already exists
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'User already exists' });
    }

    const newUser = {
        id: Date.now().toString(),
        email,
        password, // In production, hash this!
        name,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
});

app.post('/api/login', (req, res) => {
    const users = readData(USERS_FILE);
    const { email, password } = req.body;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
});

// New registration endpoint (alternative path)
app.post('/api/users/register', (req, res) => {
    const users = readData(USERS_FILE);
    const { email, password, name } = req.body;

    // Check if user already exists
    if (users.find(u => u.email === email)) {
        return res.json({ success: false, error: 'This email is already registered. Please login instead.' });
    }

    const newUser = {
        id: Date.now().toString(),
        email,
        password, // In production, hash this!
        name,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData(USERS_FILE, users);

    res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name, createdAt: newUser.createdAt } });
});

// New login endpoint (alternative path)
app.post('/api/users/login', (req, res) => {
    const users = readData(USERS_FILE);
    const { email, password } = req.body;

    // First check if user exists
    const userExists = users.find(u => u.email === email);

    if (!userExists) {
        return res.json({ success: false, error: 'User not found. Please sign up first.' });
    }

    // Then check password
    if (userExists.password !== password) {
        return res.json({ success: false, error: 'Invalid password. Please try again.' });
    }

    res.json({ success: true, user: { id: userExists.id, email: userExists.email, name: userExists.name } });
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
    const users = readData(USERS_FILE);
    // Don't send passwords in response
    const safeUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        createdAt: u.createdAt
    }));
    res.json(safeUsers);
});

// Delete user (admin only)
app.delete('/api/users/:id', (req, res) => {
    let users = readData(USERS_FILE);
    const userId = req.params.id;

    users = users.filter(u => u.id !== userId);
    writeData(USERS_FILE, users);

    // Also delete all reports by this user
    let reports = readData(REPORTS_FILE);
    reports = reports.filter(r => r.reportedBy !== userId);
    writeData(REPORTS_FILE, reports);

    // Also delete all notifications for this user
    let notifications = readData(NOTIFICATIONS_FILE);
    notifications = notifications.filter(n => n.userId !== userId);
    writeData(NOTIFICATIONS_FILE, notifications);

    res.json({ success: true });
});

// Reports CRUD
app.get('/api/reports', (req, res) => {
    const reports = readData(REPORTS_FILE);
    res.json(reports);
});

app.get('/api/reports/user/:userId', (req, res) => {
    const reports = readData(REPORTS_FILE);
    const userReports = reports.filter(r => r.reportedBy === req.params.userId);
    res.json(userReports);
});

app.post('/api/reports', upload.single('image'), (req, res) => {
    const reports = readData(REPORTS_FILE);

    const newReport = {
        id: Date.now().toString(),
        type: req.body.type,
        category: req.body.category,
        name: req.body.name,
        description: req.body.description,
        location: req.body.location,
        date: req.body.date,
        contact: req.body.contact,
        reportedBy: req.body.reportedBy,
        reportedByName: req.body.reportedByName,
        image: req.file ? `/uploads/${req.file.filename}` : null,
        status: 'active',
        reportedAt: new Date().toISOString()
    };

    reports.push(newReport);
    writeData(REPORTS_FILE, reports);

    res.json({ success: true, report: newReport });
});

app.delete('/api/reports/:id', (req, res) => {
    let reports = readData(REPORTS_FILE);
    reports = reports.filter(r => r.id !== req.params.id);
    writeData(REPORTS_FILE, reports);
    res.json({ success: true });
});

// Notifications
app.get('/api/notifications/:userId', (req, res) => {
    const notifications = readData(NOTIFICATIONS_FILE);
    const userNotifications = notifications.filter(n => n.userId === req.params.userId);
    res.json(userNotifications);
});

app.post('/api/notifications', (req, res) => {
    const notifications = readData(NOTIFICATIONS_FILE);

    const newNotification = {
        id: Date.now().toString(),
        userId: req.body.userId,
        title: req.body.title,
        message: req.body.message,
        type: req.body.type,
        lostItem: req.body.lostItem,
        foundItem: req.body.foundItem,
        read: false,
        timestamp: new Date().toISOString()
    };

    notifications.push(newNotification);
    writeData(NOTIFICATIONS_FILE, notifications);

    res.json({ success: true, notification: newNotification });
});

app.put('/api/notifications/:id/read', (req, res) => {
    const notifications = readData(NOTIFICATIONS_FILE);
    const notification = notifications.find(n => n.id === req.params.id);

    if (notification) {
        notification.read = true;
        writeData(NOTIFICATIONS_FILE, notifications);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Notification not found' });
    }
});

app.put('/api/notifications/user/:userId/read-all', (req, res) => {
    const notifications = readData(NOTIFICATIONS_FILE);
    notifications.forEach(n => {
        if (n.userId === req.params.userId) {
            n.read = true;
        }
    });
    writeData(NOTIFICATIONS_FILE, notifications);
    res.json({ success: true });
});

app.delete('/api/notifications/:id', (req, res) => {
    let notifications = readData(NOTIFICATIONS_FILE);
    notifications = notifications.filter(n => n.id !== req.params.id);
    writeData(NOTIFICATIONS_FILE, notifications);
    res.json({ success: true });
});

// Admin - Match items
app.post('/api/admin/match-items', (req, res) => {
    const { lostItemId, foundItemId } = req.body;
    const reports = readData(REPORTS_FILE);
    const notifications = readData(NOTIFICATIONS_FILE);

    const lostItem = reports.find(r => r.id === lostItemId && r.type === 'lost');
    const foundItem = reports.find(r => r.id === foundItemId && r.type === 'found');

    if (!lostItem || !foundItem) {
        return res.status(404).json({ error: 'Items not found' });
    }

    // Update item status
    lostItem.status = 'matched';
    lostItem.matchedWith = foundItemId;
    foundItem.status = 'matched';
    foundItem.matchedWith = lostItemId;

    writeData(REPORTS_FILE, reports);

    // Create notifications for both users
    const notification1 = {
        id: Date.now().toString() + '-1',
        userId: lostItem.reportedBy,
        title: '🎉 Match Found!',
        message: `Great news! We found a match for your lost item "${lostItem.name}".`,
        type: 'match_found',
        lostItem: lostItem,
        foundItem: foundItem,
        read: false,
        timestamp: new Date().toISOString()
    };

    const notification2 = {
        id: Date.now().toString() + '-2',
        userId: foundItem.reportedBy,
        title: '🎉 Match Found!',
        message: `Great news! We found the owner of the item "${foundItem.name}" you found.`,
        type: 'match_found',
        lostItem: lostItem,
        foundItem: foundItem,
        read: false,
        timestamp: new Date().toISOString()
    };

    notifications.push(notification1, notification2);
    writeData(NOTIFICATIONS_FILE, notifications);

    res.json({ success: true, message: 'Items matched successfully' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Lost & Found Server running on http://localhost:${PORT}`);
    console.log(`📁 Data stored in: ${DATA_DIR}`);
    console.log(`🖼️  Uploads stored in: ${uploadsDir}`);
});
