/**
 * Token registry — known tokens deployed on Selendra testnet.
 * This is the single source of truth so the swap app works without a backend.
 */

export interface RegisteredToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoUrl?: string;
  description?: string;
}

/**
 * Tokens deployed via `dex/packages/contracts` deploy scripts.
 * Update this list whenever new tokens are deployed.
 */
export const REGISTERED_TOKENS: RegisteredToken[] = [
  {
    address: '0x86a015f6f900A9150A6f50bb544C9B4f283DB813',
    name: 'Test USD',
    symbol: 'TUSD',
    decimals: 18,
    description: 'Stablecoin pegged to USD',
  },
  {
    address: '0xBBA3aA309Bfd1e6a954baE28353edC4B13a147C1',
    name: 'Test Brown',
    symbol: 'TBROWN',
    decimals: 18,
    description: 'Brown ecosystem token',
  },
  {
    address: '0x287bd1c85e30C68ad38DA2f0d76256eE697C79d4',
    name: 'Test Smart',
    symbol: 'TSMART',
    decimals: 18,
    description: 'Smart contract token',
  },
  {
    address: '0xF4362E0080BE41a3422a1C485c36AbcaC08ACEbc',
    name: 'Test Zando',
    symbol: 'TZANDO',
    decimals: 18,
    description: 'Zando marketplace token',
  },
];
