import React, { useEffect } from 'react';
import './SubscriptionToast.css';

interface SubscriptionToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const SubscriptionToast: React.FC<SubscriptionToastProps> = ({
  message,
  onClose,
  duration = 3000,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="subscription-toast">
      {message}
    </div>
  );
};

