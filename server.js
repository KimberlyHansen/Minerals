const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const mineralsRouter = require('./routes/minerals');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet()); // Sets various HTTP headers for security

// CORS configuration
const corsOptions = {
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:5000').split(','),
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Body parser middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Security headers
app.use((req, res, next) => {
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    
    // Add custom security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
    next();
});

// Routes
app.use('/api/minerals', mineralsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server running securely' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    // Don't expose error details to client
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

app.listen(PORT, () => {
    console.log(`✅ Secure server running on http://localhost:${PORT}`);
    console.log(`🔐 Security features enabled: JWT, rate limiting, CORS, helmet`);
});