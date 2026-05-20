const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const mineralsRouter = require('./routes/minerals');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/minerals', mineralsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Server running' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});