// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunLiquidity.sol";

contract StageDotFunPool is Ownable {
    IERC20 public depositToken;
    StageDotFunLiquidity public lpToken;
    
    string public name;
    uint256 public totalDeposits;
    uint256 public revenueAccumulated;
    uint256 public endTime;
    uint256 public targetAmount;
    uint256 public minCommitment;
    
    enum PoolStatus {
        INACTIVE,
        ACTIVE,
        PAUSED,
        CLOSED
    }
    
    PoolStatus public status;
    
    struct Milestone {
        string description;
        uint256 amount;
        uint256 unlockTime;
        bool approved;
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
    event MilestoneApproved(uint256 indexed milestoneIndex);
    event MilestoneWithdrawn(uint256 indexed milestoneIndex, uint256 amount);
    event EmergencyModeEnabled();
    event EmergencyWithdrawalRequested(uint256 unlockTime);
    event EmergencyWithdrawalExecuted(uint256 amount);
    event WithdrawerAuthorized(address withdrawer);
    event WithdrawerRevoked(address withdrawer);
    
    // View functions to get all pool details in a single call
    function getPoolDetails() external view returns (
        string memory _name,
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
        string memory symbol,
        uint256 _endTime,
        address _depositToken,
        address _owner,
        uint256 _targetAmount,
        uint256 _minCommitment
    ) Ownable(_owner) {
        name = _name;
        endTime = _endTime;
        depositToken = IERC20(_depositToken);
        status = PoolStatus.ACTIVE;
        targetAmount = _targetAmount;
        minCommitment = _minCommitment;
        
        string memory tokenName = string(abi.encodePacked(_name, " LP Token"));
        lpToken = new StageDotFunLiquidity(tokenName, symbol);
    }
    
    modifier poolIsActive() {
        require(status == PoolStatus.ACTIVE, "Pool is not active");
        _;
    }
    
    modifier onlyAuthorizedWithdrawer() {
        require(msg.sender == authorizedWithdrawer, "Not authorized withdrawer");
        _;
    }
    
    function deposit(uint256 amount) external poolIsActive {
        require(amount >= minCommitment, "Amount below minimum commitment");
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
    }
    
    function receiveRevenue(uint256 amount) external poolIsActive {
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
            uint256 lpBalance = lpBalances[holder];
            if (lpBalance > 0) {
                uint256 share = (lpBalance * revenueAccumulated) / totalPoolTokens;
                require(depositToken.transfer(holder, share), "Distribution failed");
            }
        }
        
        emit RevenueDistributed(revenueAccumulated);
        revenueAccumulated = 0;
    }
    
    function setMilestones(
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256[] calldata unlockTimes
    ) external onlyOwner {
        require(
            descriptions.length == amounts.length && amounts.length == unlockTimes.length,
            "Array lengths mismatch"
        );
        
        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount <= totalDeposits, "Milestone amounts exceed deposits");
        
        for (uint i = 0; i < descriptions.length; i++) {
            require(unlockTimes[i] > block.timestamp, "Unlock time must be in future");
            milestones.push(
                Milestone({
                    description: descriptions[i],
                    amount: amounts[i],
                    unlockTime: unlockTimes[i],
                    approved: false,
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
    
    function approveMilestone(uint256 milestoneIndex) external onlyOwner {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];
        
        require(!milestone.approved, "Already approved");
        require(block.timestamp >= milestone.unlockTime, "Too early");
        
        milestone.approved = true;
        emit MilestoneApproved(milestoneIndex);
    }
    
    function withdrawMilestone(uint256 milestoneIndex) external onlyAuthorizedWithdrawer {
        require(milestoneIndex < milestones.length, "Invalid milestone index");
        Milestone storage milestone = milestones[milestoneIndex];
        
        require(milestone.approved, "Not approved");
        require(!milestone.released, "Already released");
        
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
        delete authorizedWithdrawer;
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
    
    function updateStatus(PoolStatus newStatus) external onlyOwner {
        require(status != newStatus, "Pool already in this status");
        
        if (newStatus == PoolStatus.CLOSED) {
            require(revenueAccumulated == 0, "Distribute revenue before closing");
        }
        
        status = newStatus;
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
        return lpBalances[holder];
    }

    function getLpBalances(address[] calldata holders) external view returns (uint256[] memory balances) {
        balances = new uint256[](holders.length);
        for (uint i = 0; i < holders.length; i++) {
            balances[i] = lpBalances[holders[i]];
        }
        return balances;
    }
} 