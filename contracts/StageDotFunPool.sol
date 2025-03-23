// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunLiquidity.sol";
import "./StageDotFunNFT.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract StageDotFunPool is Ownable {
    // Constants
    uint256 public constant MAX_TIERS = 10;
    uint256 public constant REVENUE_UPDATE_INTERVAL = 1 days;
    
    // State variables
    IERC20 public depositToken;
    StageDotFunLiquidity public lpToken;
    StageDotFunNFT public nftContract;
    
    string public name;
    string public uniqueId;
    address public creator;
    uint256 public totalDeposits;
    uint256 public revenueAccumulated;
    uint256 public endTime;
    uint256 public targetAmount;
    uint256 public capAmount;
    bool public targetReached;
    bool public capReached;
    
    // Revenue tracking
    uint256 public totalRevenue;
    uint256 public lastRevenueUpdate;
    
    // Revenue distribution tracking
    mapping(address => uint256) public lastRevenueClaim;
    mapping(address => uint256) public unclaimedRevenue;
    
    enum PoolStatus {
        INACTIVE,
        ACTIVE,
        PAUSED,
        CLOSED,
        FUNDED,  // When target is reached
        FULLY_FUNDED, // When cap is reached
        FAILED   // When end time is reached without meeting target
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
    
    struct RewardItem {
        string name;
        string description;
        string itemType; // "NFT", "MERCH", "TICKET"
        string metadata;
        uint256 quantity;
        bool isClaimed; // Track if this reward has been claimed
    }
    
    // Mapping from tier ID to Tier struct
    mapping(uint256 => Tier) public tiers;
    uint256 public tierCount;
    
    // Mapping from user to their tier commitments
    mapping(address => uint256[]) public userTierCommitments;
    
    // Track all users who have committed to any tier
    address[] private committedUsers;
    mapping(address => bool) private isCommittedUser;
    
    // LP Token holders
    mapping(address => uint256) public lpBalances;
    address[] public lpHolders;
    mapping(address => bool) public isLpHolder;
    
    // Track NFT claims
    mapping(address => mapping(uint256 => bool)) public hasClaimedNFT;
    mapping(uint256 => uint256) public tierNFTSupply; // tierId => current supply
    
    // Events
    event TierCreated(uint256 indexed tierId, string name, uint256 price);
    event TierUpdated(uint256 indexed tierId, string name, uint256 price);
    event TierDeactivated(uint256 indexed tierId);
    event TierActivated(uint256 indexed tierId);
    event RewardItemAdded(uint256 indexed tierId, string name, string itemType);
    event TierCommitted(address indexed user, uint256 indexed tierId, uint256 amount);
    event TargetReached(uint256 totalAmount);
    event CapReached(uint256 totalAmount);
    event FundsReturned(address indexed lp, uint256 amount);
    event PoolStatusUpdated(PoolStatus newStatus);
    event Deposit(address indexed lp, uint256 amount);
    event RevenueReceived(uint256 amount);
    event RevenueDistributed(uint256 amount);
    event PoolNameUpdated(string oldName, string newName);
    event NFTClaimed(address indexed user, uint256 indexed tierId, uint256 tokenId);
    event NFTsMintedForTier(uint256 indexed tierId, uint256 count);
    event LPTransfer(address indexed from, address indexed to, uint256 amount);
    
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
        address _nftImplementation
    ) external initializer {
        name = _name;
        uniqueId = _uniqueId;
        creator = _creator;
        endTime = _endTime;
        depositToken = IERC20(_depositToken);
        status = PoolStatus.ACTIVE;
        targetAmount = _targetAmount;
        capAmount = _capAmount;
        targetReached = false;
        capReached = false;
        
        string memory tokenName = string(abi.encodePacked(_name, " LP Token"));
        lpToken = StageDotFunLiquidity(Clones.clone(_lpTokenImplementation));
        lpToken.initialize(tokenName, symbol);
        
        // Deploy NFT contract for this pool with new naming convention
        nftContract = StageDotFunNFT(
            Clones.clone(_nftImplementation)
        );
        nftContract.initialize(
            string(abi.encodePacked(_name, "Patron")),
            string(abi.encodePacked(symbol, "P")),
            _owner
        );
        
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
        require(targetReached, "Target amount not reached");
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
        require(_price > 0, "Price must be greater than 0");
        
        if (_isVariablePrice) {
            require(_minPrice > 0, "Min price must be greater than 0");
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
        require(_price > 0, "Price must be greater than 0");
        
        if (_isVariablePrice) {
            require(_minPrice > 0, "Min price must be greater than 0");
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
        require(status == PoolStatus.ACTIVE, "Pool not active");
        require(!targetReached, "Pool already funded");
        require(block.timestamp <= endTime, "Pool ended");
        require(totalDeposits + amount <= capAmount, "Exceeds cap");
        
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
        
        // Mint LP tokens to user
        uint256 lpAmount = (amount * totalDeposits) / totalDeposits;
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
        userTierCommitments[msg.sender].push(tierId);
        
        // Mint NFT for the tier
        if (bytes(tier.nftMetadata).length > 0) {
            nftContract.mintNFT(msg.sender, tier.nftMetadata);
        }
        
        emit TierCommitted(msg.sender, tierId, amount);
        
        // Check pool conditions
        _checkPoolStatus();
    }
    
    function receiveRevenue(uint256 amount) external {
        require(status == PoolStatus.FUNDED || status == PoolStatus.ACTIVE, "Pool not in valid state for revenue");
        require(
            depositToken.transferFrom(msg.sender, address(this), amount),
            "Revenue transfer failed"
        );
        revenueAccumulated += amount;
        
        emit RevenueReceived(amount);
    }
    
    function distributeRevenue() external onlyOwner {
        require(revenueAccumulated > 0, "No revenue to distribute");
        require(status != PoolStatus.INACTIVE, "Pool not yet started");
        
        uint256 totalPoolTokens = totalDeposits;
        require(totalPoolTokens > 0, "No LP tokens in pool");
        
        // Get all holders from the LP token contract
        address[] memory holders = lpToken.getHolders();
        
        // Distribute revenue to holders
        for (uint256 i = 0; i < holders.length; i++) {
            address holder = holders[i];
            uint256 lpBalance = lpToken.balanceOf(holder);
            if (lpBalance > 0) {
                uint256 share = (lpBalance * revenueAccumulated) / totalPoolTokens;
                require(depositToken.transfer(holder, share), "Distribution failed");
            }
        }
        
        emit RevenueDistributed(revenueAccumulated);
        revenueAccumulated = 0;
    }
    
    // View functions
    function getTier(uint256 tierId) external view returns (Tier memory) {
        require(tierId < tierCount, "Tier does not exist");
        return tiers[tierId];
    }
    
    function getUserTierCommitments(address user) external view returns (uint256[] memory) {
        return userTierCommitments[user];
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
        uint256 _tierCount
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
            tierCount
        );
    }

    function _checkPoolStatus() internal {
        // Check if target has been reached
        if (!targetReached && totalDeposits >= targetAmount) {
            status = PoolStatus.FUNDED;
            emit TargetReached(totalDeposits);
            emit PoolStatusUpdated(PoolStatus.FUNDED);
        }
        
        // Check if end time has passed and target not met
        if (block.timestamp > endTime && !targetReached && status == PoolStatus.ACTIVE) {
            status = PoolStatus.FAILED;
            emit PoolStatusUpdated(PoolStatus.FAILED);
        }
        
        // Check if cap reached
        if (totalDeposits >= capAmount) {
            status = PoolStatus.FUNDED;
            emit CapReached(totalDeposits);
            emit PoolStatusUpdated(PoolStatus.FUNDED);
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
        
        // Return USDC
        require(depositToken.transfer(msg.sender, lpBalance), "Refund transfer failed");
        
        emit FundsReturned(msg.sender, lpBalance);
    }

    // Remove the constructor since we're using initialize
    constructor() Ownable(address(this)) {}
} 