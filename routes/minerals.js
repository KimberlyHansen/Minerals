const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sqlite3 = require('sqlite3').verbose();
const config = require('../config');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            // Ensure F: drive directory exists
            await fs.mkdir(config.UPLOAD_DIR, { recursive: true });
            cb(null, config.UPLOAD_DIR);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${timestamp}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (config.ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: config.MAX_FILE_SIZE }
});

// Initialize database
const db = new sqlite3.Database(config.DB_PATH, (err) => {
    if (err) {
        console.error('Database error:', err);
    } else {
        console.log('Connected to database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`
        CREATE TABLE IF NOT EXISTS minerals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            country TEXT NOT NULL,
            details TEXT,
            photo_path TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

// Upload endpoint
router.post('/upload', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { mineralName, countryOfOrigin, mineralDetails } = req.body;

        // Validate required fields
        if (!mineralName || !countryOfOrigin) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Save to database
        const photoPath = req.file.path;
        const query = `
            INSERT INTO minerals (name, country, details, photo_path)
            VALUES (?, ?, ?, ?)
        `;

        db.run(query, [mineralName, countryOfOrigin, mineralDetails || '', photoPath], function(err) {
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
                    photoPath: photoPath
                }
            });
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all minerals
router.get('/', (req, res) => {
    db.all('SELECT * FROM minerals ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get single mineral
router.get('/:id', (req, res) => {
    db.get('SELECT * FROM minerals WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Mineral not found' });
        }
        res.json(row);
    });
});

module.exports = router;