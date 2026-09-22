import {apiRequest} from '../src/api/client';
import {getWalletEvents} from '../src/api/events';

jest.mock('../src/api/client', () => ({apiRequest: jest.fn()}));

const mockedApiRequest = jest.mocked(apiRequest);

describe('getWalletEvents', () => {
  beforeEach(() => mockedApiRequest.mockReset());

  it('passes limit and offset and parses backend pagination', async () => {
    mockedApiRequest.mockResolvedValue({
      data: [],
      pagination: {limit: 50, offset: 50, hasMore: true},
    });

    await expect(getWalletEvents('wallet-1', 50, 50)).resolves.toEqual({
      items: [],
      pagination: {limit: 50, offset: 50, hasMore: true},
    });
    expect(mockedApiRequest).toHaveBeenCalledWith(
      '/wallets/wallet-1/events?groupTransactions=true&limit=50&offset=50',
    );
  });

  it('remains compatible with responses that only contain data', async () => {
    mockedApiRequest.mockResolvedValue({data: []});

    await expect(getWalletEvents('wallet-1')).resolves.toEqual({
      items: [],
      pagination: {limit: 50, offset: 0, hasMore: false},
    });
  });
});
