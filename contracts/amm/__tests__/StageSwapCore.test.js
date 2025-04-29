const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StageSwap Core Functionality", function () {
  let token1;
  let token2;
  let weth;
  let factory;
  let router;
  let owner, user1;

  // Use 6 decimals for USDC tokens
  const INITIAL_SUPPLY = ethers.parseUnits("1000000", 6);

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy MockUSDC tokens
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    token1 = await MockUSDC.deploy();
    await token1.waitForDeployment();
    await token1.mint(owner.address, INITIAL_SUPPLY);

    token2 = await MockUSDC.deploy();
    await token2.waitForDeployment();
    await token2.mint(owner.address, INITIAL_SUPPLY);

    // Deploy WETH
    const WETH = await ethers.getContractFactory("WETH");
    weth = await WETH.deploy();
    await weth.waitForDeployment();

    // Deploy Factory - no owner parameter needed, uses msg.sender
    const StageSwapFactory = await ethers.getContractFactory(
      "StageSwapFactory"
    );
    factory = await StageSwapFactory.deploy();
    await factory.waitForDeployment();

    // Deploy Router
    const StageSwapRouter = await ethers.getContractFactory("StageSwapRouter");
    router = await StageSwapRouter.deploy(
      await factory.getAddress(),
      await weth.getAddress()
    );
    await router.waitForDeployment();
  });

  it("Should create a pair", async function () {
    // Create a pair using the factory
    await factory.createPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    // Get the pair address
    const pairAddress = await factory.getPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    // Verify pair was created
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);

    // Verify pair length increased
    expect(await factory.allPairsLength()).to.equal(1);
  });

  it("Should check router's factory and WETH addresses", async function () {
    // Verify the router is properly configured
    const routerFactory = await router.factory();
    const routerWETH = await router.WETH();

    expect(routerFactory).to.equal(await factory.getAddress());
    expect(routerWETH).to.equal(await weth.getAddress());

    console.log("Router factory address:", routerFactory);
    console.log("Router WETH address:", routerWETH);
  });

  it("Should verify basic quote functionality", async function () {
    // Test the quote function to ensure correct calculations
    const amountA = ethers.parseUnits("100", 6);
    const reserveA = ethers.parseUnits("5000", 6);
    const reserveB = ethers.parseUnits("10000", 6);

    // Get quote from router
    const quote = await router.quote(amountA, reserveA, reserveB);

    // Expected result: amountA * reserveB / reserveA = 100 * 10000 / 5000 = 200
    const expectedQuote = ethers.parseUnits("200", 6);

    console.log("Quote for 100 tokens:", ethers.formatUnits(quote, 6));
    expect(quote).to.equal(expectedQuote);
  });

  it("Should compute the initialization code hash", async function () {
    // Get the StageSwapPair bytecode
    const StageSwapPair = await ethers.getContractFactory("StageSwapPair");
    const bytecode = StageSwapPair.bytecode;

    // Compute the keccak256 hash of the bytecode
    const initCodeHash = ethers.keccak256(bytecode);

    console.log("StageSwapPair initialization code hash:", initCodeHash);

    // This hash should be used in the StageSwapLibrary.pairFor function
    // Now verify address calculation

    // Create a pair directly with the factory
    await factory.createPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    // Get the actual pair address from the factory
    const actualPairAddress = await factory.getPair(
      await token1.getAddress(),
      await token2.getAddress()
    );
    console.log("Actual pair address from factory:", actualPairAddress);

    // Sort the token addresses (replicating the library's sortTokens function)
    const [sortedToken0, sortedToken1] =
      (await token1.getAddress()) < (await token2.getAddress())
        ? [await token1.getAddress(), await token2.getAddress()]
        : [await token2.getAddress(), await token1.getAddress()];

    // Calculate the CREATE2 address (replicating the library's pairFor function)
    const salt = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "address"],
        [sortedToken0, sortedToken1]
      )
    );

    // Recreate the pairFor function logic
    const create2Prefix = "0xff";
    const factoryAddress = await factory.getAddress();

    // Full CREATE2 address calculation
    const calculatedPairAddress = ethers.getAddress(
      ethers.dataSlice(
        ethers.keccak256(
          ethers.solidityPacked(
            ["bytes", "address", "bytes32", "bytes32"],
            [create2Prefix, factoryAddress, salt, initCodeHash]
          )
        ),
        12
      )
    );

    console.log(
      "Calculated pair address using correct hash:",
      calculatedPairAddress
    );

    // Compare addresses
    console.log(
      "Addresses match:",
      calculatedPairAddress.toLowerCase() === actualPairAddress.toLowerCase()
    );

    // This comparison might fail if StageSwapLibrary.pairFor uses a different init code hash
    // than what we computed here. If it fails, update the hash in the library.
  });

  it("Should add liquidity via router and verify reserves", async function () {
    // Amount of tokens to add as liquidity
    const tokenAmount1 = ethers.parseUnits("1000", 6); // 1000 tokens with 6 decimals
    const tokenAmount2 = ethers.parseUnits("2000", 6); // 2000 tokens with 6 decimals

    // Approve tokens for router to use
    await token1.approve(await router.getAddress(), tokenAmount1);
    await token2.approve(await router.getAddress(), tokenAmount2);

    // Future timestamp for deadline (current time + 1 hour)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    console.log("Adding liquidity...");

    // Create the pair first to ensure it exists
    await factory.createPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    // Get the pair address from factory
    const actualPairAddress = await factory.getPair(
      await token1.getAddress(),
      await token2.getAddress()
    );
    expect(actualPairAddress).to.not.equal(ethers.ZeroAddress);
    console.log("Actual pair address from factory:", actualPairAddress);

    // Calculate pair address using the same method as the test above (for comparison)
    const StageSwapPair = await ethers.getContractFactory("StageSwapPair");
    const bytecode = StageSwapPair.bytecode;
    const initCodeHash = ethers.keccak256(bytecode);

    // Sort tokens
    const [sortedToken0, sortedToken1] =
      (await token1.getAddress()) < (await token2.getAddress())
        ? [await token1.getAddress(), await token2.getAddress()]
        : [await token2.getAddress(), await token1.getAddress()];

    // Calculate CREATE2 address
    const salt = ethers.keccak256(
      ethers.solidityPacked(
        ["address", "address"],
        [sortedToken0, sortedToken1]
      )
    );
    const create2Prefix = "0xff";
    const factoryAddress = await factory.getAddress();

    // Full CREATE2 address calculation
    const calculatedPairAddress = ethers.getAddress(
      ethers.dataSlice(
        ethers.keccak256(
          ethers.solidityPacked(
            ["bytes", "address", "bytes32", "bytes32"],
            [create2Prefix, factoryAddress, salt, initCodeHash]
          )
        ),
        12
      )
    );

    console.log("Calculated pair address:", calculatedPairAddress);
    console.log(
      "Addresses match:",
      calculatedPairAddress.toLowerCase() === actualPairAddress.toLowerCase()
    );

    // Add liquidity via router
    const tx = await router.addLiquidity(
      await token1.getAddress(),
      await token2.getAddress(),
      tokenAmount1, // amountADesired
      tokenAmount2, // amountBDesired
      0, // amountAMin (0 for testing)
      0, // amountBMin (0 for testing)
      owner.address, // to
      deadline // deadline
    );

    await tx.wait();
    console.log("Liquidity added successfully");

    // Get the pair contract
    const pair = StageSwapPair.attach(actualPairAddress);

    // Check LP token balance
    const lpBalance = await pair.balanceOf(owner.address);
    console.log("LP tokens received:", ethers.formatUnits(lpBalance, 18));
    expect(lpBalance).to.be.gt(0);

    // Check reserves
    const reserves = await pair.getReserves();
    console.log(
      "Reserve0:",
      ethers.formatUnits(reserves[0], 6),
      "Reserve1:",
      ethers.formatUnits(reserves[1], 6)
    );

    // Determine token order (token0, token1)
    const token0Address = await pair.token0();

    // Verify reserves match the amounts we added (minus MINIMUM_LIQUIDITY if it's the first deposit)
    if (
      token0Address.toLowerCase() === (await token1.getAddress()).toLowerCase()
    ) {
      expect(reserves[0]).to.equal(tokenAmount1);
      expect(reserves[1]).to.equal(tokenAmount2);
    } else {
      expect(reserves[0]).to.equal(tokenAmount2);
      expect(reserves[1]).to.equal(tokenAmount1);
    }

    // Test adding more liquidity
    const additionalAmount1 = ethers.parseUnits("500", 6);
    const additionalAmount2 = ethers.parseUnits("1000", 6);

    await token1.approve(await router.getAddress(), additionalAmount1);
    await token2.approve(await router.getAddress(), additionalAmount2);

    const lpBalanceBefore = await pair.balanceOf(owner.address);

    await router.addLiquidity(
      await token1.getAddress(),
      await token2.getAddress(),
      additionalAmount1,
      additionalAmount2,
      0,
      0,
      owner.address,
      deadline
    );

    const lpBalanceAfter = await pair.balanceOf(owner.address);
    console.log(
      "Additional LP tokens received:",
      ethers.formatUnits(lpBalanceAfter - lpBalanceBefore, 18)
    );

    // Verify LP tokens increased
    expect(lpBalanceAfter).to.be.gt(lpBalanceBefore);

    // Check reserves again
    const newReserves = await pair.getReserves();
    console.log(
      "New Reserve0:",
      ethers.formatUnits(newReserves[0], 6),
      "New Reserve1:",
      ethers.formatUnits(newReserves[1], 6)
    );

    // Verify reserves increased
    expect(newReserves[0]).to.be.gt(reserves[0]);
    expect(newReserves[1]).to.be.gt(reserves[1]);
  });

  it("Should swap tokens correctly", async function () {
    // Amount of tokens to add as liquidity
    const tokenAmount1 = ethers.parseUnits("10000", 6); // 10000 tokens with 6 decimals
    const tokenAmount2 = ethers.parseUnits("10000", 6); // 10000 tokens with 6 decimals

    // Approve tokens for router to use
    await token1.approve(await router.getAddress(), tokenAmount1);
    await token2.approve(await router.getAddress(), tokenAmount2);

    // Future timestamp for deadline (current time + 1 hour)
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    // Create pair and add liquidity
    await factory.createPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    await router.addLiquidity(
      await token1.getAddress(),
      await token2.getAddress(),
      tokenAmount1,
      tokenAmount2,
      0,
      0,
      owner.address,
      deadline
    );

    // Get the pair address
    const pairAddress = await factory.getPair(
      await token1.getAddress(),
      await token2.getAddress()
    );

    // Get the StageSwapPair contract instance
    const StageSwapPair = await ethers.getContractFactory("StageSwapPair");
    const pair = StageSwapPair.attach(pairAddress);

    // Check initial reserves
    const initialReserves = await pair.getReserves();
    console.log(
      "Initial Reserve0:",
      ethers.formatUnits(initialReserves[0], 6),
      "Initial Reserve1:",
      ethers.formatUnits(initialReserves[1], 6)
    );

    // Amount to swap
    const swapAmount = ethers.parseUnits("100", 6);

    // Approve router to spend token1
    await token1.approve(await router.getAddress(), swapAmount);

    // Get token balances before swap
    const token1BalanceBefore = await token1.balanceOf(owner.address);
    const token2BalanceBefore = await token2.balanceOf(owner.address);

    console.log(
      "Token1 balance before swap:",
      ethers.formatUnits(token1BalanceBefore, 6)
    );
    console.log(
      "Token2 balance before swap:",
      ethers.formatUnits(token2BalanceBefore, 6)
    );

    // Calculate expected output based on the formula
    // Δy = (y * Δx * 997) / (x * 1000 + Δx * 997)
    const token0 = await pair.token0();
    let reserveIn, reserveOut;
    if (token0.toLowerCase() === (await token1.getAddress()).toLowerCase()) {
      reserveIn = initialReserves[0];
      reserveOut = initialReserves[1];
    } else {
      reserveIn = initialReserves[1];
      reserveOut = initialReserves[0];
    }

    const amountInWithFee = swapAmount * 997n;
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    const expectedAmountOut = numerator / denominator;

    console.log(
      "Expected output amount:",
      ethers.formatUnits(expectedAmountOut, 6)
    );

    // Create the path for the swap
    const path = [await token1.getAddress(), await token2.getAddress()];

    // Execute the swap
    await router.swapExactTokensForTokens(
      swapAmount, // amountIn
      0, // amountOutMin (0 for testing)
      path, // path
      owner.address, // to
      deadline // deadline
    );

    // Get token balances after swap
    const token1BalanceAfter = await token1.balanceOf(owner.address);
    const token2BalanceAfter = await token2.balanceOf(owner.address);

    console.log(
      "Token1 balance after swap:",
      ethers.formatUnits(token1BalanceAfter, 6)
    );
    console.log(
      "Token2 balance after swap:",
      ethers.formatUnits(token2BalanceAfter, 6)
    );

    // Calculate actual amounts swapped
    const token1Spent = token1BalanceBefore - token1BalanceAfter;
    const token2Received = token2BalanceAfter - token2BalanceBefore;

    console.log("Token1 spent:", ethers.formatUnits(token1Spent, 6));
    console.log("Token2 received:", ethers.formatUnits(token2Received, 6));

    // Verify the swap
    expect(token1Spent).to.equal(swapAmount);
    expect(token2Received).to.be.gt(0);
    expect(token2Received).to.be.closeTo(
      expectedAmountOut,
      ethers.parseUnits("0.1", 6)
    ); // Allow small rounding differences

    // Check final reserves
    const finalReserves = await pair.getReserves();
    console.log(
      "Final Reserve0:",
      ethers.formatUnits(finalReserves[0], 6),
      "Final Reserve1:",
      ethers.formatUnits(finalReserves[1], 6)
    );

    // Verify reserves have changed appropriately
    expect(finalReserves[0]).to.not.equal(initialReserves[0]);
    expect(finalReserves[1]).to.not.equal(initialReserves[1]);
  });
});
