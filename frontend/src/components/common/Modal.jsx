import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, size = 'default' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-backdrop animate-fade-in" onClick={onClose}>
            <div
                className={`modal-content modal-${size} animate-scale-in`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
            >
                {title && (
                    <div className="modal-header">
                        <h3 className="modal-title">{title}</h3>
                        <button className="modal-close" onClick={onClose} aria-label="Close modal">
                            <FiX size={20} />
                        </button>
                    </div>
                )}
                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
};

export default Modal;
