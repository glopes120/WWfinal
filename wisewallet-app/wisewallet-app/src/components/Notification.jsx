import React, { useEffect, useState } from 'react';
import './Notification.css';

const Notification = ({ notification, onClear }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade-out animation before clearing
        setTimeout(() => {
          onClear();
        }, 500);
      }, 5000); // Notification visible for 5 seconds

      return () => clearTimeout(timer);
    }
  }, [notification, onClear]);

  if (!notification || !visible) {
    return null;
  }

  const { message, title, type } = notification;
  const icon = type === 'success' ? '✅' : '❌';

  return (
    <div className={`notification-banner ${type}`}>
      <div className="icon">{icon}</div>
      <div className="content">
        <h4>{title}</h4>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Notification;
