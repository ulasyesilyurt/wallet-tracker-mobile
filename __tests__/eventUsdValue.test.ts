import {formatEventUsdValue} from '../src/utils/format';

describe('formatEventUsdValue', () => {
  it('formats successful native and canonical token valuations', () => {
    expect(
      formatEventUsdValue({
        usdValue: 1250,
        usdValueStatus: 'priced_native_eth',
        eventType: 'native_transfer',
      }),
    ).toBe('≈ $1,250');

    expect(
      formatEventUsdValue({
        usdValue: '182.47',
        usdValueStatus: 'priced_canonical_stablecoin',
        eventType: 'token_transfer',
      }),
    ).toBe('≈ $182.47');
  });

  it('formats tiny positive valuations without rounding them to zero', () => {
    expect(
      formatEventUsdValue({
        usdValue: 0.009,
        usdValueStatus: 'priced_canonical_weth',
        eventType: 'token_transfer',
      }),
    ).toBe('≈ <$0.01');
  });

  it('hides absent, invalid, zero, and negative valuations', () => {
    const invalidValues = [null, undefined, '', 'invalid', Number.NaN, Infinity, 0, -1];

    invalidValues.forEach(usdValue => {
      expect(
        formatEventUsdValue({
          usdValue,
          usdValueStatus: 'priced_native_eth',
          eventType: 'native_transfer',
        }),
      ).toBeNull();
    });
  });

  it('hides valuations without a successful priced status', () => {
    const hiddenStatuses = [
      null,
      undefined,
      'priced',
      'unpriced',
      'unknown',
      'suspicious',
      'unsupported',
    ];

    hiddenStatuses.forEach(usdValueStatus => {
      expect(
        formatEventUsdValue({
          usdValue: 100,
          usdValueStatus,
          eventType: 'token_transfer',
        }),
      ).toBeNull();
    });
  });

  it('hides NFT valuations identified by event or asset type', () => {
    expect(
      formatEventUsdValue({
        usdValue: 100,
        usdValueStatus: 'priced_canonical_weth',
        eventType: 'nft_transfer',
      }),
    ).toBeNull();

    expect(
      formatEventUsdValue({
        usdValue: 100,
        usdValueStatus: 'priced_canonical_weth',
        eventType: 'token_transfer',
        assetType: 'ERC-721',
      }),
    ).toBeNull();
  });
});
