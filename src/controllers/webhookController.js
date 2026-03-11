import { processIncomingMessage } from '../services/aiService.js';

export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const body = req.body;

        // Validar si el payload tiene la estructura de WhatsApp Business Cloud API
        if (body.object === 'whatsapp_business_account') {
            
            // Iterar sobre las entradas y cambios (puede llegar en arrays)
            for (const entry of body.entry) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages && change.value.messages[0]) {
                        
                        const message = change.value.messages[0];
                        const from = message.from; // Número del usuario
                        
                        let textBody = '';
                        
                        // Si es texto
                        if (message.type === 'text') {
                            textBody = message.text.body;
                        } else if (message.type === 'interactive') {
                            // En caso de que se utilicen botones o listas en el futuro
                            textBody = message.interactive.button_reply ? message.interactive.button_reply.id : textBody;
                        }

                        if (textBody) {
                             console.log(`📩 Mensaje recibido de ${from}: ${textBody}`);
                             
                             // Derivar el texto a la capa de servicios de IA/Ruteo
                             // NO usar "await" acá si se requiere responder rápido a Meta.
                             processIncomingMessage(from, textBody).catch(console.error);
                        }
                    }
                }
            }

            // Responder 200 OK inmediatamente a Meta para confirmar recepción
            return res.sendStatus(200);
        } else {
            return res.sendStatus(404);
        }
    } catch (error) {
        console.error('Error procesando webhook de WhatsApp:', error);
        return res.sendStatus(500);
    }
};

export const verifyWhatsAppWebhook = (req, res) => {
    // Proceso de validación requerido por Meta for Developers al configurar el Webhook
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'travelrock123';

    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('✅ Webhook de WhatsApp Validado');
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    } else {
        return res.sendStatus(400);
    }
};
