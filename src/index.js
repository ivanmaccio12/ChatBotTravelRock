import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

import { initDB, pool } from './services/dbService.js';
import { chatController, unpauseController } from './controllers/chatController.js';
import { getConversationsList, getConversationHistory, updateConversation, sendManualMessage } from './controllers/conversationsController.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uploads directory setup
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadsDir),
        filename: (req, file, cb) => {
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            const ext = path.extname(file.originalname);
            cb(null, `${unique}${ext}`);
        }
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        // Solo tipos compatibles con WhatsApp
        const allowed = [
            'image/jpeg', 'image/png', 'image/webp',
            'video/mp4',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'audio/ogg', 'audio/mpeg', 'audio/aac'
        ];
        allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error(`Tipo no permitido. Solo imágenes (JPG/PNG/WEBP), MP4, PDF, Word y audio.`));
    }
});

const app = express();
const PORT = process.env.PORT || 3006;

app.use(cors());
app.use(express.json());

// Serve React Frontend (dist folder from Vite)
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

app.get('/health', (req, res) => {
    res.send('TravelRock Chatbot API is running');
});

// Chatbot Webhook Endpoint (Evolution API)
app.post('/chat', chatController);
app.post('/chat/unpause', unpauseController);

// Conversations CRM Endpoints
app.get('/conversations', getConversationsList);
app.get('/conversations/:session_id', getConversationHistory);
app.put('/conversations/:session_id', updateConversation);
app.post('/conversations/:session_id/send', upload.single('file'), sendManualMessage);

// Demo chat (simulador de celular, session_id fijo 999999999)
app.get('/demo', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(__dirname, '../demo.html'));
});

// Informe de flujos conversacionales (acceso directo, aislado del frontend)
app.get('/informe', (req, res) => {
  res.sendFile(path.join(__dirname, '../informe_flujos_bot.html'));
});

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
