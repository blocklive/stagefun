// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PoolCommitment
 * @dev Contract for committing USDC to pools
 */
contract PoolCommitment is Ownable, ReentrancyGuard {
    // USDC token contract
    IERC20 public usdcToken;
    
    // Pool structure
    struct Pool {
        string id;
        address creator;
        uint256 targetAmount;
        uint256 raisedAmount;
        bool active;
    }
    
    // Commitment structure
    struct Commitment {
        address user;
        uint256 amount;
        bool verified;
    }
    
    // Mapping from pool ID to Pool
    mapping(string => Pool) public pools;
    
    // Mapping from pool ID to array of commitments
    mapping(string => Commitment[]) public commitments;
    
    // Mapping from user address to their commitments per pool
    mapping(address => mapping(string => uint256)) public userCommitments;
    
    // Events
    event PoolCreated(string poolId, address creator, uint256 targetAmount);
    event CommitmentMade(string poolId, address user, uint256 amount);
    event CommitmentVerified(string poolId, address user);
    event FundsWithdrawn(string poolId, address recipient, uint256 amount);
    
    /**
     * @dev Constructor sets the USDC token address and the contract owner
     * @param _usdcToken Address of the USDC token contract
     */
    constructor(address _usdcToken) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
    }
    
    /**
     * @dev Creates a new pool
     * @param _poolId Unique identifier for the pool
     * @param _targetAmount Target amount to raise in USDC
     */
    function createPool(string memory _poolId, uint256 _targetAmount) external {
        require(pools[_poolId].creator == address(0), "Pool already exists");
        require(_targetAmount > 0, "Target amount must be greater than 0");
        
        pools[_poolId] = Pool({
            id: _poolId,
            creator: msg.sender,
            targetAmount: _targetAmount,
            raisedAmount: 0,
            active: true
        });
        
        emit PoolCreated(_poolId, msg.sender, _targetAmount);
    }
    
    /**
     * @dev Allows a user to commit USDC to a pool
     * @param _poolId ID of the pool to commit to
     * @param _amount Amount of USDC to commit
     */
    function commitToPool(string memory _poolId, uint256 _amount) external nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.creator != address(0), "Pool does not exist");
        require(pool.active, "Pool is not active");
        require(_amount > 0, "Amount must be greater than 0");
        
        // Transfer USDC from user to contract
        require(usdcToken.transferFrom(msg.sender, address(this), _amount), "USDC transfer failed");
        
        // Update pool raised amount
        pool.raisedAmount += _amount;
        
        // Add commitment to the pool
        commitments[_poolId].push(Commitment({
            user: msg.sender,
            amount: _amount,
            verified: false
        }));
        
        // Update user commitment
        userCommitments[msg.sender][_poolId] += _amount;
        
        emit CommitmentMade(_poolId, msg.sender, _amount);
    }
    
    /**
     * @dev Verifies a user's commitment to a pool
     * @param _poolId ID of the pool
     * @param _userIndex Index of the user in the commitments array
     */
    function verifyCommitment(string memory _poolId, uint256 _userIndex) external onlyOwner {
        require(pools[_poolId].creator != address(0), "Pool does not exist");
        require(_userIndex < commitments[_poolId].length, "Invalid user index");
        
        Commitment storage commitment = commitments[_poolId][_userIndex];
        require(!commitment.verified, "Commitment already verified");
        
        commitment.verified = true;
        
        emit CommitmentVerified(_poolId, commitment.user);
    }
    
    /**
     * @dev Withdraws funds from a pool to the creator
     * @param _poolId ID of the pool
     */
    function withdrawFunds(string memory _poolId) external nonReentrant {
        Pool storage pool = pools[_poolId];
        require(pool.creator != address(0), "Pool does not exist");
        require(msg.sender == pool.creator || owner() == msg.sender, "Not authorized");
        require(pool.raisedAmount > 0, "No funds to withdraw");
        
        uint256 amount = pool.raisedAmount;
        pool.raisedAmount = 0;
        pool.active = false;
        
        require(usdcToken.transfer(pool.creator, amount), "USDC transfer failed");
        
        emit FundsWithdrawn(_poolId, pool.creator, amount);
    }
    
    /**
     * @dev Gets all commitments for a pool
     * @param _poolId ID of the pool
     * @return Array of commitments
     */
    function getPoolCommitments(string memory _poolId) external view returns (Commitment[] memory) {
        return commitments[_poolId];
    }
    
    /**
     * @dev Gets a user's commitment amount for a pool
     * @param _user Address of the user
     * @param _poolId ID of the pool
     * @return Amount committed by the user
     */
    function getUserCommitment(address _user, string memory _poolId) external view returns (uint256) {
        return userCommitments[_user][_poolId];
    }
    
    /**
     * @dev Updates the USDC token address
     * @param _newUsdcToken New USDC token address
     */
    function updateUsdcToken(address _newUsdcToken) external onlyOwner {
        require(_newUsdcToken != address(0), "Invalid token address");
        usdcToken = IERC20(_newUsdcToken);
    }
} 