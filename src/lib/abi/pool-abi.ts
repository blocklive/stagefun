export const POOL_ABI = [
  // Read functions
  "function totalCommitted() view returns (uint256)",
  "function targetAmount() view returns (uint256)",
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address account) view returns (uint256)",
  "function getLpBalances(address[] calldata holders) view returns (uint256[] memory balances)",
  "function lpToken() view returns (address)",

  // Write functions
  "function commit(uint256 amount) returns (bool)",
  "function withdraw(uint256 amount) returns (bool)",

  // Events
  "event Commit(address indexed user, uint256 amount)",
  "event Withdraw(address indexed user, uint256 amount)",
];
