const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const config = require('../config');
const crypto = require('crypto');

const router = express.Router();

// Rate limiting middleware
const uploadLimiter = rateLimit({
    windowMs: config.SECURITY.RATE_LIMIT_WINDOW_MS,
    max: config.SECURITY.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many upload requests, please try again later'
});

// JWT verification middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// Configure multer for file uploads with security checks
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(config.UPLOAD_DIR, { recursive: true });
            cb(null, config.UPLOAD_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const randomStr = crypto.randomBytes(8).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `mineral-${timestamp}-${randomStr}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Validate MIME type
    if (!config.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        return;
    }

    // Additional security: check file extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExts.includes(ext)) {
        cb(new Error('Invalid file extension'));
        return;
    }

    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: config.MAX_FILE_SIZE }
});

// Initialize database with security schema
const db = new sqlite3.Database(config.DB_PATH, (err) => {
    if (err) {
        console.error('Database error:', err);
    } else {
        console.log('Connected to database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Create minerals table
    db.run(`
        CREATE TABLE IF NOT EXISTS minerals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            details TEXT,
            photo_path TEXT NOT NULL,
            uploaded_by TEXT,
            user_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Create users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'viewer',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        )
    `);

    // Create audit log table
    db.run(`
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_id INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
}

// Function to log actions for audit trail
function logAuditAction(userId, action, resourceId, ipAddress) {
    const query = `
        INSERT INTO audit_logs (user_id, action, resource_id, ip_address)
        VALUES (?, ?, ?, ?)
    `;
    db.run(query, [userId, action, resourceId, ipAddress]);
}

// Authentication endpoint - Login
router.post('/auth/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: config.SECURITY.MIN_PASSWORD_LENGTH })
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        bcrypt.compare(password, user.password_hash, (err, isMatch) => {
            if (err || !isMatch) {
                logAuditAction(null, 'failed_login', null, req.ip);
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: config.SECURITY.TOKEN_EXPIRY }
            );

            // Update last login
            db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
            
            logAuditAction(user.id, 'login', null, req.ip);

            res.json({
                success: true,
                token: token,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            });
        });
    });
});

// Public endpoint - Get all minerals (no authentication required for gallery view)
router.get('/all', (req, res) => {
    const query = `
        SELECT 
            id, 
            name as mineralName, 
            country as countryOfOrigin, 
            details as mineralDetails, 
            photo_path as photoUrl,
            uploaded_by as uploadedBy,
            created_at as createdAt
        FROM minerals 
        ORDER BY created_at DESC
    `;

    db.all(query, (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to fetch minerals' });
        }

        // Convert file paths to accessible URLs if needed
        const minerals = (rows || []).map(mineral => ({
            ...mineral,
            photoUrl: mineral.photoUrl ? `/uploads/${path.basename(mineral.photoUrl)}` : null
        }));

        res.json(minerals);
    });
});

// Upload endpoint - Public (no authentication required for now)
router.post('/upload', uploadLimiter, [
    body('mineralName').trim().isLength({ min: 1, max: 100 }),
    body('countryOfOrigin').trim().isLength({ min: 1 }),
    body('mineralDetails').trim().isLength({ max: 1000 }).optional(),
    body('uploaderName').trim().isLength({ min: 1, max: 100 })
], upload.single('photo'), (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { mineralName, countryOfOrigin, mineralDetails, uploaderName } = req.body;

        const photoPath = req.file.path;
        const query = `
            INSERT INTO minerals (name, country, details, photo_path, uploaded_by, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `;

        db.run(query, [mineralName, countryOfOrigin, mineralDetails || '', photoPath, uploaderName], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Failed to save mineral data' });
            }

            res.json({
                success: true,
                message: 'Mineral uploaded successfully',
                data: {
                    id: this.lastID,
                    mineralName,
                    countryOfOrigin,
                    uploadedBy: uploaderName,
                    photoPath: photoPath
                }
            });
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all minerals (authenticated users only)
router.get('/', verifyToken, (req, res) => {
    let query = 'SELECT id, name, country, details, photo_path, uploaded_by, created_at FROM minerals WHERE user_id = ? ORDER BY created_at DESC';
    
    if (req.userRole === 'admin') {
        query = 'SELECT id, name, country, details, photo_path, uploaded_by, user_id, created_at FROM minerals ORDER BY created_at DESC';
    }

    db.all(query, [req.userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get single mineral
router.get('/:id', verifyToken, (req, res) => {
    db.get('SELECT * FROM minerals WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Mineral not found' });
        }

        // Check ownership
        if (row.user_id !== req.userId && req.userRole !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(row);
    });
});

// Get audit logs (admin only)
router.get('/admin/audit-logs', verifyToken, (req, res) => {
    if (req.userRole !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    db.all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

module.exports = router;
