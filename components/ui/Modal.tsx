'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  loading = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return (
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'alert':
        return (
          <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getButtonColors = () => {
    switch (type) {
      case 'error':
        return 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/50';
      case 'success':
        return 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-500/50';
      case 'alert':
        return 'from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 shadow-yellow-500/50';
      default:
        return 'from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 shadow-purple-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onClose : undefined}
      />
      
      {/* Modal */}
      <div 
        ref={modalRef}
        className="relative bg-purple-950/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-purple-900/50 border border-purple-500/30 p-6 sm:p-8 max-w-md w-full animate-modal-enter"
      >
        {/* Glow effects */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-fuchsia-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          {getIcon()}
          
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-3">
            {title}
          </h3>
          
          <p className="text-purple-300/80 text-sm sm:text-base mb-6 whitespace-pre-line">
            {message}
          </p>
          
          <div className="flex gap-3 justify-center">
            {type === 'confirm' && (
              <button
                onClick={onClose}
                disabled={loading}
                className="px-6 py-3 text-sm font-medium text-purple-300 bg-purple-900/50 hover:bg-purple-800/50 rounded-xl transition-all border border-purple-500/30 disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            
            <button
              onClick={type === 'confirm' ? onConfirm : onClose}
              disabled={loading}
              className={`px-6 py-3 text-sm font-medium text-white bg-gradient-to-r ${getButtonColors()} rounded-xl transition-all shadow-lg disabled:opacity-50 flex items-center gap-2`}
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {type === 'confirm' ? confirmText : 'حسناً'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
