import { pool } from '../services/dbService.js';
import { getSession, saveSession } from '../services/conversationService.js';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

// GET /conversations
export const getConversationsList = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT session_id, status, unread_count, needs_intervention, last_updated as updated_at 
             FROM travelrock_conversations 
             WHERE last_updated >= NOW() - INTERVAL '24 HOURS'
             ORDER BY last_updated DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// GET /conversations/:session_id
export const getConversationHistory = async (req, res) => {
    try {
        const session = await getSession(req.params.session_id);
        if (!session) {
            return res.status(404).json({ error: 'Conversation not found' });
        }
        res.json({ success: true, data: session });
    } catch (error) {
        console.error('Error fetching conversation history:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// PUT /conversations/:session_id
export const updateConversation = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { status, unread_count, needs_intervention } = req.body;

        let updates = [];
        let values = [session_id];
        let argIndex = 2;

        if (status !== undefined) {
            updates.push(`status = $${argIndex++}`);
            values.push(status);
        }
        if (unread_count !== undefined) {
            updates.push(`unread_count = $${argIndex++}`);
            values.push(unread_count);
        }
        if (needs_intervention !== undefined) {
            updates.push(`needs_intervention = $${argIndex++}`);
            values.push(needs_intervention);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const query = `UPDATE travelrock_conversations SET ${updates.join(', ')} WHERE session_id = $1 RETURNING *`;
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating conversation:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// POST /conversations/:session_id/send
export const sendManualMessage = async (req, res) => {
    try {
        const { session_id } = req.params;
        const { message } = req.body;
        const file = req.file;

        if (!message && !file) {
            return res.status(400).json({ error: 'Se requiere un mensaje o un archivo adjunto' });
        }

        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!n8nWebhookUrl) {
            return res.status(500).json({ error: 'N8N_WEBHOOK_URL not configured in .env' });
        }

        // Build public media URL if a file was uploaded
        let mediaUrl = null;
        if (file) {
            const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3006}`;
            mediaUrl = `${baseUrl}/uploads/${file.filename}`;
        }

        // Payload to n8n
        const n8nPayload = { session_id };
        if (message) n8nPayload.message = message;
        if (file) {
            n8nPayload.mediaUrl = mediaUrl;
            n8nPayload.mediaType = file.mimetype;
            n8nPayload.mediaName = file.originalname;
        }

        await axios.post(n8nWebhookUrl, n8nPayload);

        // History entry
        const historyEntry = {
            role: 'assistant',
            content: message || `[Archivo adjunto: ${file.originalname}]`,
            ...(file && { mediaUrl, mediaType: file.mimetype, mediaName: file.originalname })
        };

        const session = await getSession(session_id);
        const history = session ? session.history : [];
        const status = session ? session.status : 'paused';

        await saveSession(session_id, [...history, historyEntry], 0, false);

        if (status !== 'paused') {
            await pool.query(`UPDATE travelrock_conversations SET status = 'paused' WHERE session_id = $1`, [session_id]);
        }

        res.json({ success: true, message: 'Mensaje enviado vía n8n', mediaUrl });
    } catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'Archivo demasiado grande. Máximo 25 MB.' });
        }
        console.error('Error sending manual message via n8n:', error?.response?.data || error.message);
        res.status(500).json({ error: 'Error enviando mensaje vía n8n', details: error?.response?.data });
    }
};
