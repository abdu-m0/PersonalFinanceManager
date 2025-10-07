import { useState } from 'react';

export type NotificationType = 'success' | 'error' | 'info';

export type NotificationState = {
  type: NotificationType;
  message: string;
};

export function useNotification() {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const showNotification = (type: NotificationType, message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const clearNotification = () => setNotification(null);

  return {
    notification,
    showNotification,
    clearNotification
  };
}