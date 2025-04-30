import { ethers } from "ethers";
import { getContractAddresses } from "./addresses";

const StageSwapFactoryABI = [
  "function getPair(address tokenA, address tokenB) external view returns (address pair)",
  "function allPairs(uint) external view returns (address pair)",
  "function allPairsLength() external view returns (uint)",
  "function createPair(address tokenA, address tokenB) external returns (address pair)",
  "function feeTo() external view returns (address)",
  "function feeToSetter() external view returns (address)",
];

const StageSwapRouterABI = [
  "function factory() external view returns (address)",
  "function WETH() external view returns (address)",
  "function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB)",
  "function removeLiquidityETH(address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountToken, uint amountETH)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapTokensForExactTokens(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
  "function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB)",
  "function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut)",
  "function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn)",
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts)",
  "function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts)",
];

const IERC20ABI = [
  "function name() external view returns (string memory)",
  "function symbol() external view returns (string memory)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint)",
  "function balanceOf(address owner) external view returns (uint)",
  "function allowance(address owner, address spender) external view returns (uint)",
  "function approve(address spender, uint value) external returns (bool)",
  "function transfer(address to, uint value) external returns (bool)",
  "function transferFrom(address from, address to, uint value) external returns (bool)",
];

export async function getFactoryContract(provider: ethers.Provider) {
  const { stageSwapFactory } = getContractAddresses();
  return new ethers.Contract(stageSwapFactory, StageSwapFactoryABI, provider);
}

export async function getRouterContract(provider: ethers.Provider) {
  const { stageSwapRouter } = getContractAddresses();
  return new ethers.Contract(stageSwapRouter, StageSwapRouterABI, provider);
}

export async function getERC20Contract(
  address: string,
  provider: ethers.Provider
) {
  return new ethers.Contract(address, IERC20ABI, provider);
}

export async function getWETHContract(provider: ethers.Provider) {
  const { weth } = getContractAddresses();
  return new ethers.Contract(weth, IERC20ABI, provider);
}

export async function getUSDCContract(provider: ethers.Provider) {
  const { usdc } = getContractAddresses();
  return new ethers.Contract(usdc, IERC20ABI, provider);
}

export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  signer: ethers.Signer
) {
  const tokenContract = new ethers.Contract(tokenAddress, IERC20ABI, signer);
  return tokenContract.approve(spenderAddress, amount);
}

export async function getTokenAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: ethers.Provider
) {
  const tokenContract = new ethers.Contract(tokenAddress, IERC20ABI, provider);
  return tokenContract.allowance(ownerAddress, spenderAddress);
}

export async function getTokenBalance(
  tokenAddress: string,
  accountAddress: string,
  provider: ethers.Provider
) {
  const tokenContract = new ethers.Contract(tokenAddress, IERC20ABI, provider);
  return tokenContract.balanceOf(accountAddress);
}

export async function swapExactTokensForTokens(
  amountIn: string,
  amountOutMin: string,
  path: string[],
  to: string,
  deadline: number,
  signer: ethers.Signer
) {
  const router = new ethers.Contract(
    getContractAddresses().stageSwapRouter,
    StageSwapRouterABI,
    signer
  );
  return router.swapExactTokensForTokens(
    amountIn,
    amountOutMin,
    path,
    to,
    deadline
  );
}

export async function getAmountsOut(
  amountIn: string,
  path: string[],
  provider: ethers.Provider
) {
  const router = new ethers.Contract(
    getContractAddresses().stageSwapRouter,
    StageSwapRouterABI,
    provider
  );
  return router.getAmountsOut(amountIn, path);
}

// Helper function to get the current timestamp plus some minutes
export function getDeadlineTimestamp(minutes: number = 20): number {
  return Math.floor(Date.now() / 1000) + 60 * minutes;
}
