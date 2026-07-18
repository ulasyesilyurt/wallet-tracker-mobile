import {
  getDexscreenerTokenUrl,
  getOpenSeaItemUrl,
  getTransactionExplorerUrl,
  isValidEvmAddress,
  isValidTransactionHash,
} from '../src/utils/chains';
import {
  formatSignedEventAmount,
  getEventDetailTitle,
  isFungibleTokenEvent,
  isNftEvent,
} from '../src/utils/format';

const contractAddress = `0x${'a'.repeat(40)}`;
const transactionHash = `0x${'b'.repeat(64)}`;

describe('event detail helpers', () => {
  it('classifies event titles without guessing unknown activity', () => {
    expect(
      getEventDetailTitle({
        eventType: 'nft_transfer',
        assetType: 'ERC-721',
        direction: 'outgoing',
      }),
    ).toBe('NFT Transfer');
    expect(
      getEventDetailTitle({eventType: 'native_transfer', direction: 'outgoing'}),
    ).toBe('Send');
    expect(
      getEventDetailTitle({eventType: 'token_transfer', direction: 'incoming'}),
    ).toBe('Receive');
    expect(getEventDetailTitle({eventType: 'token_transfer'})).toBe('Token Transfer');
    expect(getEventDetailTitle({eventType: 'contract_activity'})).toBe('Activity');
  });

  it('classifies fungible and NFT assets independently', () => {
    expect(isFungibleTokenEvent('token_transfer', 'ERC-20')).toBe(true);
    expect(isFungibleTokenEvent('activity', 'fungible_token')).toBe(true);
    expect(isFungibleTokenEvent('nft_transfer', 'ERC-721')).toBe(false);
    expect(isNftEvent('token_transfer', 'ERC-1155')).toBe(true);
  });

  it('formats direction-aware signed amounts', () => {
    expect(formatSignedEventAmount('1.5', 'ETH', null, 'incoming')).toBe('+1.5 ETH');
    expect(formatSignedEventAmount('-1.5', 'ETH', null, 'outgoing')).toBe('−1.5 ETH');
    expect(formatSignedEventAmount('1.5', 'ETH', null, null)).toBe('1.5 ETH');
    expect(formatSignedEventAmount(null, 'ETH', null, 'incoming')).toBe('ETH');
  });

  it('builds supported external links from validated identifiers', () => {
    expect(isValidEvmAddress(contractAddress)).toBe(true);
    expect(isValidTransactionHash(transactionHash)).toBe(true);
    expect(getTransactionExplorerUrl('ethereum-mainnet', transactionHash)).toBe(
      `https://etherscan.io/tx/${transactionHash}`,
    );
    expect(getDexscreenerTokenUrl('base-mainnet', contractAddress)).toBe(
      `https://dexscreener.com/base/${contractAddress}`,
    );
    expect(getOpenSeaItemUrl('ethereum-mainnet', contractAddress, '12/34')).toBe(
      `https://opensea.io/item/ethereum/${contractAddress}/12%2F34`,
    );
  });

  it('hides malformed, unsupported, and incomplete links', () => {
    expect(getTransactionExplorerUrl('ethereum-mainnet', '0x1234')).toBeNull();
    expect(getTransactionExplorerUrl('unsupported-mainnet', transactionHash)).toBeNull();
    expect(getDexscreenerTokenUrl('base-mainnet', '0x1234')).toBeNull();
    expect(getDexscreenerTokenUrl('unsupported-mainnet', contractAddress)).toBeNull();
    expect(getOpenSeaItemUrl('base-mainnet', contractAddress, null)).toBeNull();
    expect(getOpenSeaItemUrl('unsupported-mainnet', contractAddress, '1')).toBeNull();
  });
});
