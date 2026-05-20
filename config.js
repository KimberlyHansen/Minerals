const path = require('path');

module.exports = {
    // F: drive path where files will be saved
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'F:\\Minerals_Database\\uploads',
    
    // Allowed file types
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Max file size (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    
    // Database path
    DB_PATH: process.env.DB_PATH || 'F:\\Minerals_Database\\minerals.db'
};