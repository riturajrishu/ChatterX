import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ShieldCheck, MessageCircle } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (response) => {
    try {
      const result = await loginWithGoogle(response.credential, totpToken);
      if (result?.requires2FA) {
        setNeeds2FA(true);
        // Store the credential temporarily for 2FA verification
        localStorage.setItem('pending_google_credential', response.credential);
        toast('2FA required', { icon: '🔐' });
      } else if (result?.success) {
        navigate('/');
      }
    } catch (error) {
      toast.error('Google login failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }
    
    if (needs2FA && !totpToken) {
       toast.error('Please enter 2FA code');
       return;
    }

    try {
      let result;
      const pendingGoogle = localStorage.getItem('pending_google_credential');
      
      if (needs2FA && pendingGoogle) {
        result = await loginWithGoogle(pendingGoogle, totpToken);
        localStorage.removeItem('pending_google_credential');
      } else {
        result = await login({ email, password, totpToken });
      }

      if (result?.requires2FA) {
        setNeeds2FA(true);
        toast('2FA required', { icon: '🔐' });
      } else if (result?.success) {
        navigate('/');
      }
    } catch (error) {
       if (needs2FA) {
         setTotpToken('');
         localStorage.removeItem('pending_google_credential');
       }
    }
  };

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden gradient-auth flex flex-col items-center justify-start sm:justify-center p-4 py-10 relative">
      
      {/* Decorative Floating Background Elements */}
      <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[var(--color-primary)] opacity-[0.15] rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse-soft"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-[var(--color-warning)] opacity-[0.08] rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse-soft" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-md w-full glass-strong rounded-3xl p-8 sm:p-10 shadow-glass animate-slide-up relative z-10 border border-t-[var(--color-border-light)] border-l-[var(--color-border-light)]">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-5 shadow-lg shadow-[var(--color-primary-light)] transform hover:scale-105 transition-transform">
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold mb-3 tracking-tight text-gradient">Welcome Back</h1>
          <p className="text-[var(--color-text-secondary)] font-medium">Sign in to continue to Whispr.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {!needs2FA ? (
            <div className="space-y-4">
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={Mail}
                required
              />
              <Input
                type="password"
                label="Password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={Lock}
                required
              />
            </div>
          ) : (
            <div className="animate-fade-in space-y-4">
              <Input
                type="text"
                label="Authenticator Code"
                placeholder="000000"
                value={totpToken}
                onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, '').slice(0,6))}
                icon={ShieldCheck}
                autoFocus
                required
                className="text-center tracking-[0.5em] text-2xl font-bold bg-[var(--color-surface-900)] border-[var(--color-primary)]/50 focus:border-[var(--color-primary)] py-4"
              />
              <p className="text-sm text-[var(--color-text-secondary)] mt-3 text-center">
                Open your authenticator app to get the code.
              </p>
            </div>
          )}

          <Button type="submit" fullWidth isLoading={loading} className="mt-4 font-semibold">
            {needs2FA ? 'Verify Code' : 'Sign In'}
          </Button>

          {!needs2FA && (
            <div className="my-6 flex items-center justify-center">
               <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
               <span className="px-4 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Or continue with</span>
               <div className="flex-1 h-px bg-[var(--color-border)] opacity-50"></div>
            </div>
          )}

          {!needs2FA && (
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => toast.error('Google Login Failed')}
                useOneTap
                theme="filled_black"
                shape="pill"
              />
            </div>
          )}
        </form>

        {!needs2FA && (
          <div className="mt-8 text-center text-sm text-text-secondary">
             Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:text-primary-hover font-medium transition-colors">
               Create one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
