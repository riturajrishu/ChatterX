import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  fullWidth = false,
  className = '',
  ...props 
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'gradient-primary text-white shadow-md hover:shadow-lg hover:brightness-110 active:brightness-90',
    secondary: 'bg-[var(--color-surface-700)] text-white hover:bg-[var(--color-surface-600)] active:bg-[var(--color-surface-800)] border border-[var(--color-border)]',
    danger: 'bg-[var(--color-danger)] text-white hover:brightness-110 shadow-sm',
    ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-800)] hover:text-white',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    icon: 'p-2',
  };

  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
      ) : null}
      {children}
    </button>
  );
});

Button.displayName = 'Button';
export default Button;
