import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { DEFAULT_AVATAR, formatTime, getDisplayName } from './utils';
import './NotificationsPage.css';

const getText = (notification) => {
  const name = getDisplayName(notification.sender);
  if (notification.type === 'LIKE') return `${name} curtiu sua review.`;
  if (notification.type === 'COMMENT') return `${name} comentou na sua review.`;
  if (notification.type === 'FOLLOW') return `${name} começou a seguir você.`;
  return `${name} interagiu com você.`;
};

function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get('/notifications');
        setNotifications(response.data || []);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const markAsRead = async (id) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    );
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {}
  };

  return (
    <div className="notifications-page">
      <h2>Notificações</h2>

      {loading && <p className="notifications-empty">Carregando...</p>}
      {!loading && notifications.length === 0 && (
        <p className="notifications-empty">Nenhuma notificação por enquanto.</p>
      )}

      <div className="notifications-list">
        {notifications.map((notification) => (
          <Link
            to={notification.review ? `/post/${notification.review.reviewId}` : `/profile/${notification.senderId}`}
            key={notification.id}
            className={`notification-card ${notification.read ? '' : 'unread'}`}
            onClick={() => markAsRead(notification.id)}
          >
            <img src={notification.sender?.avatarUrl || DEFAULT_AVATAR} alt="" />
            <div>
              <strong>{getText(notification)}</strong>
              {notification.albumName && <span>{notification.albumName}</span>}
              <small>{formatTime(notification.createdAt)}</small>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;
