import Anthropic from '@anthropic-ai/sdk';
import { getSystemPrompt } from '../config/systemPrompt.js';
import { getSession, saveSession } from './conversationService.js';
import { ANTHROPIC_API_KEY } from '../config/index.js';

const anthropic = new Anthropic({
    apiKey: ANTHROPIC_API_KEY,
});

export const processIncomingMessage = async (from, incomingText) => {
    try {
        console.log(`🧠 Procesando intención de: ${incomingText} para el número ${from}`);

        // Load conversation session from PostgreSQL
        const session = await getSession(from);
        const history = session ? session.history : [];
        const status = session ? session.status : 'active';
        let unreadCount = session ? session.unread_count : 0;
        let needsIntervention = session ? session.needs_intervention : false;

        const messages = [...history, { role: 'user', content: incomingText }];

        // Si el estado es 'paused', no responde la IA
        if (status === 'paused') {
            unreadCount += 1;
            await saveSession(from, messages, unreadCount, needsIntervention);
            return { reply: null, needsIntervention };
        }

        const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 1024,
            system: getSystemPrompt(),
            messages: messages,
        });

        const replyText = response.content[0].text;
        let reply = replyText;

        // Extraer JSON bloque si necesita intervención humana
        const jsonMatch = replyText.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) {
            try {
                const parsedData = JSON.parse(jsonMatch[1]);
                if (parsedData.NEEDS_INTERVENTION) {
                    needsIntervention = true;
                }
                // Remover el bloque JSON
                reply = replyText.replace(/```json\n?[\s\S]*?\n?```/, '').trim();
            } catch (e) {
                console.error('Error parsing JSON from Claude:', e);
            }
        }

        const updatedHistory = [
            ...messages,
            { role: 'assistant', content: reply }
        ];

        // Guardamos la sesión
        // NOTA: Si necesita intervención, quizá queramos pausar el bot automáticamente
        // Para este caso, lo dejamos activo pero con la flag en true, 
        // o lo pausamos si el mensaje final dice "Te derivé con un asesor humano".
        let newStatus = status;
        if (needsIntervention) {
            newStatus = 'paused';
        }

        await saveSession(from, updatedHistory, unreadCount, needsIntervention);

        if (newStatus !== status) {
            // Se actualizó el estado a 'paused' (HANDOFF_HUMAN)
            import('./dbService.js').then(({ pool }) => {
                pool.query(`UPDATE travelrock_conversations SET status = 'paused' WHERE session_id = $1`, [from]);
            });
        }

        console.log(`📤 Respuesta generada para ${from}: ${reply}`);
        return { reply, needsIntervention, status: newStatus };

    } catch (error) {
        console.error('Error procesando el mensaje con IA:', error);
        throw error;
    }
};
