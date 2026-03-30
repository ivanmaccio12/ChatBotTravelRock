import { processIncomingMessage } from '../services/aiService.js';
import axios from 'axios';
import { unpauseSession } from '../services/conversationService.js';

export const chatController = async (req, res) => {
    try {
        const { message, session_id } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }
        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required (use the customer phone number)' });
        }

        // Llamamos al core de IA
        const result = await processIncomingMessage(session_id, message);

        // Si es null, es que estaba pausado
        if (!result.reply) {
             return res.json({ reply: null, saleClosed: false, saleDetails: null, needsIntervention: result.needsIntervention });
        }

        // Si necesitamos derivar al Webhook de salida (ej. n8n u otro)
        // NOTA: copy_show_n8n se encarga de recibir { reply } y hacer la llamada HTTP a Evolution API.
        res.json({ reply: result.reply, saleClosed: false, saleDetails: null, needsIntervention: result.needsIntervention });

    } catch (error) {
        console.error('Error en chatController:', error);
        res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
};

export const unpauseController = async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) {
            return res.status(400).json({ error: 'session_id is required' });
        }
        
        const success = await unpauseSession(session_id);
        if (success) {
            res.json({ success: true, message: 'Conversación reanudada' });
        } else {
            res.status(500).json({ error: 'Failed to update session status' });
        }
    } catch (error) {
        console.error('Error in unpauseController:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
