import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

export const initDB = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS travelrock_conversations (
                session_id VARCHAR(255) PRIMARY KEY,
                remote_jid VARCHAR(255),
                push_name VARCHAR(255),
                history JSONB[] DEFAULT '{}',
                status VARCHAR(50) DEFAULT 'active',
                needs_intervention BOOLEAN DEFAULT false,
                unread_count INTEGER DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database initialized successfully (travelrock_conversations table exists)');
    } catch (err) {
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        client.release();
    }
};
