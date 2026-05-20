const path = require('path');

module.exports = {
    // F: drive path where files will be saved
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'F:\\Minerals_Database\\uploads',
    
    // Allowed file types
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Max file size (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    
    // Database path
    DB_PATH: process.env.DB_PATH || 'F:\\Minerals_Database\\minerals.db',
    
    // Security settings
    SECURITY: {
        // JWT secret for authentication
        JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-key-change-in-production',
        
        // Token expiration time
        TOKEN_EXPIRY: '24h',
        
        // Password requirements
        MIN_PASSWORD_LENGTH: 12,
        
        // Rate limiting
        RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        RATE_LIMIT_MAX_REQUESTS: 100, // max requests per window
        
        // CORS allowed origins
        ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5000'],
        
        // Session timeout (30 minutes)
        SESSION_TIMEOUT: 30 * 60 * 1000,
        
        // Encryption key for sensitive data
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'change-this-encryption-key-in-production'
    }
};