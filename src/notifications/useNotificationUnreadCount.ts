import { useCallback, useEffect, useState } from 'react';
import { getNotificationUnreadCount } from '../api/notifications';

export function useNotificationUnreadCount() {
  const [unreadCount, setUnreadCount] = useState<number | null>(null);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const nextCount = await getNotificationUnreadCount();
      setUnreadCount(
        Number.isFinite(nextCount) ? Math.max(0, Math.floor(nextCount)) : 0,
      );
    } catch {
      // Keep the last known count when the badge endpoint is unavailable.
    }
  }, []);

  useEffect(() => {
    void refreshUnreadCount();
  }, [refreshUnreadCount]);

  return { unreadCount, refreshUnreadCount };
}
