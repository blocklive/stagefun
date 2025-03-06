// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunLiquidity.sol";

contract StageDotFunPool is Ownable {
    IERC20 public depositToken;

    enum PoolStatus {
        INACTIVE, // Not yet started
        ACTIVE, // Accepting deposits and revenue
        PAUSED, // Temporarily paused
        CLOSED // No longer accepting deposits
    }

    struct Pool {
        string name;
        uint256 totalDeposits;
        uint256 revenueAccumulated;
        mapping(address => uint256) lpBalances;
        address[] lpHolders;
        mapping(address => bool) isLpHolder;
        PoolStatus status;
        bool exists;
        StageDotFunLiquidity lpToken;
        uint256 endTime;
    }

    struct PoolInfo {
        string name;
        uint256 totalDeposits;
        uint256 revenueAccumulated;
        uint256 lpHolderCount;
        PoolStatus status;
        bool exists;
        address lpTokenAddress;
        uint256 endTime;
    }

    mapping(bytes32 => Pool) public pools;
    bytes32[] public poolIds;

    event PoolCreated(bytes32 indexed poolId, string name, address lpTokenAddress);
    event PoolStatusUpdated(bytes32 indexed poolId, PoolStatus status);
    event Deposit(bytes32 indexed poolId, address indexed lp, uint256 amount);
    event RevenueReceived(bytes32 indexed poolId, uint256 amount);
    event RevenueDistributed(bytes32 indexed poolId, uint256 amount);

    struct Milestone {
        string description;
        uint256 amount;
        uint256 unlockTime;
        bool approved;
        bool released;
    }

    mapping(bytes32 => address) public authorizedWithdrawers;
    mapping(bytes32 => Milestone[]) public poolMilestones;

    event WithdrawerAuthorized(bytes32 indexed poolId, address withdrawer);
    event WithdrawerRevoked(bytes32 indexed poolId, address withdrawer);
    event MilestoneCreated(
        bytes32 indexed poolId,
        uint256 indexed milestoneIndex,
        string description,
        uint256 amount,
        uint256 unlockTime
    );
    event MilestoneApproved(bytes32 indexed poolId, uint256 indexed milestoneIndex);
    event MilestoneWithdrawn(
        bytes32 indexed poolId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );

    event MilestoneAdded(
        bytes32 indexed poolId,
        uint256 indexed milestoneIndex,
        string description,
        uint256 amount,
        uint256 unlockTime
    );
    event MilestoneRemoved(bytes32 indexed poolId, uint256 indexed milestoneIndex);

    modifier onlyAuthorizedWithdrawer(bytes32 poolId) {
        require(msg.sender == authorizedWithdrawers[poolId], "Not authorized withdrawer");
        _;
    }

    constructor(address _depositToken) Ownable(msg.sender) {
        depositToken = IERC20(_depositToken);
    }

    modifier poolExists(bytes32 poolId) {
        require(pools[poolId].exists, "Pool does not exist");
        _;
    }

    modifier poolIsActive(bytes32 poolId) {
        require(pools[poolId].status == PoolStatus.ACTIVE, "Pool is not active");
        _;
    }

    function createPool(
        string memory name, 
        string memory symbol,
        uint256 endTime
    ) external onlyOwner {
        bytes32 poolId = keccak256(abi.encodePacked(name));
        require(!pools[poolId].exists, "Pool already exists");
        require(endTime > block.timestamp, "End time must be in future");

        string memory tokenName = string(abi.encodePacked(name, " LP Token"));
        StageDotFunLiquidity lpToken = new StageDotFunLiquidity(tokenName, symbol);
        
        Pool storage newPool = pools[poolId];
        newPool.name = name;
        newPool.status = PoolStatus.ACTIVE;
        newPool.exists = true;
        newPool.lpToken = lpToken;
        newPool.endTime = endTime;
        poolIds.push(poolId);

        emit PoolCreated(poolId, name, address(lpToken));
    }

    function updatePoolStatus(
        bytes32 poolId,
        PoolStatus newStatus
    ) external onlyOwner poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.status != newStatus, "Pool already in this status");

        // Additional checks based on status transition
        if (newStatus == PoolStatus.CLOSED) {
            require(pool.revenueAccumulated == 0, "Distribute revenue before closing");
        }

        pool.status = newStatus;
        emit PoolStatusUpdated(poolId, newStatus);
    }

    function deposit(
        bytes32 poolId,
        uint256 amount
    ) external poolExists(poolId) poolIsActive(poolId) {
        Pool storage pool = pools[poolId];
        require(depositToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        pool.lpToken.mint(msg.sender, amount);
        pool.totalDeposits += amount;
        pool.lpBalances[msg.sender] += amount;

        if (!pool.isLpHolder[msg.sender]) {
            pool.lpHolders.push(msg.sender);
            pool.isLpHolder[msg.sender] = true;
        }

        emit Deposit(poolId, msg.sender, amount);
    }

    function receiveRevenue(
        bytes32 poolId,
        uint256 amount
    ) external poolExists(poolId) poolIsActive(poolId) {
        Pool storage pool = pools[poolId];
        require(
            depositToken.transferFrom(msg.sender, address(this), amount),
            "Revenue transfer failed"
        );
        pool.revenueAccumulated += amount;

        emit RevenueReceived(poolId, amount);
    }

    function distributeRevenue(bytes32 poolId) external onlyOwner poolExists(poolId) {
        Pool storage pool = pools[poolId];
        require(pool.revenueAccumulated > 0, "No revenue to distribute");
        require(pool.status != PoolStatus.INACTIVE, "Pool not yet started");

        uint256 totalPoolTokens = pool.totalDeposits;
        require(totalPoolTokens > 0, "No LP tokens in pool");

        for (uint i = 0; i < pool.lpHolders.length; i++) {
            address holder = pool.lpHolders[i];
            uint256 lpBalance = pool.lpBalances[holder];
            if (lpBalance > 0) {
                uint256 share = (lpBalance * pool.revenueAccumulated) / totalPoolTokens;
                require(depositToken.transfer(holder, share), "Distribution failed");
            }
        }

        emit RevenueDistributed(poolId, pool.revenueAccumulated);
        pool.revenueAccumulated = 0;
    }

    function getPool(bytes32 poolId) external view returns (PoolInfo memory) {
        require(pools[poolId].exists, "Pool does not exist");
        Pool storage pool = pools[poolId];

        return PoolInfo({
            name: pool.name,
            totalDeposits: pool.totalDeposits,
            revenueAccumulated: pool.revenueAccumulated,
            lpHolderCount: pool.lpHolders.length,
            status: pool.status,
            exists: pool.exists,
            lpTokenAddress: address(pool.lpToken),
            endTime: pool.endTime
        });
    }

    function getPoolId(string memory name) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(name));
    }

    function getPoolLpHolders(bytes32 poolId) external view returns (address[] memory) {
        require(pools[poolId].exists, "Pool does not exist");
        return pools[poolId].lpHolders;
    }

    function getAllPools() external view returns (bytes32[] memory) {
        return poolIds;
    }

    function getPoolBalance(bytes32 poolId, address lp) external view returns (uint256) {
        require(pools[poolId].exists, "Pool does not exist");
        return pools[poolId].lpBalances[lp];
    }

    function getPools() external view returns (PoolInfo[] memory) {
        PoolInfo[] memory allPools = new PoolInfo[](poolIds.length);

        for (uint i = 0; i < poolIds.length; i++) {
            bytes32 poolId = poolIds[i];
            Pool storage pool = pools[poolId];

            allPools[i] = PoolInfo({
                name: pool.name,
                totalDeposits: pool.totalDeposits,
                revenueAccumulated: pool.revenueAccumulated,
                lpHolderCount: pool.lpHolders.length,
                status: pool.status,
                exists: pool.exists,
                lpTokenAddress: address(pool.lpToken),
                endTime: pool.endTime
            });
        }

        return allPools;
    }

    function setAuthorizedWithdrawer(
        bytes32 poolId,
        address withdrawer
    ) external onlyOwner poolExists(poolId) {
        require(withdrawer != address(0), "Invalid withdrawer address");
        authorizedWithdrawers[poolId] = withdrawer;
        emit WithdrawerAuthorized(poolId, withdrawer);
    }

    function revokeAuthorizedWithdrawer(bytes32 poolId) external onlyOwner poolExists(poolId) {
        address oldWithdrawer = authorizedWithdrawers[poolId];
        delete authorizedWithdrawers[poolId];
        emit WithdrawerRevoked(poolId, oldWithdrawer);
    }

    function setMilestones(
        bytes32 poolId,
        string[] calldata descriptions,
        uint256[] calldata amounts,
        uint256[] calldata unlockTimes
    ) external onlyOwner poolExists(poolId) {
        require(
            descriptions.length == amounts.length && amounts.length == unlockTimes.length,
            "Array lengths mismatch"
        );

        uint256 totalAmount = 0;
        for (uint i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(totalAmount <= pools[poolId].totalDeposits, "Milestone amounts exceed deposits");

        for (uint i = 0; i < descriptions.length; i++) {
            require(unlockTimes[i] > block.timestamp, "Unlock time must be in future");
            poolMilestones[poolId].push(
                Milestone({
                    description: descriptions[i],
                    amount: amounts[i],
                    unlockTime: unlockTimes[i],
                    approved: false,
                    released: false
                })
            );
            emit MilestoneCreated(
                poolId,
                poolMilestones[poolId].length - 1,
                descriptions[i],
                amounts[i],
                unlockTimes[i]
            );
        }
    }

    function approveMilestone(
        bytes32 poolId,
        uint256 milestoneIndex
    ) external onlyOwner poolExists(poolId) {
        require(milestoneIndex < poolMilestones[poolId].length, "Invalid milestone index");
        Milestone storage milestone = poolMilestones[poolId][milestoneIndex];

        require(!milestone.approved, "Already approved");
        require(block.timestamp >= milestone.unlockTime, "Too early");

        milestone.approved = true;
        emit MilestoneApproved(poolId, milestoneIndex);
    }

    function withdrawMilestone(
        bytes32 poolId,
        uint256 milestoneIndex
    ) external poolExists(poolId) onlyAuthorizedWithdrawer(poolId) {
        require(milestoneIndex < poolMilestones[poolId].length, "Invalid milestone index");
        Milestone storage milestone = poolMilestones[poolId][milestoneIndex];

        require(milestone.approved, "Not approved");
        require(!milestone.released, "Already released");

        milestone.released = true;
        require(depositToken.transfer(msg.sender, milestone.amount), "Transfer failed");

        emit MilestoneWithdrawn(poolId, milestoneIndex, milestone.amount);
    }

    function getMilestones(bytes32 poolId) external view returns (Milestone[] memory) {
        return poolMilestones[poolId];
    }

    function getAuthorizedWithdrawer(bytes32 poolId) external view returns (address) {
        return authorizedWithdrawers[poolId];
    }

    // New state variables
    mapping(bytes32 => bool) public emergencyMode;
    uint256 public constant EMERGENCY_WITHDRAWAL_DELAY = 3 days;
    mapping(bytes32 => uint256) public emergencyWithdrawalRequests;

    // New events
    event EmergencyModeEnabled(bytes32 indexed poolId);
    event EmergencyWithdrawalRequested(bytes32 indexed poolId, uint256 unlockTime);
    event EmergencyWithdrawalExecuted(bytes32 indexed poolId, uint256 amount);
    event MilestoneModified(
        bytes32 indexed poolId,
        uint256 indexed milestoneIndex,
        string newDescription,
        uint256 newAmount,
        uint256 newUnlockTime
    );

    // Emergency functions
    function enableEmergencyMode(bytes32 poolId) external onlyOwner poolExists(poolId) {
        require(!emergencyMode[poolId], "Emergency mode already enabled");
        emergencyMode[poolId] = true;
        emit EmergencyModeEnabled(poolId);
    }

    function requestEmergencyWithdrawal(bytes32 poolId) external onlyOwner poolExists(poolId) {
        require(emergencyMode[poolId], "Emergency mode not enabled");
        require(emergencyWithdrawalRequests[poolId] == 0, "Emergency withdrawal already requested");

        emergencyWithdrawalRequests[poolId] = block.timestamp + EMERGENCY_WITHDRAWAL_DELAY;
        emit EmergencyWithdrawalRequested(poolId, emergencyWithdrawalRequests[poolId]);
    }

    function executeEmergencyWithdrawal(bytes32 poolId) external onlyOwner poolExists(poolId) {
        require(emergencyMode[poolId], "Emergency mode not enabled");
        require(
            emergencyWithdrawalRequests[poolId] > 0 &&
                block.timestamp >= emergencyWithdrawalRequests[poolId],
            "Emergency withdrawal not ready"
        );

        Pool storage pool = pools[poolId];
        uint256 remainingBalance = pool.totalDeposits;

        // Reset all milestones
        delete poolMilestones[poolId];

        // Transfer remaining funds back to owner
        if (remainingBalance > 0) {
            require(depositToken.transfer(owner(), remainingBalance), "Emergency transfer failed");
            emit EmergencyWithdrawalExecuted(poolId, remainingBalance);
        }

        // Reset emergency state
        delete emergencyWithdrawalRequests[poolId];
        delete emergencyMode[poolId];
    }

    // Milestone modification functions
    function modifyMilestone(
        bytes32 poolId,
        uint256 milestoneIndex,
        string calldata newDescription,
        uint256 newAmount,
        uint256 newUnlockTime
    ) external onlyOwner poolExists(poolId) {
        require(milestoneIndex < poolMilestones[poolId].length, "Invalid milestone index");
        Milestone storage milestone = poolMilestones[poolId][milestoneIndex];

        require(!milestone.approved, "Cannot modify approved milestone");
        require(!milestone.released, "Cannot modify released milestone");
        require(newUnlockTime > block.timestamp, "New unlock time must be in future");

        // Calculate new total amount
        uint256 totalAmount = 0;
        for (uint i = 0; i < poolMilestones[poolId].length; i++) {
            if (i == milestoneIndex) {
                totalAmount += newAmount;
            } else {
                totalAmount += poolMilestones[poolId][i].amount;
            }
        }
        require(
            totalAmount <= pools[poolId].totalDeposits,
            "New milestone amounts exceed deposits"
        );

        // Update milestone
        milestone.description = newDescription;
        milestone.amount = newAmount;
        milestone.unlockTime = newUnlockTime;

        emit MilestoneModified(poolId, milestoneIndex, newDescription, newAmount, newUnlockTime);
    }

    function addMilestone(
        bytes32 poolId,
        string calldata description,
        uint256 amount,
        uint256 unlockTime
    ) external onlyOwner poolExists(poolId) {
        require(unlockTime > block.timestamp, "Unlock time must be in future");

        // Calculate total amount including new milestone
        uint256 totalAmount = amount;
        for (uint i = 0; i < poolMilestones[poolId].length; i++) {
            totalAmount += poolMilestones[poolId][i].amount;
        }
        require(totalAmount <= pools[poolId].totalDeposits, "Milestone amounts exceed deposits");

        uint256 newIndex = poolMilestones[poolId].length;
        poolMilestones[poolId].push(
            Milestone({
                description: description,
                amount: amount,
                unlockTime: unlockTime,
                approved: false,
                released: false
            })
        );

        emit MilestoneAdded(poolId, newIndex, description, amount, unlockTime);
    }

    function removeMilestone(
        bytes32 poolId,
        uint256 milestoneIndex
    ) external onlyOwner poolExists(poolId) {
        require(milestoneIndex < poolMilestones[poolId].length, "Invalid milestone index");
        Milestone storage milestone = poolMilestones[poolId][milestoneIndex];

        require(!milestone.approved, "Cannot remove approved milestone");
        require(!milestone.released, "Cannot remove released milestone");

        // Remove milestone by shifting array
        for (uint i = milestoneIndex; i < poolMilestones[poolId].length - 1; i++) {
            poolMilestones[poolId][i] = poolMilestones[poolId][i + 1];
        }
        poolMilestones[poolId].pop();

        emit MilestoneRemoved(poolId, milestoneIndex);
    }

    // Additional view functions
    function getEmergencyStatus(
        bytes32 poolId
    )
        external
        view
        returns (bool isEmergencyMode, uint256 withdrawalUnlockTime, bool canExecuteWithdrawal)
    {
        isEmergencyMode = emergencyMode[poolId];
        withdrawalUnlockTime = emergencyWithdrawalRequests[poolId];
        canExecuteWithdrawal =
            emergencyMode[poolId] &&
            withdrawalUnlockTime > 0 &&
            block.timestamp >= withdrawalUnlockTime;
    }} 