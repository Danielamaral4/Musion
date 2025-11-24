import React, { useState } from 'react';
import api from './api'; // seu axios config

export default function ChatWidget({ sessionId }) {
  const [messages, setMessages] = useState([]); // {role, content}
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post('/api/chat', { message: userMsg.content, sessionId });
      setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: 'Erro ao conectar ao bot.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-history">
        {messages.map((m, i) => (
          <div key={i} className={m.role}>{m.content}</div>
        ))}
      </div>

      <div className="chat-input">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key === 'Enter') send(); }}
          placeholder="Digite sua mensagem..."
        />
        <button
          onClick={send}
          disabled={loading}
          className="chat-send-btn"
        >
          {/* Ícone de aviãozinho inline */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            className="send-icon"
          >
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
