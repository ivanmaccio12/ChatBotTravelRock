import { Router } from 'express';
import { handleWhatsAppWebhook, verifyWhatsAppWebhook } from '../controllers/webhookController.js';

const router = Router();

// Endpoint para recibir mensajes (POST) - Desde Meta o N8N Pasarela
router.post('/whatsapp', handleWhatsAppWebhook);

// Endpoint para verificación del Webhook de Meta (GET)
router.get('/whatsapp', verifyWhatsAppWebhook);

export default router;
