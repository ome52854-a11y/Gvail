import React from 'react';

// --- Icon Component ---
export const Icon = ({ name, className = "" }: { name: string, className?: string }) => (
  <span className={`material-symbols-outlined select-none ${className}`}>
    {name}
  </span>
);

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  isLoading?: boolean;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, variant = 'primary', isLoading, icon, className = "", ...props 
}) => {
  const baseStyles = "relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40",
    secondary: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700",
    danger: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/30",
    ghost: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <>
          {icon && <Icon name={icon} />}
          {children}
        </>
      )}
    </button>
  );
};

// --- Input Component ---
export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    {...props}
    className={`w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 ${props.className || ''}`}
  />
);

// --- Modal Component ---
export const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      {/* Modal Content */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors">
            <Icon name="close" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Toast Component ---
export const ToastContainer = ({ message, type, show }: { message: string, type: string, show: boolean }) => {
  if (!show) return null;

  const typeColors = {
    success: 'bg-emerald-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
  };

  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
      <div className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-2 font-medium ${typeColors[type as keyof typeof typeColors]}`}>
        <Icon name={type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'} />
        <span>{message}</span>
      </div>
    </div>
  );
};

// --- Empty State ---
export const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center px-4">
    <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-400 dark:text-slate-500">
      <Icon name="inbox" className="text-4xl" />
    </div>
    <p className="text-slate-500 dark:text-slate-400 max-w-xs">{message}</p>
  </div>
);

// --- Header Component ---
export const Header = ({ 
  onMenuClick, 
  title, 
  rightAction 
}: { 
  onMenuClick?: () => void, 
  title: string, 
  rightAction?: React.ReactNode 
}) => (
  <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 md:px-8 h-16 flex items-center justify-between transition-colors">
    <div className="flex items-center gap-3">
      {onMenuClick && (
        <button onClick={onMenuClick} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors md:hidden">
          <Icon name="menu" />
        </button>
      )}
      <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
        {title}
      </h1>
    </div>
    <div>{rightAction}</div>
  </header>
);