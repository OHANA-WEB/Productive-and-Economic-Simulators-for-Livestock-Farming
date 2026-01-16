import { useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import './Modal.css';

function Modal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type = 'danger', children, showIcon = true }) {
  const { t } = useI18n();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-container modal-${type}`}>
        <div className="modal-header">
          {showIcon && (
            <div className="modal-icon-wrapper">
              {type === 'danger' && (
                <div className="modal-icon-danger">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {type === 'warning' && (
                <div className="modal-icon-warning">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64547 18.3024 1.55299 18.6453 1.552 19C1.551 19.3547 1.64152 19.6981 1.81445 20.0015C1.98738 20.3049 2.23675 20.5583 2.53771 20.7359C2.83868 20.9135 3.18082 21.0092 3.53 21H20.47C20.8192 21.0092 21.1613 20.9135 21.4623 20.7359C21.7633 20.5583 22.0126 20.3049 22.1856 20.0015C22.3585 19.6981 22.449 19.3547 22.448 19C22.447 18.6453 22.3545 18.3024 22.18 18L13.71 3.86C13.5315 3.56611 13.2807 3.32311 12.9812 3.15447C12.6817 2.98584 12.3438 2.89725 12 2.89725C11.6562 2.89725 11.3183 2.98584 11.0188 3.15447C10.7193 3.32311 10.4685 3.56611 10.29 3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {type === 'info' && (
                <div className="modal-icon-info">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16V12M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {type === 'success' && (
                <div className="modal-icon-success">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          )}
          <h2 className="modal-title">{title}</h2>
          <button 
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          {children ? children : <div className="modal-message">{message}</div>}
        </div>

        {onConfirm && (
          <div className="modal-footer">
            <button 
              className="btn btn-secondary modal-cancel"
              onClick={onClose}
            >
              {cancelText || t('cancel')}
            </button>
            <button 
              className={`btn modal-confirm btn-${type === 'danger' ? 'danger' : 'primary'}`}
              onClick={handleConfirm}
              autoFocus
            >
              {confirmText || t('confirm')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
