import pkg from 'pg';
import { DATABASE_URL } from '../config/index.js';

const { Pool } = pkg;

// Configurar pool solo si existe la URL
const pool = DATABASE_URL ? new Pool({
    connectionString: DATABASE_URL,
    // ssl: { rejectUnauthorized: false } // A veces es requerido en producción
}) : null;

export const getUserState = async (phone) => {
    if (!pool) return { state: 'MAIN_MENU', is_paused: false }; // Mock 
    try {
        const res = await pool.query('SELECT * FROM user_states WHERE phone_number = $1', [phone]);
        if (res.rows.length > 0) {
            return res.rows[0];
        } else {
            // Usuario nuevo
            return { state: 'MAIN_MENU', is_paused: false };
        }
    } catch (err) {
        console.error('Error fetching state:', err);
        return { state: 'MAIN_MENU', is_paused: false };
    }
};

export const updateUserState = async (phone, updates) => {
    if (!pool) return true; // Mock
    try {
         // Lógica simplificada de Update/Insert (Upsert)
         // En la implementación real se haría un query parametrizado complejo aquí
         console.log(`💾 Guardando estado para ${phone}:`, updates);
         return true;
    } catch (err) {
        console.error('Error updating state:', err);
        return false;
    }
};
