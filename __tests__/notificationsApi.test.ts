import { apiRequest } from '../src/api/client';
import {
  getNotificationUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '../src/api/notifications';

jest.mock('../src/api/client');

const mockedApiRequest = jest.mocked(apiRequest);

describe('notifications API', () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it('reads the delivery-based unread count', async () => {
    mockedApiRequest.mockResolvedValue({ data: { unreadCount: 4 } });
    await expect(getNotificationUnreadCount()).resolves.toBe(4);
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/notifications/unread-count',
    );
  });

  it('marks one notification read', async () => {
    const result = {
      id: 'notification-1',
      isRead: true as const,
      readAt: '2026-09-19T12:00:00.000Z',
    };
    mockedApiRequest.mockResolvedValue({ data: result });
    await expect(markNotificationRead('notification-1')).resolves.toEqual(
      result,
    );
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/notifications/notification-1/read',
      { method: 'PATCH' },
    );
  });

  it('marks all notifications read', async () => {
    mockedApiRequest.mockResolvedValue({ data: { updatedCount: 3 } });
    await expect(markAllNotificationsRead()).resolves.toBe(3);
    expect(mockedApiRequest).toHaveBeenCalledWith('/notifications/read-all', {
      method: 'PATCH',
    });
  });
});
