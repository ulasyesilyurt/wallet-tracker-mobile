import { apiRequest } from './client';

export type WalletAlertSettings = {
  minimumAlertUsd: number;
  notificationsEnabled: boolean;
  notifyFungibleTransfers: boolean;
  notifyIncomingTransfers: boolean;
  notifyOutgoingTransfers: boolean;
  notifyNftTransfers: boolean;
};

export type UpdateWalletAlertSettingsPayload = WalletAlertSettings;

type WalletAlertSettingsResponse = {
  data: WalletAlertSettings;
};

export async function getWalletAlertSettings(
  walletId: string,
): Promise<WalletAlertSettings> {
  const response = await apiRequest<WalletAlertSettingsResponse>(
    `/wallets/${walletId}/alert-settings`,
  );

  return response.data;
}

export async function updateWalletAlertSettings(
  walletId: string,
  payload: UpdateWalletAlertSettingsPayload,
): Promise<WalletAlertSettings> {
  const response = await apiRequest<WalletAlertSettingsResponse>(
    `/wallets/${walletId}/alert-settings`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
  );

  return response.data;
}
