import { useState, useEffect, useRef } from 'react';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3006`;

export default function App() {
    const [conversations, setConversations] = useState([]);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        return () => { if (filePreview) URL.revokeObjectURL(filePreview); };
    }, [filePreview]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_URL}/conversations`);
            const data = await res.json();
            if (data.success) {
                setConversations(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch conversations", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionData = async (sessionId) => {
        try {
            const res = await fetch(`${API_URL}/conversations/${sessionId}`);
            const data = await res.json();
            if (data.success) {
                setSessionData(data.data);
            }
        } catch (err) {
            console.error("Failed to fetch session data", err);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
            // Don't refetch the whole session if the user is typing,
            // to avoid losing the messageInput focus or position.
            if (selectedSession) {
                // Background fetch that updates state smoothly
                fetch(`${API_URL}/conversations/${selectedSession}`)
                    .then(r => r.json())
                    .then(d => {
                        if (d.success) setSessionData(prev => ({ ...prev, ...d.data }));
                    })
                    .catch(console.error);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedSession]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessionData?.history]);

    const handleSelectConversation = async (sessionId) => {
        setSelectedSession(sessionId);
        setSessionData(null);
        await fetchSessionData(sessionId);

        const conv = conversations.find(c => c.session_id === sessionId);
        if (conv && conv.unread_count > 0) {
            await fetch(`${API_URL}/conversations/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ unread_count: 0 })
            });
            fetchConversations();
        }
    };

    const toggleBotStatus = async () => {
        if (!sessionData) return;
        const newStatus = sessionData.status === 'paused' ? 'active' : 'paused';

        setSessionData({ ...sessionData, status: newStatus });

        try {
            await fetch(`${API_URL}/conversations/${selectedSession}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            fetchConversations();
        } catch (err) {
            console.error("Failed to toggle status", err);
            setSessionData({ ...sessionData, status: sessionData.status });
        }
    };

    const clearIntervention = async () => {
        if (!sessionData) return;
        setSessionData({ ...sessionData, needs_intervention: false });
        try {
            await fetch(`${API_URL}/conversations/${selectedSession}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ needs_intervention: false })
            });
            fetchConversations();
        } catch (err) {
            console.error("Failed to clear intervention", err);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        setFilePreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
    };

    const clearSelectedFile = () => {
        setSelectedFile(null);
        setFilePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if ((!messageInput.trim() && !selectedFile) || !selectedSession) return;
        if (sessionData?.status !== 'paused') return;

        setSending(true);
        const text = messageInput;
        const file = selectedFile;

        const optimisticContent = text || `[Archivo adjunto: ${file?.name}]`;
        setSessionData({ ...sessionData, history: [...(sessionData?.history || []), { role: 'assistant', content: optimisticContent }], needs_intervention: false });
        setMessageInput('');
        setSelectedFile(null);
        setFilePreview(null);

        try {
            const formData = new FormData();
            if (text) formData.append('message', text);
            if (file) formData.append('file', file);

            const res = await fetch(`${API_URL}/conversations/${selectedSession}/send`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Error desconocido');
            }

            fetchConversations();
        } catch (err) {
            console.error("Failed to send message", err);
            alert(`Error enviando mensaje: ${err.message}`);
            fetchSessionData(selectedSession);
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="loading">Cargando Axis CRM...</div>;

    return (
        <div className="app-container">
            <header className="main-header">
                <div className="logo-area">
                    <h1>Travel Rock <span>Postventa</span></h1>
                    <p>Powered by Axis ST</p>
                </div>
            </header>
            
            <div className="crm-container">
                <div className="crm-sidebar">
                    <div className="crm-sidebar-header">
                        <h2>Chats Activos</h2>
                    </div>
                    <div className="crm-conversation-list">
                        {conversations.length === 0 ? (
                            <div className="crm-empty-state">No hay conversaciones activas</div>
                        ) : (
                            conversations.map(conv => (
                                <div
                                    key={conv.session_id}
                                    className={`crm-conversation-item ${selectedSession === conv.session_id ? 'active' : ''}`}
                                    onClick={() => handleSelectConversation(conv.session_id)}
                                >
                                    <div className="crm-conv-info">
                                        <div className="crm-conv-name">{conv.session_id}</div>
                                        <div className="crm-conv-meta">
                                            <span className={`crm-status-dot ${conv.status}`}></span>
                                            {conv.status === 'paused' ? 'Bot Pausado' : 'Bot Activo'}
                                        </div>
                                    </div>
                                    <div className="crm-conv-badges">
                                        {conv.needs_intervention && (
                                            <span className="badge warning" title="Requiere Atención">⚠️</span>
                                        )}
                                        {conv.unread_count > 0 && (
                                            <span className="badge unread">{conv.unread_count}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="crm-main">
                    {selectedSession ? (
                        sessionData ? (
                            <>
                                <div className="crm-chat-header">
                                    <div className="crm-chat-title">{selectedSession}</div>
                                    <div className="crm-chat-actions">
                                        {sessionData.needs_intervention && (
                                            <button className="btn-action btn-clear" onClick={clearIntervention} title="Ocultar advertencia">
                                                ✅ Atendido
                                            </button>
                                        )}
                                        <button
                                            className={`btn-action ${sessionData.status === 'paused' ? 'btn-resume' : 'btn-pause'}`}
                                            onClick={toggleBotStatus}
                                        >
                                            {sessionData.status === 'paused' ? '▶ Reanudar Bot' : '⏸ Pausar Bot'}
                                        </button>
                                    </div>
                                </div>

                                <div className="crm-chat-messages">
                                    {sessionData.history && sessionData.history.length > 0 ? (
                                        sessionData.history.map((msg, idx) => (
                                            <div key={idx} className={`crm-message ${msg.role === 'user' ? 'msg-user' : 'msg-bot'}`}>
                                                <div className="msg-bubble">
                                                    {msg.mediaUrl && msg.mediaType?.startsWith('image/') && (
                                                        <img src={msg.mediaUrl} alt={msg.mediaName || 'imagen'} className="msg-media-img" />
                                                    )}
                                                    {msg.mediaUrl && (msg.mediaType === 'application/pdf' || msg.mediaType?.includes('word')) && (
                                                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="msg-media-link">
                                                            📄 {msg.mediaName || 'Documento'}
                                                        </a>
                                                    )}
                                                    {msg.mediaUrl && msg.mediaType?.startsWith('video/') && (
                                                        <video src={msg.mediaUrl} controls className="msg-media-video" />
                                                    )}
                                                    {msg.mediaUrl && msg.mediaType?.startsWith('audio/') && (
                                                        <audio src={msg.mediaUrl} controls className="msg-media-audio" />
                                                    )}
                                                    {msg.content && !msg.content.startsWith('[Archivo adjunto:') && (
                                                        <span>{msg.content}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="crm-empty-state">No hay mensajes en esta sesión.</div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                <div className="crm-chat-input-area">
                                    {selectedFile && (
                                        <div className="crm-file-preview">
                                            {filePreview
                                                ? <img src={filePreview} alt="preview" className="crm-preview-img" />
                                                : <span className="crm-preview-name">📎 {selectedFile.name}</span>
                                            }
                                            <button className="crm-preview-clear" onClick={clearSelectedFile} title="Quitar archivo">✕</button>
                                        </div>
                                    )}
                                    <form onSubmit={sendMessage} className="crm-input-form">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,audio/ogg,audio/mpeg,audio/aac"
                                            style={{ display: 'none' }}
                                            disabled={sessionData.status !== 'paused'}
                                        />
                                        <button
                                            type="button"
                                            className="crm-btn-attach"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={sessionData.status !== 'paused'}
                                            title="Adjuntar archivo"
                                        >
                                            📎
                                        </button>
                                        <input
                                            type="text"
                                            placeholder={sessionData.status === 'paused' ? "Escribe un mensaje..." : "Para escribir un mensaje, pausa el bot primero..."}
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            className="crm-input"
                                            disabled={sessionData.status !== 'paused'}
                                        />
                                        <button
                                            type="submit"
                                            className="crm-btn-send"
                                            disabled={sessionData.status !== 'paused' || (!messageInput.trim() && !selectedFile) || sending}
                                        >
                                            {sending ? '...' : 'Enviar'}
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="loading">Cargando conversación...</div>
                        )
                    ) : (
                        <div className="crm-no-selection">
                            <div className="crm-no-selection-content">
                                <h3>Axis Chat CRM</h3>
                                <p>Selecciona una conversación para gestionar la postventa.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
