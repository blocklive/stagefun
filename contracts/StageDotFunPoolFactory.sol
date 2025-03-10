// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StageDotFunPool.sol";

contract StageDotFunPoolFactory is Ownable {
    address public depositToken;
    address[] public deployedPools;
    bytes32 public immutable poolBytecodeHash;

    event PoolCreated(
        address indexed poolAddress,
        string name,
        string uniqueId,
        address creator,
        address lpTokenAddress,
        uint256 endTime
    );

    constructor(address _depositToken) Ownable(msg.sender) {
        depositToken = _depositToken;
        // Get the bytecode hash of the pool contract
        poolBytecodeHash = keccak256(
            abi.encodePacked(
                type(StageDotFunPool).creationCode,
                abi.encode(address(0), "", "", "", 0, address(0), address(0), 0, 0) // Default constructor arguments
            )
        );
    }

    function createPool(
        string memory name,
        string memory uniqueId,
        string memory symbol,
        uint256 endTime,
        uint256 targetAmount,
        uint256 minCommitment
    ) external onlyOwner returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(minCommitment > 0, "Min commitment must be greater than 0");
        require(minCommitment <= targetAmount, "Min commitment cannot exceed target amount");
        require(bytes(uniqueId).length > 0, "Unique ID cannot be empty");

        // Generate a unique salt for this pool
        bytes32 salt = keccak256(abi.encodePacked(uniqueId, block.timestamp));
        
        // Deploy pool using CREATE2
        StageDotFunPool newPool = new StageDotFunPool{salt: salt}(
            name,
            uniqueId,
            symbol,
            endTime,
            depositToken,
            msg.sender,
            tx.origin, // Use tx.origin as the creator address
            targetAmount,
            minCommitment
        );
        
        deployedPools.push(address(newPool));
        
        emit PoolCreated(
            address(newPool),
            name,
            uniqueId,
            tx.origin,
            address(newPool.lpToken()),
            endTime
        );
        
        return address(newPool);
    }

    // Predict the address where a pool will be deployed
    function predictPoolAddress(
        string memory uniqueId,
        uint256 timestamp
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(uniqueId, timestamp));
        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                poolBytecodeHash
            )
        );
        return address(uint160(uint256(hash)));
    }

    // Get details for deployed pools with pagination support
    // If both startIndex and endIndex are 0, returns all pools
    function getDeployedPoolsDetails(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (
        address[] memory poolAddresses,
        string[] memory names,
        string[] memory uniqueIds,
        address[] memory creators,
        uint256[] memory totalDeposits,
        uint256[] memory revenueAccumulated,
        uint256[] memory endTimes,
        uint256[] memory targetAmounts,
        uint8[] memory statuses
    ) {
        uint256 poolCount = deployedPools.length;
        
        // If both indices are 0, return all pools
        if (startIndex == 0 && endIndex == 0) {
            endIndex = poolCount > 0 ? poolCount - 1 : 0;
        } else {
            // Validate indices
            require(startIndex < poolCount, "Start index out of bounds");
            require(startIndex <= endIndex, "Start index must be <= end index");
            
            // Cap endIndex to the array length
            if (endIndex >= poolCount) {
                endIndex = poolCount - 1;
            }
        }
        
        // If no pools or invalid range, return empty arrays
        if (poolCount == 0 || startIndex >= poolCount) {
            return (
                new address[](0),
                new string[](0),
                new string[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint8[](0)
            );
        }
        
        uint256 batchSize = endIndex - startIndex + 1;
        
        poolAddresses = new address[](batchSize);
        names = new string[](batchSize);
        uniqueIds = new string[](batchSize);
        creators = new address[](batchSize);
        totalDeposits = new uint256[](batchSize);
        revenueAccumulated = new uint256[](batchSize);
        endTimes = new uint256[](batchSize);
        targetAmounts = new uint256[](batchSize);
        statuses = new uint8[](batchSize);
        
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 poolIndex = startIndex + i;
            StageDotFunPool pool = StageDotFunPool(deployedPools[poolIndex]);
            poolAddresses[i] = deployedPools[poolIndex];
            
            // Get basic pool details
            names[i] = pool.name();
            uniqueIds[i] = pool.uniqueId();
            creators[i] = pool.creator();
            totalDeposits[i] = pool.totalDeposits();
            revenueAccumulated[i] = pool.revenueAccumulated();
            endTimes[i] = pool.endTime();
            targetAmounts[i] = pool.targetAmount();
            statuses[i] = uint8(pool.status());
        }
        
        return (poolAddresses, names, uniqueIds, creators, totalDeposits, revenueAccumulated, endTimes, targetAmounts, statuses);
    }

    function getDeployedPools() external view returns (address[] memory) {
        return deployedPools;
    }

    function getPoolCount() external view returns (uint256) {
        return deployedPools.length;
    }
} 