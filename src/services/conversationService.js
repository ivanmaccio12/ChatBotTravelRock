import { pool } from './dbService.js';

export const getSession = async (sessionId) => {
    try {
        const result = await pool.query(`SELECT * FROM travelrock_conversations WHERE session_id = $1`, [sessionId]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
        return null;
    } catch (error) {
        console.error('Error fetching session:', error);
        return null;
    }
};

export const saveSession = async (sessionId, history, unreadCount = 0, needsIntervention = false) => {
    try {
        const query = `
            INSERT INTO travelrock_conversations (session_id, history, unread_count, needs_intervention, last_updated)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            ON CONFLICT (session_id) 
            DO UPDATE SET 
                history = EXCLUDED.history,
                unread_count = travelrock_conversations.unread_count + EXCLUDED.unread_count,
                needs_intervention = EXCLUDED.needs_intervention,
                last_updated = CURRENT_TIMESTAMP;
        `;
        await pool.query(query, [sessionId, JSON.stringify(history), unreadCount, needsIntervention]);
    } catch (error) {
        console.error('Error saving session:', error);
    }
};

export const unpauseSession = async (sessionId) => {
    try {
        await pool.query(
            `UPDATE travelrock_conversations SET status = 'active', needs_intervention = false, unread_count = 0 WHERE session_id = $1`,
            [sessionId]
        );
        return true;
    } catch (error) {
        console.error('Error unpausing session:', error);
        return false;
    }
};
