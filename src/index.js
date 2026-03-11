import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDB, pool } from './services/dbService.js';
import { chatController } from './controllers/chatController.js';
import { getConversationsList, getConversationHistory, updateConversation, sendManualMessage } from './controllers/conversationsController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Serve React Frontend (dist folder from Vite)
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

app.get('/health', (req, res) => {
    res.send('TravelRock Chatbot API is running');
});

// Chatbot Webhook Endpoint (Evolution API)
app.post('/chat', chatController);

// Conversations CRM Endpoints
app.get('/conversations', getConversationsList);
app.get('/conversations/:session_id', getConversationHistory);
app.put('/conversations/:session_id', updateConversation);
app.post('/conversations/:session_id/send', sendManualMessage);

// Serve SPA route safely
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

initDB()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 TravelRock Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize DB, server not started:', err.message);
        process.exit(1);
    });

process.on('SIGTERM', async () => {
    await pool.end();
    process.exit(0);
});
