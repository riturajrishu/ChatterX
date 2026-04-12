import { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  error, 
  icon: Icon,
  className = '', 
  containerClassName = '',
  ...props 
}, ref) => {
  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label className="block tracking-wide text-text-secondary text-sm font-medium mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
             <Icon size={18} />
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-[var(--color-surface-800)] border border-[var(--color-border)] text-white rounded-xl 
            focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none 
            transition-colors py-3 pr-4
            placeholder:text-[var(--color-text-muted)]
            disabled:opacity-50 disabled:bg-[var(--color-surface-900)] disabled:cursor-not-allowed
            ${Icon ? 'pl-11' : 'pl-4'}
            ${error ? 'border-[var(--color-danger)] focus:border-[var(--color-danger)] focus:ring-[var(--color-danger)]' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-danger animate-fade-in ml-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
