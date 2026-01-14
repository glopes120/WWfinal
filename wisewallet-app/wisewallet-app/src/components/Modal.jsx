import React from 'react';
import './Modal.css';

function Modal({ isOpen, onClose, title, children, contentClassName = '' }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal-content ${contentClassName}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-header">
            <h4 className="modal-title">{title}</h4>
            <button className="modal-close-button" onClick={onClose}>&times;</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;