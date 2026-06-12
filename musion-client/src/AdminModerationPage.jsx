import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
  IoOpenOutline,
  IoRefreshOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5';
import api from './api';
import { DEFAULT_AVATAR, getDisplayName } from './utils';
import './AdminModerationPage.css';

const reportStatuses = ['PENDING', 'REVIEWED', 'ACTIONED', 'DISMISSED', 'ALL'];
const deletionStatuses = ['PENDING', 'COMPLETED', 'DISMISSED', 'ALL'];

const statusLabel = {
  PENDING: 'Pendentes',
  REVIEWED: 'Revisadas',
  ACTIONED: 'Ação tomada',
  DISMISSED: 'Dispensadas',
  COMPLETED: 'Concluídas',
  ALL: 'Todas',
};

const targetTypeLabel = {
  USER: 'Usuário',
  REVIEW: 'Review',
  COMMENT: 'Comentário',
};

const roleLabel = {
  ADMIN: 'Administrador',
  USER: 'Usuário',
};

function formatDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function reportTargetLink(report) {
  if (report.targetType === 'USER') return `/profile/${report.targetId}`;
  if (report.targetType === 'REVIEW') return `/post/${report.targetId}`;
  return null;
}

function AdminModerationPage() {
  const [reports, setReports] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [reportStatus, setReportStatus] = useState('PENDING');
  const [deletionStatus, setDeletionStatus] = useState('PENDING');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userQuery, setUserQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredUsersLabel = useMemo(() => {
    if (userRoleFilter === 'ADMIN') return 'Administradores';
    if (userRoleFilter === 'USER') return 'Usuários comuns';
    return 'Todos os usuários';
  }, [userRoleFilter]);

  const loadModeration = async () => {
    setLoading(true);
    setError('');

    try {
      const [reportsRes, deletionRes] = await Promise.all([
        api.get('/moderation/admin/reports', { params: { status: reportStatus } }),
        api.get('/legal/admin/delete-account-requests', { params: { status: deletionStatus } }),
      ]);

      setReports(Array.isArray(reportsRes.data) ? reportsRes.data : []);
      setDeletionRequests(Array.isArray(deletionRes.data) ? deletionRes.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Seu usuário não tem permissão de administrador.');
      } else {
        setError(err.response?.data?.message || 'Não foi possível carregar a moderação.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);

    try {
      const response = await api.get('/users/admin/users', {
        params: {
          q: userQuery.trim(),
          role: userRoleFilter,
        },
      });

      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Seu usuário não tem permissão de administrador.');
      }
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    loadModeration();
  }, [reportStatus, deletionStatus]);

  useEffect(() => {
    const timer = setTimeout(loadUsers, 350);
    return () => clearTimeout(timer);
  }, [userQuery, userRoleFilter]);

  const updateReportStatus = async (id, status) => {
    await api.patch(`/moderation/admin/reports/${id}/status`, { status });
    await loadModeration();
  };

  const updateDeletionStatus = async (id, status) => {
    await api.patch(`/legal/admin/delete-account-requests/${id}/status`, { status });
    await loadModeration();
  };

  const updateUserRole = async (id, role) => {
    const response = await api.patch(`/users/admin/users/${id}/role`, { role });
    setUsers((current) => current.map((user) => (user.id === id ? response.data : user)));

    const cached = localStorage.getItem('user');
    if (cached) {
      try {
        const currentUser = JSON.parse(cached);
        if (currentUser.id === id) {
          localStorage.setItem('user', JSON.stringify({ ...currentUser, role: response.data.role }));
        }
      } catch {}
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-hero">
        <span className="admin-hero-icon">
          <IoShieldCheckmarkOutline />
        </span>
        <div className="admin-hero-copy">
          <p>Painel administrativo</p>
          <h1>Moderação do Musion</h1>
          <span>Analise denúncias, acompanhe solicitações legais e gerencie acessos administrativos.</span>
        </div>
        <button type="button" onClick={loadModeration} title="Atualizar">
          <IoRefreshOutline />
        </button>
      </header>

      {error && <div className="admin-alert">{error}</div>}

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p>Fila de segurança</p>
            <h2>Denúncias</h2>
          </div>
          <div className="admin-tabs">
            {reportStatuses.map((status) => (
              <button
                key={status}
                className={reportStatus === status ? 'active' : ''}
                onClick={() => setReportStatus(status)}
                type="button"
              >
                {statusLabel[status]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-empty">Carregando moderação...</div>
        ) : reports.length === 0 ? (
          <div className="admin-empty">Nenhuma denúncia nesta fila.</div>
        ) : (
          <div className="admin-grid">
            {reports.map((report) => {
              const targetUrl = reportTargetLink(report);
              return (
                <article className="admin-card" key={report.id}>
                  <div className="admin-card-top">
                    <span className={`admin-status status-${report.status.toLowerCase()}`}>
                      {statusLabel[report.status] || report.status}
                    </span>
                    <small>{formatDate(report.createdAt)}</small>
                  </div>

                  <h3>{targetTypeLabel[report.targetType] || report.targetType} #{report.targetId}</h3>
                  <p className="admin-reason">{report.reason}</p>
                  {report.details && <p className="admin-details">{report.details}</p>}

                  <div className="admin-meta">
                    <span>Denunciante</span>
                    <strong>
                      {report.reporter?.displayName || report.reporter?.username || `Usuário ${report.reporterId}`}
                    </strong>
                  </div>

                  {report.targetUser && (
                    <div className="admin-user-chip">
                      <img src={report.targetUser.avatarUrl || DEFAULT_AVATAR} alt="" />
                      <span>
                        <strong>{getDisplayName(report.targetUser)}</strong>
                        <small>@{report.targetUser.username}</small>
                      </span>
                    </div>
                  )}

                  <div className="admin-actions">
                    {targetUrl && (
                      <Link to={targetUrl}>
                        <IoOpenOutline />
                        Abrir
                      </Link>
                    )}
                    <button type="button" onClick={() => updateReportStatus(report.id, 'ACTIONED')}>
                      <IoCheckmarkCircleOutline />
                      Ação tomada
                    </button>
                    <button type="button" onClick={() => updateReportStatus(report.id, 'DISMISSED')}>
                      <IoCloseCircleOutline />
                      Dispensar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p>Privacidade</p>
            <h2>Solicitações de exclusão</h2>
          </div>
          <div className="admin-tabs">
            {deletionStatuses.map((status) => (
              <button
                key={status}
                className={deletionStatus === status ? 'active' : ''}
                onClick={() => setDeletionStatus(status)}
                type="button"
              >
                {statusLabel[status]}
              </button>
            ))}
          </div>
        </div>

        {deletionRequests.length === 0 ? (
          <div className="admin-empty">Nenhuma solicitação nesta fila.</div>
        ) : (
          <div className="admin-table">
            {deletionRequests.map((request) => (
              <div className="admin-table-row" key={request.id}>
                <span>
                  <strong>{request.email}</strong>
                  <small>{request.username ? `@${request.username}` : 'Sem nome de usuário informado.'}</small>
                </span>
                <span>{request.reason || 'Sem motivo informado.'}</span>
                <span>{formatDate(request.createdAt)}</span>
                <div>
                  <button type="button" onClick={() => updateDeletionStatus(request.id, 'COMPLETED')}>
                    Concluir
                  </button>
                  <button type="button" onClick={() => updateDeletionStatus(request.id, 'DISMISSED')}>
                    Dispensar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-section">
        <div className="admin-section-heading">
          <div>
            <p>Acessos administrativos</p>
            <h2>{filteredUsersLabel}</h2>
          </div>
          <div className="admin-user-tools">
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Buscar usuário, e-mail ou nome..."
            />
            <select value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)}>
              <option value="ALL">Todos</option>
              <option value="ADMIN">Administradores</option>
              <option value="USER">Usuários</option>
            </select>
          </div>
        </div>

        {usersLoading ? (
          <div className="admin-empty">Buscando usuários...</div>
        ) : (
          <div className="admin-users-list">
            {users.map((user) => (
              <div className="admin-user-row" key={user.id}>
                <img src={user.avatarUrl || DEFAULT_AVATAR} alt="" />
                <span>
                  <strong>{user.displayName || user.username}</strong>
                  <small>@{user.username} - {user.email}</small>
                </span>
                <b className={user.role === 'ADMIN' ? 'admin-role-badge admin' : 'admin-role-badge'}>
                  {roleLabel[user.role] || user.role}
                </b>
                <button
                  type="button"
                  onClick={() => updateUserRole(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')}
                >
                  {user.role === 'ADMIN' ? 'Remover administrador' : 'Tornar administrador'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminModerationPage;
