// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunLiquidity.sol";
import "./StageDotFunNFT.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IStageDotFunPool.sol";

contract StageDotFunPool is Ownable {
    // Constants
    uint256 public constant MAX_TIERS = 20;
    uint256 public constant LP_TOKEN_MULTIPLIER = 1000; // 1000x multiplier for LP tokens
    uint256 private constant PRECISION = 1e6; // Match LP token decimals (6 decimals)

    // State variables
    IERC20 public depositToken;
    StageDotFunLiquidity public lpToken;
    StageDotFunNFT public nftContract;
    
    string public name;
    string public uniqueId;
    address public creator;
    uint256 public totalDeposits;
    uint256 public revenueAccumulated;
    uint256 public initialFundsWithdrawn;
    uint256 public endTime;
    uint256 public targetAmount;
    uint256 public capAmount;
    
    // Timestamp tracking for milestones
    uint256 public targetReachedTime;
    uint256 public capReachedTime;
    
    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public lastRevenueUpdate;
    uint256 public totalDistributed;
    uint256 public lastDistributionTime;
    
    // Reward state
    uint256 public accRewardPerLp;              // global accumulator
    mapping(address => uint256) public rewardDebt; // per-account paid index
    
    enum PoolStatus {
        INACTIVE,
        ACTIVE,
        PAUSED,
        CLOSED,
        FUNDED,  // When target is reached
        FULLY_FUNDED, // When cap is reached
        FAILED,   // When end time is reached without meeting target
        EXECUTING, // When pool is using funds to execute the event/project
        COMPLETED,
        CANCELLED
    }
    
    PoolStatus public status;
    
    struct Tier {
        string name;
        uint256 price;
        bool isActive;
        string nftMetadata;
        bool isVariablePrice;  // If true, allows custom amounts between min/max
        uint256 minPrice;      // Only used if isVariablePrice is true
        uint256 maxPrice;      // Only used if isVariablePrice is true
        uint256 maxPatrons;    // Maximum number of patrons allowed in this tier (0 for unlimited)
        uint256 currentPatrons; // Current number of patrons in this tier
    }
    
    // Change from dynamic array to fixed-size array
    Tier[MAX_TIERS] public tiers;
    uint256 public tierCount;
    
    // Mapping from user to their tier commitments
    mapping(address => mapping(uint256 => bool)) public tierCommitments;
    mapping(address => uint256[]) public userTierCommitments;
    
    // Track all users who have committed to any tier
    address[] private committedUsers;
    mapping(address => bool) private isCommittedUser;
    
    // LP Token holders
    mapping(address => uint256) public lpBalances;
    mapping(address => bool) public isLpHolder;
    
    // Track NFT claims
    mapping(address => mapping(uint256 => bool)) public hasClaimedNFT;
    mapping(uint256 => uint256) public tierNFTSupply; // tierId => current supply
    
    // Events
    event TierCreated(uint256 indexed tierId, string name, uint256 price);
    event TierUpdated(uint256 indexed tierId, string name, uint256 price);
    event TierDeactivated(uint256 indexed tierId);
    event TierActivated(uint256 indexed tierId);
    event TierCommitted(address indexed user, uint256 indexed tierId, uint256 amount);
    event TargetReached(uint256 totalAmount);
    event CapReached(uint256 totalAmount);
    event FundsReturned(address indexed lp, uint256 amount);
    event PoolStatusUpdated(PoolStatus newStatus);
    event RevenueReceived(uint256 amount);
    event RevenueDistributed(uint256 amount);
    event PoolNameUpdated(string oldName, string newName);
    event FundsWithdrawn(address indexed recipient, uint256 amount);
    event RevenueWithdrawnEmergency(address indexed sender, uint256 amount);
    event Claimed(address indexed user, uint256 amount);
    
    // Get user's tier commitments
    function getUserTierCommitments(address user) external view returns (uint256[] memory) {
        return userTierCommitments[user];
    }
    
    // Add initializer modifier
    modifier initializer() {
        require(!initialized, "Already initialized");
        _;
        initialized = true;
    }
    
    // Add initialization state
    bool private initialized;
    
    // Add initialize function
    function initialize(
        string memory _name,
        string memory _uniqueId,
        string memory symbol,
        uint256 _endTime,
        address _depositToken,
        address _owner,
        address _creator,
        uint256 _targetAmount,
        uint256 _capAmount,
        address _lpTokenImplementation,
        address _nftImplementation,
        IStageDotFunPool.TierInitData[] memory _tiers
    ) external initializer {
        name = _name;
        uniqueId = _uniqueId;
        creator = _creator;
        endTime = _endTime;
        depositToken = IERC20(_depositToken);
        status = PoolStatus.ACTIVE;
        targetAmount = _targetAmount;
        capAmount = _capAmount;
        targetReachedTime = 0;
        capReachedTime = 0;
        
        string memory tokenName = string(abi.encodePacked(_name));
        lpToken = StageDotFunLiquidity(Clones.clone(_lpTokenImplementation));
        lpToken.initialize(tokenName, symbol);
        
        // Deploy NFT contract for this pool with new naming convention
        string memory nftName = string(abi.encodePacked(_name, " Patron"));
        string memory nftSymbol = string(abi.encodePacked(symbol, "P"));
        nftContract = StageDotFunNFT(
            Clones.clone(_nftImplementation)
        );
        nftContract.initialize(
            nftName,
            nftSymbol,
            address(this)  // Set the pool contract as the owner
        );
        
        // Create initial tiers if provided
        if (_tiers.length > 0) {
            for (uint256 i = 0; i < _tiers.length; i++) {
                require(tierCount < MAX_TIERS, "Max tiers reached");
                require(bytes(_tiers[i].name).length > 0, "Name required");
                // Allow price to be 0 for free tiers
                require(_tiers[i].price >= 0, "Price cannot be negative");
                
                if (_tiers[i].isVariablePrice) {
                    // Allow min price to be 0 for free variable price tiers
                    require(_tiers[i].minPrice >= 0, "Min price cannot be negative");
                    require(_tiers[i].maxPrice >= _tiers[i].minPrice, "Max price must be >= min price");
                }
                
                // Allow 0 for unlimited patrons
                require(_tiers[i].maxPatrons >= 0, "Max patrons cannot be negative");
                
                tiers[tierCount] = Tier({
                    name: _tiers[i].name,
                    price: _tiers[i].price,
                    isActive: true,
                    nftMetadata: _tiers[i].nftMetadata,
                    isVariablePrice: _tiers[i].isVariablePrice,
                    minPrice: _tiers[i].minPrice,
                    maxPrice: _tiers[i].maxPrice,
                    maxPatrons: _tiers[i].maxPatrons,
                    currentPatrons: 0
                });
                
                emit TierCreated(tierCount, _tiers[i].name, _tiers[i].price);
                tierCount++;
            }
        }
        
        // Transfer ownership to the specified owner
        _transferOwnership(_owner);
    }
    
    modifier poolIsActive() {
        require(status == PoolStatus.ACTIVE, "Pool is not active");
        _;
    }
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Not creator");
        _;
    }
    
    modifier tierExists(uint256 tierId) {
        require(tierId < tierCount, "Tier does not exist");
        _;
    }
    
    modifier tierIsActive(uint256 tierId) {
        require(tiers[tierId].isActive, "Tier is not active");
        _;
    }
    
    modifier targetMet() {
        require(targetReachedTime > 0, "Target amount not reached");
        _;
    }
    
    // Create a new tier
    function createTier(
        string memory _name,
        uint256 _price,
        string memory _nftMetadata,
        bool _isVariablePrice,
        uint256 _minPrice,
        uint256 _maxPrice,
        uint256 _maxPatrons
    ) external onlyOwner {
        require(tierCount < MAX_TIERS, "Max tiers reached");
        require(bytes(_name).length > 0, "Name required");
        // Allow price to be 0 for free tiers
        require(_price >= 0, "Price cannot be negative");
        
        if (_isVariablePrice) {
            // Allow min price to be 0 for free variable price tiers
            require(_minPrice >= 0, "Min price cannot be negative");
            require(_maxPrice >= _minPrice, "Max price must be >= min price");
        }
        
        // Allow 0 for unlimited patrons
        require(_maxPatrons >= 0, "Max patrons cannot be negative");
        
        tiers[tierCount] = Tier({
            name: _name,
            price: _price,
            isActive: true,
            nftMetadata: _nftMetadata,
            isVariablePrice: _isVariablePrice,
            minPrice: _minPrice,
            maxPrice: _maxPrice,
            maxPatrons: _maxPatrons,
            currentPatrons: 0
        });
        
        tierCount++;
        emit TierCreated(tierCount - 1, _name, _price);
    }
    
    // Update an existing tier
    function updateTier(
        uint256 tierId,
        string memory _name,
        uint256 _price,
        string memory _nftMetadata,
        bool _isVariablePrice,
        uint256 _minPrice,
        uint256 _maxPrice,
        uint256 _maxPatrons
    ) external onlyOwner {
        require(tierId < tierCount, "Invalid tier");
        require(bytes(_name).length > 0, "Name required");
        // Allow price to be 0 for free tiers
        require(_price >= 0, "Price cannot be negative");
        
        if (_isVariablePrice) {
            // Allow min price to be 0 for free variable price tiers
            require(_minPrice >= 0, "Min price cannot be negative");
            require(_maxPrice >= _minPrice, "Max price must be >= min price");
        }
        
        require(_maxPatrons >= tiers[tierId].currentPatrons, "Max patrons cannot be less than current patrons");
        
        Tier storage tier = tiers[tierId];
        tier.name = _name;
        tier.price = _price;
        tier.nftMetadata = _nftMetadata;
        tier.isVariablePrice = _isVariablePrice;
        tier.minPrice = _minPrice;
        tier.maxPrice = _maxPrice;
        tier.maxPatrons = _maxPatrons;
        
        emit TierUpdated(tierId, _name, _price);
    }
    
    // Deactivate a tier
    function deactivateTier(uint256 tierId) external onlyCreator poolIsActive tierExists(tierId) tierIsActive(tierId) {
        tiers[tierId].isActive = false;
        emit TierDeactivated(tierId);
    }
    
    // Activate a tier
    function activateTier(uint256 tierId) external onlyCreator poolIsActive tierExists(tierId) {
        require(!tiers[tierId].isActive, "Tier is already active");
        tiers[tierId].isActive = true;
        emit TierActivated(tierId);
    }
    
    // Commit to a tier
    function commitToTier(uint256 tierId, uint256 amount) external {
        require(tierId < tierCount, "Invalid tier");
        require(tiers[tierId].isActive, "Tier not active");
        require(status == PoolStatus.ACTIVE || status == PoolStatus.FUNDED, "Pool not accepting commitments");
        require(block.timestamp <= endTime, "Pool ended");
        if (capAmount > 0) {
            require(totalDeposits + amount <= capAmount, "Exceeds cap");
        }
        
        Tier storage tier = tiers[tierId];
        // Only check max patrons if not unlimited (maxPatrons > 0)
        require(tier.maxPatrons == 0 || tier.currentPatrons < tier.maxPatrons, "Tier is full");
        
        if (tier.isVariablePrice) {
            require(amount >= tier.minPrice, "Amount below minimum");
            require(amount <= tier.maxPrice, "Amount above maximum");
        } else {
            require(amount == tier.price, "Amount must match tier price");
        }
        
        // Transfer USDC from user
        require(depositToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // Mint LP tokens with 1000x multiplier
        uint256 lpAmount = amount * LP_TOKEN_MULTIPLIER;
        lpToken.mint(msg.sender, lpAmount);
        
        // Update pool state
        totalDeposits += amount;
        tier.currentPatrons++;
        
        // Add user to committed users if not already there
        if (!isCommittedUser[msg.sender]) {
            committedUsers.push(msg.sender);
            isCommittedUser[msg.sender] = true;
        }
        
        // Add to user's tier commitments
        tierCommitments[msg.sender][tierId] = true;
        userTierCommitments[msg.sender].push(tierId);
        
        // Mint NFT for the tier if metadata exists
        if (bytes(tier.nftMetadata).length > 0) {
            nftContract.mintNFT(msg.sender, tier.nftMetadata);
        }
        
        emit TierCommitted(msg.sender, tierId, amount);
        
        // Check pool conditions
        _checkPoolStatus();
    }
    
    function receiveRevenue(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(status == PoolStatus.EXECUTING, "Pool must be in executing state");
        require(depositToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        // 1. pull revenue tokens in
        revenueAccumulated += amount;
        emit RevenueReceived(amount);
        
        // 2. update global index
        uint256 supply = lpToken.totalSupply();
        if (supply > 0) {
            accRewardPerLp += (amount * PRECISION) / supply;
        }
    }

    // Emergency withdrawal - withdraw entire contract balance
    function emergencyWithdrawAll() external onlyOwner {
        require(status == PoolStatus.EXECUTING, "Pool must be in executing state");
        
        uint256 fullBalance = depositToken.balanceOf(address(this));
        require(fullBalance > 0, "No funds to withdraw");
        
        // Reset all fund tracking
        revenueAccumulated = 0;
        initialFundsWithdrawn = totalDeposits;
        
        // Transfer the full balance to the owner
        require(depositToken.transfer(msg.sender, fullBalance), "Transfer failed");
        
        // Emit a single event with the full amount
        emit RevenueWithdrawnEmergency(msg.sender, fullBalance);
    }

    /* -----  PULL MODEL  ----- */
    
    function pendingRewards(address user) public view returns (uint256) {
        uint256 gross = (lpToken.balanceOf(user) * accRewardPerLp) / PRECISION;
        return gross - rewardDebt[user];
    }
    
    function claimDistribution() external {
        uint256 pending = pendingRewards(msg.sender);
        require(pending > 0, "Nothing to claim");
        rewardDebt[msg.sender] += pending;
        require(depositToken.transfer(msg.sender, pending), "Transfer failed");
        emit Claimed(msg.sender, pending);
    }
    
    /* called by LP-token on every transfer / mint / burn */
    function _syncDebt(address user) external {
        require(msg.sender == address(lpToken), "Only LP token");
        rewardDebt[user] = (lpToken.balanceOf(user) * accRewardPerLp) / PRECISION;
    }

    // Keeping distributeRevenue for backwards compatibility
    // DEPRECATED 5/1/25 - replaced with pull model - remove after pools close
    function distributeRevenue() external {
        require(revenueAccumulated > 0, "No revenue to distribute");
        require(status == PoolStatus.EXECUTING, "Pool must be in executing state");
        
        uint256 totalSupply = lpToken.totalSupply();
        require(totalSupply > 0, "No LP tokens issued");
        
        // Ensure the contract has enough balance for distribution
        uint256 contractBalance = depositToken.balanceOf(address(this));
        uint256 availableForRevenue = contractBalance - (totalDeposits - initialFundsWithdrawn);
        require(availableForRevenue >= revenueAccumulated, "Insufficient balance for distribution");
        
        // The revenue has already been captured in accRewardPerLp during receiveRevenue calls
        // Here we just need to force-claim for all LP token holders
        address[] memory holders = lpToken.getHolders();
        uint256 amountDistributed = 0;
        
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 pendingAmount = pendingRewards(holder);
            
            if (pendingAmount > 0) {
                rewardDebt[holder] += pendingAmount;
                bool success = depositToken.transfer(holder, pendingAmount);
                if (success) {
                    amountDistributed += pendingAmount;
                    emit Claimed(holder, pendingAmount);
                }
            }
        }
        
        // Reduce revenueAccumulated by the actually distributed amount
        if (amountDistributed > 0) {
            // Cap at revenueAccumulated to avoid underflow
            if (amountDistributed > revenueAccumulated) {
                revenueAccumulated = 0;
            } else {
                revenueAccumulated -= amountDistributed;
            }
            
            // Update the state variable tracking total distributions
            totalDistributed += amountDistributed;
            lastDistributionTime = block.timestamp;
            
            emit RevenueDistributed(amountDistributed);
        }
    }
    
    // View functions
    function getTier(uint256 tierId) external view returns (Tier memory) {
        require(tierId < tierCount, "Tier does not exist");
        return tiers[tierId];
    }
    
    function getTierCount() external view returns (uint256) {
        return tierCount;
    }
    
    function getLpBalance(address holder) external view returns (uint256) {
        return lpToken.balanceOf(holder);
    }

    // Get LP balances with pagination support
    function getLpBalances(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (
        address[] memory holders,
        uint256[] memory balances
    ) {
        // Get all addresses that have LP tokens
        address[] memory allHolders = new address[](committedUsers.length);
        uint256 holderCount = 0;
        
        // Iterate through committed users
        for (uint256 i = 0; i < committedUsers.length; i++) {
            address user = committedUsers[i];
            if (lpToken.balanceOf(user) > 0) {
                allHolders[holderCount++] = user;
            }
        }
        
        // If both indices are 0, return all holders
        if (startIndex == 0 && endIndex == 0) {
            endIndex = holderCount > 0 ? holderCount - 1 : 0;
        } else {
            // Validate indices
            require(startIndex < holderCount, "Start index out of bounds");
            require(startIndex <= endIndex, "Start index must be <= end index");
            
            // Cap endIndex to the array length
            if (endIndex >= holderCount) {
                endIndex = holderCount - 1;
            }
        }
        
        // If no holders or invalid range, return empty arrays
        if (holderCount == 0 || startIndex >= holderCount) {
            return (new address[](0), new uint256[](0));
        }
        
        uint256 batchSize = endIndex - startIndex + 1;
        
        holders = new address[](batchSize);
        balances = new uint256[](batchSize);
        
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 holderIndex = startIndex + i;
            address holder = allHolders[holderIndex];
            holders[i] = holder;
            balances[i] = lpToken.balanceOf(holder);
        }
        
        return (holders, balances);
    }
    
    // Update pool name - only owner can call this
    function updatePoolName(string memory _newName) external onlyOwner {
        require(bytes(_newName).length > 0, "Name cannot be empty");
        string memory oldName = name;
        name = _newName;
        emit PoolNameUpdated(oldName, _newName);
    }
    
    function getTierNFTSupply(uint256 tierId) external view returns (uint256) {
        return tierNFTSupply[tierId];
    }
    
    // View functions to get all pool details in a single call
    function getPoolDetails() external view returns (
        string memory _name,
        string memory _uniqueId,
        address _creator,
        uint256 _totalDeposits,
        uint256 _revenueAccumulated,
        uint256 _endTime,
        uint256 _targetAmount,
        uint256 _capAmount,
        uint8 _status,
        address _lpTokenAddress,
        address _nftContractAddress,
        uint256 _tierCount,
        uint256 _targetReachedTime,
        uint256 _capReachedTime
    ) {
        return (
            name,
            uniqueId,
            creator,
            totalDeposits,
            revenueAccumulated,
            endTime,
            targetAmount,
            capAmount,
            uint8(status),
            address(lpToken),
            address(nftContract),
            tierCount,
            targetReachedTime,
            capReachedTime
        );
    }

    function _checkPoolStatus() internal {
        // Check if target has been reached
        if (targetReachedTime == 0 && totalDeposits >= targetAmount) {
            targetReachedTime = block.timestamp;
            status = PoolStatus.FUNDED;
            emit TargetReached(totalDeposits);
            emit PoolStatusUpdated(PoolStatus.FUNDED);
        }
        
        // Check if end time has passed and target not met
        if (block.timestamp > endTime && targetReachedTime == 0 && status == PoolStatus.ACTIVE) {
            status = PoolStatus.FAILED;
            emit PoolStatusUpdated(PoolStatus.FAILED);
        }
        
        // Check if cap reached - but only if capAmount is not 0 (unlimited)
        if (capAmount >= targetAmount && totalDeposits >= capAmount && capReachedTime == 0) {
            if (targetReachedTime == 0) {
                targetReachedTime = block.timestamp;
            }
            capReachedTime = block.timestamp;
            // Automatically transition to EXECUTING state when cap is hit
            status = PoolStatus.EXECUTING;
            emit CapReached(totalDeposits);
            emit PoolStatusUpdated(PoolStatus.EXECUTING);
        }
    }

    // Add external function to check pool status
    function checkPoolStatus() external {
        _checkPoolStatus();
    }

    // Add getLpHolders function
    function getLpHolders() external view returns (address[] memory) {
        return lpToken.getHolders();
    }

    // Allow LPs to claim their funds back if the pool failed to meet its target
    function claimRefund() external {
        require(status == PoolStatus.FAILED, "Pool has not failed");
        
        // Check LP token balance directly from the token contract
        uint256 lpBalance = lpToken.balanceOf(msg.sender);
        require(lpBalance > 0, "No LP tokens to refund");
        
        // Burn LP tokens
        lpToken.burn(msg.sender, lpBalance);

        // Clear any residual debt (now balance == 0)
        rewardDebt[msg.sender] = 0;
        
        // Calculate the original deposit amount by dividing by the multiplier
        uint256 depositAmount = lpBalance / LP_TOKEN_MULTIPLIER;
        
        // Return USDC
        require(depositToken.transfer(msg.sender, depositAmount), "Refund transfer failed");
        
        emit FundsReturned(msg.sender, depositAmount);
    }

    // Withdraw funds after target is met - allow only in EXECUTING state
    function withdrawFunds(uint256 amount) external onlyOwner targetMet {
        require(status == PoolStatus.EXECUTING, "Pool must be in executing state");
        
        // Calculate available initial funds (excluding revenue)
        uint256 remainingInitialFunds = totalDeposits - initialFundsWithdrawn;
        require(remainingInitialFunds > 0, "No initial funds to withdraw");
        
        // If amount is 0, withdraw all remaining initial funds
        uint256 withdrawAmount = amount == 0 ? remainingInitialFunds : amount;
        require(withdrawAmount <= remainingInitialFunds, "Amount exceeds available initial funds");
        
        // Update the withdrawn amount
        initialFundsWithdrawn += withdrawAmount;
        
        // Ensure we have enough balance (considering both initial funds and revenue)
        uint256 contractBalance = depositToken.balanceOf(address(this));
        require(contractBalance >= withdrawAmount, "Insufficient balance");
        
        // Transfer funds to owner
        require(depositToken.transfer(owner(), withdrawAmount), "Transfer failed");
        
        emit FundsWithdrawn(owner(), withdrawAmount);
    }
    
    // Begin execution phase to allow fund withdrawal and stop new commitments
    function beginExecution() external onlyOwner targetMet {
        require(status == PoolStatus.FUNDED, "Pool must be funded");
        status = PoolStatus.EXECUTING;
        emit PoolStatusUpdated(PoolStatus.EXECUTING);
    }
    
    // Complete the pool when all activities are finished
    function completePool() external onlyOwner {
        require(status == PoolStatus.EXECUTING, "Pool must be in executing state");
        
        // Ensure all funds have been withdrawn before completion
        uint256 balance = depositToken.balanceOf(address(this));
        require(balance == 0, "Contract must be empty before completion");
        
        status = PoolStatus.COMPLETED;
        emit PoolStatusUpdated(PoolStatus.COMPLETED);
    }

    // Remove the constructor since we're using initialize
    constructor() Ownable(address(this)) {}
} 