// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunLiquidity.sol";

contract StageDotFunPool is Ownable {
    IERC20 public depositToken;
    StageDotFunLiquidity public lpToken;
    
    string public name;
    string public uniqueId; // Unique identifier for the pool
    address public creator; // Creator address
    uint256 public totalDeposits;
    uint256 public revenueAccumulated;
    uint256 public endTime;
    uint256 public targetAmount;
    uint256 public minCommitment;
    bool public targetReached; // Flag to track if target has been reached
    
    enum PoolStatus {
        INACTIVE,
        ACTIVE,
        PAUSED,
        CLOSED,
        FUNDED,  // New status for when target is reached
        FAILED   // New status for when end time is reached without meeting target
    }
    
    PoolStatus public status;
    
    struct Milestone {
        string description;
        uint256 amount;
        uint256 unlockTime;
        bool released;
    }
    
    // LP Token holders
    mapping(address => uint256) public lpBalances;
    address[] public lpHolders;
    mapping(address => bool) public isLpHolder;
    
    // Milestones
    Milestone[] public milestones;
    
    // Emergency controls
    bool public emergencyMode;
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 3 days;
    uint256 public emergencyWithdrawalRequestTime;
    address public authorizedWithdrawer;
    
    // Events
    event Deposit(address indexed lp, uint256 amount);
    event RevenueReceived(uint256 amount);
    event RevenueDistributed(uint256 amount);
    event MilestoneCreated(uint256 indexed milestoneIndex, string description, uint256 amount, uint256 unlockTime);
    event MilestoneWithdrawn(uint256 indexed milestoneIndex, uint256 amount);
    event EmergencyModeEnabled();
    event EmergencyWithdrawalRequested(uint256 unlockTime);
    event EmergencyWithdrawalExecuted(uint256 amount);
    event WithdrawerAuthorized(address withdrawer);
    event WithdrawerRevoked(address withdrawer);
    event TargetReached(uint256 totalAmount);
    event FundsReturned(address indexed lp, uint256 amount);
    event PoolStatusUpdated(PoolStatus newStatus);
    event PoolNameUpdated(string oldName, string newName);
    event MinCommitmentUpdated(uint256 oldMinCommitment, uint256 newMinCommitment);
    
    // View functions to get all pool details in a single call
    function getPoolDetails() external view returns (
        string memory _name,
        string memory _uniqueId,
        address _creator,
        uint256 _totalDeposits,
        uint256 _revenueAccumulated,
        uint256 _endTime,
        uint256 _targetAmount,
        uint256 _minCommitment,
        uint8 _status,
        address _lpTokenAddress,
        address[] memory _lpHolders,
        Milestone[] memory _milestones,
        bool _emergencyMode,
        uint256 _emergencyWithdrawalRequestTime,
        address _authorizedWithdrawer
    ) {
        return (
            name,
            uniqueId,
            creator,
            totalDeposits,
            revenueAccumulated,
            endTime,
            targetAmount,
            minCommitment,
            uint8(status),
            address(lpToken),
            lpHolders,
            milestones,
            emergencyMode,
            emergencyWithdrawalRequestTime,
            authorizedWithdrawer
        );
    }
    
    constructor(
        string memory _name,
        string memory _uniqueId,
        string memory symbol,
        uint256 _endTime,
        address _depositToken,
        address _owner,
        address _creator,
        uint256 _targetAmount,
        uint256 _minCommitment
    ) Ownable(_owner) {
        name = _name;
        uniqueId = _uniqueId;
        creator = _creator;
        endTime = _endTime;
        depositToken = IERC20(_depositToken);
        status = PoolStatus.ACTIVE;
        targetAmount = _targetAmount;
        minCommitment = _minCommitment;
        targetReached = false;
        authorizedWithdrawer = _owner; // Set owner as authorized withdrawer by default
        
        string memory tokenName = string(abi.encodePacked(_name, " LP Token"));
        lpToken = new StageDotFunLiquidity(tokenName, symbol);
        
        // Create default milestone for the entire target amount
        // This milestone will be available when target is reached
        string[] memory descriptions = new string[](1);
        descriptions[0] = "Default milestone";
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = _targetAmount;
        uint256[] memory unlockTimes = new uint256[](1);
        unlockTimes[0] = block.timestamp; // Immediately available once target is reached
        
        _createMilestones(descriptions, amounts, unlockTimes);
    }
    
    modifier poolIsActive() {
        require(status == PoolStatus.ACTIVE, "Pool is not active");
        _;
    }
    
    modifier onlyAuthorizedWithdrawer() {
        require(msg.sender == authorizedWithdrawer, "Not authorized withdrawer");
        _;
    }
    
    modifier targetMet() {
        require(targetReached, "Target amount not reached");
        _;
    }
    
    // Check if pool conditions need to be updated
    function _checkPoolConditions() internal {
        // Check if target has been reached
        if (!targetReached && totalDeposits >= targetAmount) {
            targetReached = true;
            status = PoolStatus.FUNDED;
            emit TargetReached(totalDeposits);
            emit PoolStatusUpdated(PoolStatus.FUNDED);
        }
        
        // Check if end time has passed and target not met
        if (block.timestamp > endTime && !targetReached && status == PoolStatus.ACTIVE) {
            status = PoolStatus.FAILED;
            emit PoolStatusUpdated(PoolStatus.FAILED);
        }
    }
    
    function deposit(uint256 amount) external poolIsActive {
        require(amount >= minCommitment, "Amount below minimum commitment");
        require(block.timestamp <= endTime, "Pool funding period has ended");
        require(totalDeposits + amount <= targetAmount, "Would exceed target amount");
        require(depositToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        lpToken.mint(msg.sender, amount);
        totalDeposits += amount;
        lpBalances[msg.sender] += amount;
        
        if (!isLpHolder[msg.sender]) {
            lpHolders.push(msg.sender);
            isLpHolder[msg.sender] = true;
        }
        
        emit Deposit(msg.sender, amount);
        
        // Check if this deposit reached the target
        _checkPoolConditions();
    }
    
    // Allow LPs to claim their funds back if the pool failed to meet its target
    function claimRefund() external {
        require(status == PoolStatus.FAILED, "Pool has not failed");
        
        // Check LP token balance directly from the token contract
        uint256 lpBalance = lpToken.balanceOf(msg.sender);
        require(lpBalance > 0, "No LP tokens to refund");
        
        // Burn LP tokens
        lpToken.burn(msg.sender, lpBalance);
        
        // Update internal tracking
        if (isLpHolder[msg.sender]) {
            lpBalances[msg.sender] = 0;
        }
        
        // Return USDC
        require(depositToken.transfer(msg.sender, lpBalance), "Refund transfer failed");
        
        emit FundsReturned(msg.sender, lpBalance);
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
        
        for (uint i = 0; i < lpHolders.length; i++) {
            address holder = lpHolders[i];
            uint256 lpBalance = lpToken.balanceOf(holder);
            if (lpBalance > 0) {
                uint256 share = (lpBalance * revenueAccumulated) / totalPoolTokens;
                require(depositToken.transfer(holder, share), "Distribution failed");
            }
        }
        
        emit RevenueDistributed(revenueAccumulated);
        revenueAccumulated = 0;
    }
    
    // Internal function to create milestones
    function _createMilestones(
        string[] memory descriptions,
        uint256[] memory amounts,
        uint256[] memory unlockTimes
    ) internal {
        require(
            descriptions.length == amounts.length && amounts.length == unlockTimes.length,
            "Array lengths mismatch"
        );
        
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        for (uint i = 0; i < descriptions.length; i++) {
            milestones.push(
                Milestone({
                    description: descriptions[i],
                    amount: amounts[i],
                    unlockTime: unlockTimes[i],
                    released: false
                })
            );
            emit MilestoneCreated(
                milestones.length - 1,
                descriptions[i],
                amounts[i],
                unlockTimes[i]
            );
        }
    }
    
    // Allow owner to set additional milestones
    function setAdditionalMilestones(
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256[] calldata unlockTimes
    ) external onlyOwner {
        require(milestones.length > 0, "Cannot replace default milestone");
        
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        // Check if the total of all milestones (existing + new) doesn't exceed target
        uint256 existingTotal = 0;
        for (uint i = 0; i < milestones.length; i++) {
            if (!milestones[i].released) {
                existingTotal += milestones[i].amount;
            }
        }
        
        require(existingTotal + totalAmount <= targetAmount, "Milestone amounts exceed target");
        
        _createMilestones(descriptions, amounts, unlockTimes);
    }
    
    // Replace the default milestone with custom milestones
    function replaceDefaultMilestone(
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256[] calldata unlockTimes
    ) external onlyOwner {
        require(milestones.length == 1, "Default milestone already replaced");
        require(!milestones[0].released, "Default milestone already released");
        
        // Delete the default milestone
        delete milestones;
        
        // Create new milestones
        _createMilestones(descriptions, amounts, unlockTimes);
    }
    
    // Withdraw a milestone - only if target is reached and unlock time has passed
    function withdrawMilestone(uint256 milestoneIndex) external onlyAuthorizedWithdrawer targetMet {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];
        
        require(!milestone.released, "Already released");
        require(block.timestamp >= milestone.unlockTime, "Too early");
        
        milestone.released = true;
        require(depositToken.transfer(msg.sender, milestone.amount), "Transfer failed");
        
        emit MilestoneWithdrawn(milestoneIndex, milestone.amount);
    }
    
    function setAuthorizedWithdrawer(address _withdrawer) external onlyOwner {
        require(_withdrawer != address(0), "Invalid withdrawer address");
        authorizedWithdrawer = _withdrawer;
        emit WithdrawerAuthorized(_withdrawer);
    }
    
    function revokeAuthorizedWithdrawer() external onlyOwner {
        address oldWithdrawer = authorizedWithdrawer;
        authorizedWithdrawer = owner(); // Reset to owner instead of deleting
        emit WithdrawerRevoked(oldWithdrawer);
    }
    
    function enableEmergencyMode() external onlyOwner {
        require(!emergencyMode, "Emergency mode already enabled");
        emergencyMode = true;
        emit EmergencyModeEnabled();
    }
    
    function requestEmergencyWithdrawal() external onlyOwner {
        require(emergencyMode, "Emergency mode not enabled");
        require(emergencyWithdrawalRequestTime == 0, "Emergency withdrawal already requested");
        
        emergencyWithdrawalRequestTime = block.timestamp + EMERGENCY_WITHDRAWAL_DELAY;
        emit EmergencyWithdrawalRequested(emergencyWithdrawalRequestTime);
    }
    
    function executeEmergencyWithdrawal() external onlyOwner {
        require(emergencyMode, "Emergency mode not enabled");
        require(
            emergencyWithdrawalRequestTime > 0 &&
                block.timestamp >= emergencyWithdrawalRequestTime,
            "Emergency withdrawal not ready"
        );
        
        uint256 remainingBalance = totalDeposits;
        
        // Reset all milestones
        delete milestones;
        
        // Transfer remaining funds back to owner
        if (remainingBalance > 0) {
            require(depositToken.transfer(owner(), remainingBalance), "Emergency transfer failed");
            emit EmergencyWithdrawalExecuted(remainingBalance);
        }
        
        // Reset emergency state
        delete emergencyWithdrawalRequestTime;
        delete emergencyMode;
    }
    
    // Check if end time has passed without meeting target
    function checkPoolStatus() external {
        _checkPoolConditions();
    }
    
    function updateStatus(PoolStatus newStatus) external onlyOwner {
        require(status != newStatus, "Pool already in this status");
        
        if (newStatus == PoolStatus.CLOSED) {
            require(revenueAccumulated == 0, "Distribute revenue before closing");
        }
        
        status = newStatus;
        emit PoolStatusUpdated(newStatus);
    }
    
    // View functions
    function getLpHolders() external view returns (address[] memory) {
        return lpHolders;
    }
    
    function getMilestones() external view returns (Milestone[] memory) {
        return milestones;
    }
    
    function getEmergencyStatus()
        external
        view
        returns (bool isEmergency, uint256 withdrawalUnlockTime, bool canExecuteWithdrawal)
    {
        isEmergency = emergencyMode;
        withdrawalUnlockTime = emergencyWithdrawalRequestTime;
        canExecuteWithdrawal =
            emergencyMode &&
            withdrawalUnlockTime > 0 &&
            block.timestamp >= withdrawalUnlockTime;
    }

    function getLpBalance(address holder) external view returns (uint256) {
        return lpToken.balanceOf(holder);
    }

    // Get LP balances with pagination support
    // If both startIndex and endIndex are 0, returns all LP holders
    function getLpBalances(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (
        address[] memory holders,
        uint256[] memory balances
    ) {
        uint256 holderCount = lpHolders.length;
        
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
            address holder = lpHolders[holderIndex];
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
    
    // Update minimum commitment - only owner can call this
    function updateMinCommitment(uint256 _newMinCommitment) external onlyOwner {
        require(_newMinCommitment > 0, "Min commitment must be greater than 0");
        uint256 oldMinCommitment = minCommitment;
        minCommitment = _newMinCommitment;
        emit MinCommitmentUpdated(oldMinCommitment, _newMinCommitment);
    }
} 