import {isTransactionActivityItem, type TransactionActivityItem} from '../src/api/events';
import {
  formatTransactionActivityUsdValue,
  getTransactionActivityOpenSeaUrl,
  getTransactionActivitySummaries,
  getTransactionActivityTitle,
} from '../src/utils/transactionActivities';

const nftContractAddress = `0x${'a'.repeat(40)}`;

function createActivity(
  overrides: Partial<TransactionActivityItem>,
): TransactionActivityItem {
  return {
    itemType: 'transaction',
    activityType: 'nft_purchase',
    id: 'transaction-1',
    walletId: 'wallet-1',
    chainId: 'ethereum-mainnet',
    occurredAt: '2026-07-20T10:00:00.000Z',
    ...overrides,
  };
}

describe('grouped NFT transaction activity helpers', () => {
  it('formats purchase, sale, and mint titles', () => {
    expect(getTransactionActivityTitle('nft_purchase')).toBe('NFT Purchase');
    expect(getTransactionActivityTitle('nft_sale')).toBe('NFT Sale');
    expect(getTransactionActivityTitle('nft_mint')).toBe('NFT Mint');
  });

  it('summarizes purchase asset legs', () => {
    const summaries = getTransactionActivitySummaries(
      createActivity({
        activityType: 'nft_purchase',
        sentAssets: [{assetType: 'native', assetSymbol: 'ETH', amount: '1.25'}],
        receivedAssets: [
          {
            assetType: 'ERC-721',
            assetName: 'Degen Pass',
            assetTokenId: '42',
            amount: '1',
          },
        ],
      }),
    );

    expect(summaries).toEqual({sent: '1.25 ETH', received: 'Degen Pass #42'});
  });

  it('summarizes sale and mint legs without assuming a marketplace', () => {
    const sale = getTransactionActivitySummaries(
      createActivity({
        activityType: 'nft_sale',
        sentAssets: [{assetType: 'ERC-721', assetName: 'Degen Pass', amount: '1'}],
        receivedAssets: [{assetType: 'ERC-20', assetSymbol: 'WETH', amount: '2'}],
      }),
    );
    const mint = getTransactionActivitySummaries(
      createActivity({
        activityType: 'nft_mint',
        sentAssets: null,
        receivedAssets: [{assetType: 'ERC-721', assetName: 'Fresh Mint', amount: '1'}],
      }),
    );

    expect(sale).toEqual({sent: 'Degen Pass', received: '2 WETH'});
    expect(mint).toEqual({sent: '—', received: 'Fresh Mint'});
  });

  it('formats a valid grouped USD valuation', () => {
    expect(
      formatTransactionActivityUsdValue(
        createActivity({usdValue: '1250', usdValueStatus: 'priced_nft_trade'}),
      ),
    ).toBe('≈ $1,250');
  });

  it('builds an OpenSea link from received or sent NFT legs', () => {
    const purchaseUrl = getTransactionActivityOpenSeaUrl(
      createActivity({
        receivedAssets: [
          {
            assetContractAddress: nftContractAddress,
            assetTokenId: '12/34',
          },
        ],
      }),
    );
    const saleUrl = getTransactionActivityOpenSeaUrl(
      createActivity({
        activityType: 'nft_sale',
        sentAssets: [
          {
            assetType: 'ERC-1155',
            assetContractAddress: nftContractAddress,
            assetTokenId: '99',
          },
        ],
      }),
    );

    expect(purchaseUrl).toBe(
      `https://opensea.io/item/ethereum/${nftContractAddress}/12%2F34`,
    );
    expect(saleUrl).toBe(
      `https://opensea.io/item/ethereum/${nftContractAddress}/99`,
    );
  });

  it('treats a legacy item without itemType as a raw event', () => {
    expect(
      isTransactionActivityItem({
        id: 'event-1',
        walletId: 'wallet-1',
        chainId: 'ethereum-mainnet',
        eventType: 'nft_transfer',
        assetSymbol: null,
        amount: '1',
        direction: 'incoming',
        occurredAt: '2026-07-20T10:00:00.000Z',
      }),
    ).toBe(false);
  });
});
