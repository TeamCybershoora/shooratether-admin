/*---------------------------------------------------------------------------------------------
 *  SHOORA TETHER Enterprise Admin Portal - Backend Server (TypeScript)
 *  Copyright (c) Cybershoora Pvt. Ltd. All rights reserved.
 *--------------------------------------------------------------------------------------------*/
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// In src/, public is at ../public
const publicPath = path.join(__dirname, '..', 'public');
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const API_BASE_URL = process.env.API_BASE_URL || 'https://shooratether-backend.onrender.com';
app.use(cors());
app.use(express.json());
app.use(express.static(publicPath));
// Public config endpoint for frontend to discover Backend API endpoint
app.get('/api/config', (_req, res) => {
    res.json({
        apiBaseUrl: API_BASE_URL,
        adminVersion: '1.0.0',
        brand: 'SHOORA TETHER Enterprise Control'
    });
});
// Single Page Application routing fallback
app.use((_req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🛡️  SHOORA TETHER Admin Portal running on http://localhost:${PORT}`);
    console.log(`🔗 Connected to Backend API: ${API_BASE_URL}`);
    console.log(`====================================================`);
});
