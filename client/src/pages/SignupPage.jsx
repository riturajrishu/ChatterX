import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, MessageCircle, Phone, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [otpShake, setOtpShake] = useState(false);
  const otpInputRef = useRef(null);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Username availability check
  useEffect(() => {
    if (formData.username.trim().length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get(`/auth/check-username/${formData.username}`);
        setUsernameStatus(data.available ? 'available' : 'taken');
      } catch (err) {
        setUsernameStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.username]);

  // OTP Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-focus OTP input when switching to OTP mode
  useEffect(() => {
    if (otpMode && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 300);
    }
  }, [otpMode]);

  const isEmailValid = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateDetails = () => {
    if (formData.fullName.trim().length < 2) return 'Please enter your full name';
    if (formData.username.length < 3) return 'Username must be at least 3 chars';
    if (usernameStatus === 'taken') return 'Please choose a different username. This one is taken.';
    if (!isEmailValid(formData.email)) return 'Please enter a valid genuine email address';
    if (formData.phoneNumber && !/^\d{10}$/.test(formData.phoneNumber)) return 'Mobile number must be exactly 10 digits';
    if (formData.password.length < 6) return 'Password must be at least 6 chars';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    const error = validateDetails();
    if (error) return toast.error(error);

    setIsSubmitting(true);
    try {
      await api.post('/auth/send-signup-otp', { 
        email: formData.email, 
        username: formData.username 
      });
      toast.success(`OTP sent to ${formData.email}`);
      setOtpMode(true);
      setCountdown(60);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setIsSubmitting(true);
    try {
      await api.post('/auth/send-signup-otp', { 
        email: formData.email, 
        username: formData.username 
      });
      toast.success('New OTP sent!');
      setOtp('');
      setCountdown(60);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (otp.length < 6) return toast.error('Please enter the 6-digit OTP');

    setIsSubmitting(true);
    setOtpError('');
    try {
      const result = await signup({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        password: formData.password,
        otp: otp
      });
      
      if (result?.success) {
        toast.success('Account created successfully!');
        navigate('/');
      }
    } catch (error) {
      const errMsg = error.response?.data?.message || 'Invalid or expired OTP. Please try again.';
      setOtpError(errMsg);
      toast.error(errMsg);
      // Clear OTP, shake, and re-focus for retry
      setOtp('');
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 500);
      setTimeout(() => otpInputRef.current?.focus(), 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-[100dvh] sm:h-screen overflow-y-auto overflow-x-hidden gradient-auth flex flex-col items-center justify-start sm:justify-center p-4 pt-12 pb-8 sm:py-12 relative">
      
      {/* Decorative Floating Background Elements */}
      <div className="absolute top-[10%] left-[10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-[var(--color-primary)] opacity-[0.15] rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse-soft"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[35vw] h-[35vw] max-w-[400px] max-h-[400px] bg-[var(--color-danger)] opacity-[0.08] rounded-full blur-[100px] pointer-events-none mix-blend-screen animate-pulse-soft" style={{ animationDelay: '1s' }}></div>

      <div className="max-w-md w-full glass-strong rounded-3xl p-6 sm:p-10 shadow-glass animate-slide-up relative z-10 border border-t-[var(--color-border-light)] border-l-[var(--color-border-light)] my-4 sm:my-8 flex-shrink-0">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary mb-5 shadow-lg shadow-[var(--color-primary-light)] transform hover:scale-105 transition-transform">
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight text-gradient">
            {otpMode ? 'Verify Email' : 'Create Account'}
          </h1>
          <p className="text-[var(--color-text-secondary)] font-medium text-sm sm:text-base">
            {otpMode ? `Enter the 6-digit code sent to ${formData.email}` : 'Join Whispr and start connecting.'}
          </p>
        </div>

        {!otpMode ? (
          <form onSubmit={handleRequestOTP} className="space-y-4 animate-fade-in">
            <Input
              name="fullName"
              type="text"
              label="Full Name"
              placeholder="Ritu Raj"
              value={formData.fullName}
              onChange={handleChange}
              icon={User}
              required
            />
            <div className="relative">
              <Input
                name="username"
                type="text"
                label="Username"
                placeholder="riturajrishu"
                value={formData.username}
                onChange={handleChange}
                icon={User}
                required
              />
              {formData.username.length >= 3 && (
                <p className={`text-xs mt-1 animate-fade-in pl-1 font-medium ${
                  usernameStatus === 'checking' ? 'text-[var(--color-text-secondary)]' :
                  usernameStatus === 'available' ? 'text-[var(--color-success)]' :
                  usernameStatus === 'taken' ? 'text-[var(--color-danger)]' : ''
                }`}>
                  {usernameStatus === 'checking' && 'Checking availability...'}
                  {usernameStatus === 'available' && '✓ Username is available!'}
                  {usernameStatus === 'taken' && '✗ Username already registered.'}
                </p>
              )}
            </div>
            
            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="genuine@example.com"
              value={formData.email}
              onChange={handleChange}
              icon={Mail}
              required
            />
            {formData.email && !isEmailValid(formData.email) && (
              <p className="text-xs text-[var(--color-danger)] mt-1 animate-fade-in pl-1">
                Please enter a genuine, correctly formatted email address.
              </p>
            )}

            <Input
              name="phoneNumber"
              type="tel"
              label="Mobile Number (Optional)"
              placeholder="9876543210"
              value={formData.phoneNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '').slice(0, 10)}))}
              icon={Phone}
              maxLength={10}
            />

            <Input
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              icon={Lock}
              required
              minLength={6}
            />
            <Input
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              icon={Lock}
              required
              minLength={6}
            />

            <div className="pt-4">
              <Button 
                type="submit" 
                fullWidth 
                isLoading={isSubmitting} 
                disabled={usernameStatus === 'taken' || usernameStatus === 'checking' || (formData.email && !isEmailValid(formData.email))} 
                className="font-semibold"
              >
                Send OTP & Request Access
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndSignup} className="space-y-5 animate-slide-up">
            {/* OTP Info Card */}
            <div className="bg-[var(--color-surface-800)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-primary)]/10 mb-3">
                <Mail size={24} className="text-[var(--color-primary)]" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                We sent a verification code to
              </p>
              <p className="text-white font-semibold text-sm mt-1 break-all">
                {formData.email}
              </p>
            </div>

            <div className={otpShake ? 'animate-shake' : ''}>
              <Input
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                label="Verification Code"
                placeholder="000000"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                icon={ShieldCheck}
                required
                error={otpError}
                className="text-center tracking-[0.5em] text-3xl font-extrabold py-5"
              />
            </div>

            {/* Resend OTP */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Resend code in <span className="text-[var(--color-primary)] font-semibold">{countdown}s</span>
                </p>
              ) : (
                <button 
                  type="button" 
                  onClick={handleResendOTP} 
                  disabled={isSubmitting}
                  className="text-sm text-[var(--color-primary)] hover:text-white transition-colors font-medium inline-flex items-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  Resend verification code
                </button>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button type="submit" fullWidth isLoading={isSubmitting} className="font-semibold">
                Verify OTP & Complete Signup
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                fullWidth 
                onClick={() => { setOtpMode(false); setOtp(''); }} 
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} className="mr-2" />
                Go Back
              </Button>
            </div>
          </form>
        )}

        {!otpMode && (
          <div className="mt-8 text-center text-sm font-medium">
            <span className="text-[var(--color-text-secondary)]">Already have an account? </span>
            <Link to="/login" className="text-[var(--color-primary)] hover:text-white transition-colors underline underline-offset-2">
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
