import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import {
  Users, MessageCircle, Shield, Search, ChevronLeft, ChevronRight,
  Trash2, KeyRound, Crown, Eye, X, ArrowLeft, Activity,
  UserCheck, UserPlus, MessagesSquare, BarChart3, Clock, Globe,
  Monitor, AlertTriangle, RefreshCw, ChevronDown, ArrowUpDown,
} from 'lucide-react';

// ── Animated Counter Component ──
function AnimatedCounter({ value, label, icon: Icon, color, delay = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplayValue(0); return; }
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setTimeout(() => {
      const interval = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(interval);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div className="glass rounded-2xl p-5 hover:brightness-110 transition-all duration-300 group animate-counter-up" style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
        <span className="text-2xl font-extrabold text-white group-hover:scale-110 transition-transform origin-right">
          {displayValue.toLocaleString()}
        </span>
      </div>
      <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ── User Detail Modal ──
function UserDetailModal({ userId, onClose, onUserUpdated }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/admin/users/${userId}`);
        setUser(data.user);
      } catch (err) {
        toast.error('Failed to load user details');
        onClose();
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setActionLoading(true);
    try {
      const { data } = await api.put(`/admin/users/${userId}/reset-password`, { newPassword });
      toast.success(data.message);
      setShowResetPassword(false);
      setNewPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.delete(`/admin/users/${userId}`);
      toast.success(data.message);
      onUserUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleRole = async () => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    setActionLoading(true);
    try {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(data.message);
      setUser(prev => ({ ...prev, role: newRole }));
      onUserUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      <div 
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto glass-strong rounded-3xl p-6 sm:p-8 shadow-glass animate-scale-in border border-[var(--color-border-light)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[var(--color-surface-700)] transition-colors text-[var(--color-text-muted)] hover:text-white">
          <X size={20} />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>
        ) : user ? (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-700)] flex items-center justify-center overflow-hidden flex-shrink-0">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <Users size={28} className="text-[var(--color-text-muted)]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-white truncate">{user.username}</h2>
                  {user.role === 'owner' && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">OWNER</span>
                  )}
                  {user.role === 'admin' && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">ADMIN</span>
                  )}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${user.isOnline ? 'bg-green-400 shadow-lg shadow-green-400/50' : 'bg-gray-500'}`}></span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">{user.email}</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--color-surface-800)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{user.messageCount?.toLocaleString()}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Messages</p>
              </div>
              <div className="bg-[var(--color-surface-800)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{user.chatCount?.toLocaleString()}</p>
                <p className="text-xs text-[var(--color-text-muted)]">Chats</p>
              </div>
              <div className="bg-[var(--color-surface-800)] rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white">{user.totpEnabled ? '✓' : '✗'}</p>
                <p className="text-xs text-[var(--color-text-muted)]">2FA</p>
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]/30">
                <span className="text-[var(--color-text-muted)]">Phone</span>
                <span className="text-white font-medium">{user.phoneNumber || 'Not set'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]/30">
                <span className="text-[var(--color-text-muted)]">Joined</span>
                <span className="text-white font-medium">{formatDate(user.createdAt)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--color-border)]/30">
                <span className="text-[var(--color-text-muted)]">Last Seen</span>
                <span className="text-white font-medium">{user.isOnline ? 'Online now' : formatDate(user.lastSeen)}</span>
              </div>
            </div>

            {/* Login History */}
            {user.loginHistory && user.loginHistory.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] mb-3 flex items-center gap-2">
                  <Clock size={14} /> Recent Logins
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {user.loginHistory.slice(0, 5).map((login, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[var(--color-surface-800)] rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Monitor size={12} className="text-[var(--color-text-muted)]" />
                        <span className="text-[var(--color-text-secondary)]">{login.browser} · {login.device}</span>
                      </div>
                      <span className="text-[var(--color-text-muted)]">{formatDate(login.loginAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Actions ── */}
            <div className="border-t border-[var(--color-border)]/30 pt-5 space-y-3">
              {/* Reset Password */}
              {!showResetPassword ? (
                <Button variant="secondary" fullWidth onClick={() => setShowResetPassword(true)} disabled={actionLoading}>
                  <KeyRound size={16} className="mr-2" /> Reset Password
                </Button>
              ) : (
                <div className="space-y-3 animate-slide-down bg-[var(--color-surface-800)] rounded-xl p-4">
                  <Input
                    type="password"
                    label="New Password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    icon={KeyRound}
                    minLength={6}
                  />
                  <div className="flex gap-2">
                    <Button variant="primary" fullWidth onClick={handleResetPassword} isLoading={actionLoading} size="sm">
                      Confirm Reset
                    </Button>
                    <Button variant="ghost" onClick={() => { setShowResetPassword(false); setNewPassword(''); }} size="sm" disabled={actionLoading}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Toggle Role */}
              {user.role !== 'owner' && (
                <Button 
                  variant="secondary" 
                  fullWidth 
                  onClick={handleToggleRole} 
                  disabled={actionLoading}
                  isLoading={actionLoading}
                >
                  <Crown size={16} className="mr-2" /> 
                  {user.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                </Button>
              )}

              {/* Delete */}
              {user.role !== 'owner' && (
                !showDeleteConfirm ? (
                  <Button variant="danger" fullWidth onClick={() => setShowDeleteConfirm(true)} disabled={actionLoading}>
                    <Trash2 size={16} className="mr-2" /> Delete User
                  </Button>
                ) : (
                  <div className="space-y-3 animate-slide-down bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-[var(--color-danger)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--color-danger)]">This action is permanent!</p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-1">
                          All messages, chats, and data for <strong className="text-white">{user.username}</strong> will be permanently deleted.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="danger" fullWidth onClick={handleDeleteUser} isLoading={actionLoading} size="sm">
                        Yes, Delete Forever
                      </Button>
                      <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} size="sm" disabled={actionLoading}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main Admin Dashboard ──
export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/stats');
      setStats(data.stats);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
      }
    }
  }, [navigate]);

  const fetchUsers = useCallback(async (page = 1) => {
    setUsersLoading(true);
    try {
      const { data } = await api.get('/admin/users', {
        params: { page, limit: pagination.limit, search, sort, order },
      });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, [search, sort, order, pagination.limit]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchStats();
      await fetchUsers();
      setLoading(false);
    };
    init();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search, sort, order]);

  const handleSort = (field) => {
    if (sort === field) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(field);
      setOrder('desc');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : 'N/A';

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[var(--color-surface-900)]">
        <div className="text-center animate-scale-in">
          <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-[var(--color-primary)]/20 mb-4">
            <Shield size={32} className="text-white" />
          </div>
          <p className="text-[var(--color-text-muted)] text-sm font-medium mt-4">Loading Admin Panel...</p>
          <div className="mt-4 w-32 h-1 bg-[var(--color-surface-700)] rounded-full overflow-hidden mx-auto">
            <div className="h-full w-1/3 gradient-primary rounded-full animate-shimmer"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-[var(--color-surface-900)] flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="flex-shrink-0 glass border-b border-[var(--color-border)]/50 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 rounded-xl hover:bg-[var(--color-surface-700)] transition-colors text-[var(--color-text-muted)] hover:text-white">
              <ArrowLeft size={20} />
            </button>
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-md">
              <Shield size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Dashboard</h1>
              <p className="text-xs text-[var(--color-text-muted)] hidden sm:block">Manage users & monitor activity</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchStats(); fetchUsers(pagination.page); }} className="p-2 rounded-xl hover:bg-[var(--color-surface-700)] transition-colors text-[var(--color-text-muted)] hover:text-white" title="Refresh">
              <RefreshCw size={18} />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-surface-800)] border border-[var(--color-border)]">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown size={12} className="text-amber-400" />
              </div>
              <span className="text-sm font-medium text-white hidden sm:inline">{currentUser?.username}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* ── Stats Grid ── */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <AnimatedCounter value={stats.totalUsers} label="Total Users" icon={Users} color="gradient-primary" delay={0} />
              <AnimatedCounter value={stats.onlineUsers} label="Online Now" icon={Activity} color="bg-green-500" delay={100} />
              <AnimatedCounter value={stats.newUsersToday} label="New Today" icon={UserPlus} color="bg-blue-500" delay={200} />
              <AnimatedCounter value={stats.newUsersWeek} label="This Week" icon={UserCheck} color="bg-purple-500" delay={300} />
              <AnimatedCounter value={stats.totalMessages} label="Total Messages" icon={MessageCircle} color="bg-orange-500" delay={400} />
              <AnimatedCounter value={stats.messagesToday} label="Messages Today" icon={MessagesSquare} color="bg-pink-500" delay={500} />
              <AnimatedCounter value={stats.totalChats} label="Total Chats" icon={BarChart3} color="bg-cyan-500" delay={600} />
            </div>
          )}

          {/* ── User Management ── */}
          <div className="glass rounded-2xl border border-[var(--color-border)]/30 overflow-hidden">
            {/* Table Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--color-border)]/30">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users size={20} /> User Management
                  </h2>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {pagination.total} user{pagination.total !== 1 ? 's' : ''} found
                  </p>
                </div>
                <div className="w-full sm:w-72">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search by username or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] text-white rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sort Tabs */}
            <div className="px-4 sm:px-5 py-2 bg-[var(--color-surface-800)]/50 border-b border-[var(--color-border)]/20 flex items-center gap-1 overflow-x-auto text-xs font-medium">
              {[
                { key: 'createdAt', label: 'Joined' },
                { key: 'username', label: 'Name' },
                { key: 'lastSeen', label: 'Last Seen' },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => handleSort(s.key)}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap ${
                    sort === s.key ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-surface-700)]'
                  }`}
                >
                  {s.label}
                  {sort === s.key && <ArrowUpDown size={12} />}
                </button>
              ))}
            </div>

            {/* Users List */}
            <div className="divide-y divide-[var(--color-border)]/20">
              {usersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Spinner size="md" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-16">
                  <Users size={40} className="mx-auto text-[var(--color-text-muted)] mb-3" />
                  <p className="text-[var(--color-text-muted)] text-sm">No users found</p>
                </div>
              ) : (
                users.map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() => setSelectedUserId(u._id)}
                    className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 hover:bg-[var(--color-surface-700)]/50 transition-all duration-200 text-left group animate-fade-in"
                    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-700)] flex items-center justify-center overflow-hidden group-hover:ring-2 group-hover:ring-[var(--color-primary)]/30 transition-all">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.username} className="w-full h-full object-cover" />
                        ) : (
                          <Users size={18} className="text-[var(--color-text-muted)]" />
                        )}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--color-surface-900)] ${u.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{u.username}</p>
                        {u.role === 'owner' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-500/20 text-red-400 flex-shrink-0">OWNER</span>
                        )}
                        {u.role === 'admin' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-400 flex-shrink-0">ADMIN</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{u.email}</p>
                    </div>

                    {/* Meta */}
                    <div className="hidden sm:flex flex-col items-end text-xs text-[var(--color-text-muted)] flex-shrink-0">
                      <span>{u.isOnline ? 'Online' : formatDate(u.lastSeen)}</span>
                      <span className="mt-0.5">Joined {formatDate(u.createdAt)}</span>
                    </div>

                    {/* View icon */}
                    <Eye size={16} className="text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-t border-[var(--color-border)]/30 bg-[var(--color-surface-800)]/30">
                <p className="text-xs text-[var(--color-text-muted)]">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchUsers(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-700)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text-muted)] hover:text-white"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => fetchUsers(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                            pageNum === pagination.page
                              ? 'gradient-primary text-white'
                              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-700)] hover:text-white'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => fetchUsers(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-700)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-[var(--color-text-muted)] hover:text-white"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
          onUserUpdated={() => { fetchStats(); fetchUsers(pagination.page); }}
        />
      )}
    </div>
  );
}
