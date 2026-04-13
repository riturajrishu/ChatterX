import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Camera, ShieldCheck, MonitorSmartphone, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, setUser, logout, logoutAll } = useAuth();
  const navigate = useNavigate();
  
  const [username, setUsername] = useState(user?.username || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [totpToken, setTotpToken] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) setUsername(user.username);
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (username === user.username) return;
    
    setIsUpdating(true);
    try {
      const { data } = await api.put('/users/profile', { username });
      setUser(data.user);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setIsUploading(true);
    try {
      const { data } = await api.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUser(data.user);
      toast.success('Avatar updated');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const start2FASetup = async () => {
    try {
      const { data } = await api.post('/users/2fa/setup');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setIs2FASetupOpen(true);
    } catch (error) {
      toast.error('Failed to initiate 2FA setup');
    }
  };

  const verify2FASetup = async () => {
    try {
      await api.post('/users/2fa/verify', { token: totpToken });
      setUser({ ...user, totpEnabled: true });
      setIs2FASetupOpen(false);
      setTotpToken('');
      toast.success('2FA successfully enabled!');
    } catch (error) {
      toast.error('Invalid code. Please try again.');
    }
  };

  const disable2FA = async () => {
    const token = window.prompt("Enter your current 2FA code to disable:");
    if (!token) return;

    try {
      await api.post('/users/2fa/disable', { token });
      setUser({ ...user, totpEnabled: false });
      toast.success('2FA has been disabled');
    } catch (error) {
      toast.error('Invalid code.');
    }
  };

  const handleLogoutAll = async () => {
     if (window.confirm('Are you sure you want to log out from all devices including this one?')) {
        await logoutAll();
     }
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-[var(--color-surface-900)] flex justify-center py-6 sm:py-10 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="max-w-2xl w-full">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/')} className="p-2 bg-[var(--color-surface-800)] rounded-full hover:bg-[var(--color-surface-700)] transition-colors">
             <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6">Profile Details</h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-full bg-[var(--color-surface-600)] flex items-center justify-center overflow-hidden border-2 border-[var(--color-border)]">
                    {isUploading ? (
                      <Loader2 size={32} className="animate-spin text-[var(--color-primary)]" />
                    ) : user?.avatar ? (
                      <img src={user.avatar} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-bold text-[var(--color-text-secondary)]">{user?.username?.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="absolute bottom-0 right-0 w-8 h-8 bg-[var(--color-primary)] rounded-full text-white flex items-center justify-center shadow-lg hover:brightness-110 transition-all border-2 border-[var(--color-surface-800)] cursor-pointer"
                  >
                    <Camera size={14} />
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">Max 10MB (Square)</span>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdateProfile} className="flex-1 w-full space-y-4">
                <Input 
                  label="Email Address" 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-[var(--color-surface-900)] opacity-70"
                />
                <Input 
                  label="Username" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" isLoading={isUpdating} disabled={username === user?.username}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-2xl p-6 shadow-sm space-y-1">
             <h2 className="text-lg font-semibold mb-4 text-[var(--color-danger)]">Security & Sessions</h2>
             
             {/* 2FA Item */}
             <div className="flex items-center justify-between py-4 border-b border-[var(--color-border-light)]">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--color-surface-700)] flex items-center justify-center text-[var(--color-primary)]">
                   <ShieldCheck size={20} />
                 </div>
                 <div>
                   <h4 className="font-medium text-[var(--color-text-primary)]">Two-Factor Auth (2FA)</h4>
                   <p className="text-sm text-[var(--color-text-muted)]">Add an extra layer of security.</p>
                 </div>
               </div>
               
               {user?.totpEnabled ? (
                 <Button variant="danger" size="sm" onClick={disable2FA}>Disable</Button>
               ) : (
                 <Button variant="secondary" size="sm" onClick={start2FASetup}>Setup</Button>
               )}
             </div>

             {/* Device History Item */}
             <div className="flex items-center justify-between py-4 border-b border-[var(--color-border-light)]">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-[var(--color-surface-700)] flex items-center justify-center text-[var(--color-text-primary)]">
                   <MonitorSmartphone size={20} />
                 </div>
                 <div>
                   <h4 className="font-medium text-[var(--color-text-primary)]">Device History</h4>
                   <p className="text-sm text-[var(--color-text-muted)]">View and manage active sessions.</p>
                 </div>
               </div>
               <Button variant="ghost" size="sm" onClick={() => navigate('/settings/devices')}>View</Button>
             </div>

             {/* Logout All Item */}
             <div className="flex items-center justify-between py-4">
               <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-[var(--color-danger)]">
                   <LogOut size={20} />
                 </div>
                 <div>
                   <h4 className="font-medium text-[var(--color-text-primary)]">Sign Out Everything</h4>
                   <p className="text-sm text-[var(--color-text-muted)]">Log out from all devices.</p>
                 </div>
               </div>
               <Button variant="danger" size="sm" onClick={handleLogoutAll}>Log Out All</Button>
             </div>

             <div className="pt-4 flex justify-center">
                 <Button variant="ghost" onClick={logout} className="text-[var(--color-danger)] hover:bg-danger/10">Log Out Current Device</Button>
             </div>
          </div>

        </div>
      </div>

      {/* 2FA Setup Modal built inline for simplicity */}
      {is2FASetupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[var(--color-surface-800)] w-full max-w-sm rounded-2xl shadow-glass border border-[var(--color-border)] p-6 overflow-hidden max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">Set up 2FA</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">Scan this QR code with Google Authenticator or Authy.</p>
            
            <div className="bg-white p-2 rounded-lg flex items-center justify-center mx-auto mb-4 border-4 border-white max-w-fit">
               <img src={qrCode} alt="2FA QR Code" className="w-[180px] h-[180px]" />
            </div>
            
            <p className="text-xs text-[var(--color-text-muted)] text-center mb-6 break-all">
              Secret manual entry key: <br/><strong className="text-white select-all mt-1 block">{secret}</strong>
            </p>

            <Input 
              label="6-digit code"
              placeholder="000000"
              value={totpToken}
              onChange={e => setTotpToken(e.target.value.replace(/\D/g, '').slice(0,6))}
              className="text-center tracking-widest text-lg font-mono mb-4"
              maxLength={6}
            />

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setIs2FASetupOpen(false)}>Cancel</Button>
              <Button className="flex-1" disabled={totpToken.length !== 6} onClick={verify2FASetup}>Verify</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
