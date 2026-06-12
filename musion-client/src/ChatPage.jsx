import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IoEllipsisVertical } from 'react-icons/io5';
import { FiSend } from 'react-icons/fi';
import api from './api';
import { DEFAULT_AVATAR, formatTime, getDisplayName } from './utils';
import './ChatPage.css';

function ChatPage() {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatMenuOpen, setChatMenuOpen] = useState(false);
  const listRef = useRef(null);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (user) => {
    if (!user?.id) return;
    try {
      const response = await api.get(`/chat/messages/${user.id}`);
      setMessages(response.data || []);
      setTimeout(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight), 80);
    } catch {
      setMessages([]);
    }
  };

  useEffect(() => {
    loadConversations();
    if (location.state?.user?.id) {
      setSelectedUser(location.state.user);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) loadMessages(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    const query = search.trim();
    if (!query) {
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/chat/users', { params: { q: query } });
        setUsers(response.data || []);
      } catch {
        setUsers([]);
      }
    }, 260);

    return () => clearTimeout(timer);
  }, [search]);

  const sendMessage = async () => {
    const text = messageText.trim();
    if (!text || !selectedUser?.id || sending) return;

    const localMessage = {
      id: `local-${Date.now()}`,
      text,
      isMine: true,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, localMessage]);
    setMessageText('');
    setSending(true);

    try {
      const response = await api.post(`/chat/messages/${selectedUser.id}`, { text });
      setMessages((prev) =>
        prev.map((message) => (message.id === localMessage.id ? response.data : message)),
      );
      loadConversations();
    } catch {
      setMessages((prev) => prev.filter((message) => message.id !== localMessage.id));
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async () => {
    if (!selectedUser?.id) return;
    if (!window.confirm(`Excluir conversa com @${selectedUser.username}?`)) return;

    try {
      await api.delete(`/chat/conversations/${selectedUser.id}`);
      setMessages([]);
      setConversations((prev) =>
        prev.filter((item) => item.user?.id !== selectedUser.id),
      );
      setSelectedUser(null);
      setChatMenuOpen(false);
    } catch {
      window.alert('Não foi possível excluir a conversa.');
    }
  };

  const list = search.trim() ? users.map((user) => ({ user })) : conversations;

  return (
    <div className="chat-page">
      <aside className="chat-sidebar">
        <h2>Chat</h2>
        <input
          className="chat-search"
          placeholder="Buscar usuário..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="chat-user-list">
          {loading && !search && <p className="chat-empty">Carregando...</p>}
          {!loading && list.length === 0 && (
            <p className="chat-empty">
              {search ? 'Nenhum usuário encontrado.' : 'Busque alguém para conversar.'}
            </p>
          )}

          {list.map((item, index) => {
            const user = item.user || item;
            const lastMessage = item.lastMessage;
            return (
              <button
                key={user.id || index}
                className={`chat-user-row ${selectedUser?.id === user.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedUser(user);
                  setSearch('');
                  setUsers([]);
                }}
              >
                <img src={user.avatarUrl || DEFAULT_AVATAR} alt="" />
                <span>
                  <strong>{getDisplayName(user)}</strong>
                  <small>@{user.username}</small>
                  {lastMessage && <em>{lastMessage.isMine ? 'Você: ' : ''}{lastMessage.text}</em>}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="chat-panel">
        {!selectedUser ? (
          <div className="chat-placeholder">Selecione uma conversa.</div>
        ) : (
          <>
            <header className="chat-panel-header">
              <img src={selectedUser.avatarUrl || DEFAULT_AVATAR} alt="" />
              <div>
                <strong>{getDisplayName(selectedUser)}</strong>
                <span>@{selectedUser.username}</span>
              </div>
              <div className="chat-header-menu">
                <button onClick={() => setChatMenuOpen((value) => !value)} title="Opções">
                  <IoEllipsisVertical />
                </button>
                {chatMenuOpen && (
                  <div className="chat-dropdown-menu">
                    <button onClick={deleteConversation}>Excluir conversa</button>
                  </div>
                )}
              </div>
            </header>

            <div className="chat-messages" ref={listRef}>
              {messages.length === 0 && (
                <p className="chat-empty">Envie a primeira mensagem.</p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${message.isMine ? 'mine' : 'theirs'}`}
                >
                  <p>{message.text}</p>
                  <small>{formatTime(message.createdAt)}</small>
                </div>
              ))}
            </div>

            <footer className="chat-compose">
              <textarea
                placeholder="Digite aqui"
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button onClick={sendMessage} disabled={!messageText.trim() || sending} title="Enviar">
                <FiSend />
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

export default ChatPage;
