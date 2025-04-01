// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./StageDotFunPool.sol";
import "./interfaces/IStageDotFunPool.sol";

contract StageDotFunPoolFactory is Ownable {
    // Implementation contracts
    address public immutable poolImplementation;
    address public immutable lpTokenImplementation;
    address public immutable nftImplementation;
    
    // Factory state
    address[] public deployedPools;
    uint256 public poolCount;
    address public depositToken;
    
    // Events
    event PoolCreated(
        address indexed pool,
        string name,
        string uniqueId,
        uint256 endTime,
        address depositToken,
        address owner,
        address creator,
        uint256 targetAmount,
        uint256 capAmount
    );
    
    constructor(
        address _depositToken,
        address _poolImplementation,
        address _lpTokenImplementation,
        address _nftImplementation
    ) Ownable(msg.sender) {
        require(_depositToken != address(0), "Invalid deposit token");
        require(_poolImplementation != address(0), "Invalid pool implementation");
        require(_lpTokenImplementation != address(0), "Invalid LP token implementation");
        require(_nftImplementation != address(0), "Invalid NFT implementation");
        
        depositToken = _depositToken;
        poolImplementation = _poolImplementation;
        lpTokenImplementation = _lpTokenImplementation;
        nftImplementation = _nftImplementation;
    }
    
    function createPool(
        string memory name,
        string memory uniqueId,
        string memory symbol,
        uint256 endTime,
        address owner,
        address creator,
        uint256 targetAmount,
        uint256 capAmount,
        IStageDotFunPool.TierInitData[] memory tiers
    ) external returns (address) {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(uniqueId).length > 0, "Unique ID cannot be empty");
        require(endTime > block.timestamp, "End time must be in the future");
        require(owner != address(0), "Invalid owner");
        require(creator != address(0), "Invalid creator");
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(capAmount == 0 || capAmount >= targetAmount, "Cap amount must be >= target amount");
        
        // Create pool using minimal proxy
        address pool = Clones.clone(poolImplementation);
        
        // Initialize the pool
        StageDotFunPool(pool).initialize(
            name,
            uniqueId,
            symbol,
            endTime,
            depositToken,
            owner,
            creator,
            targetAmount,
            capAmount,
            lpTokenImplementation,
            nftImplementation,
            tiers
        );
        
        deployedPools.push(pool);
        poolCount++;
        
        emit PoolCreated(
            pool,
            name,
            uniqueId,
            endTime,
            depositToken,
            owner,
            creator,
            targetAmount,
            capAmount
        );
        
        return pool;
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
                keccak256(abi.encodePacked(poolImplementation))
            )
        );
        return address(uint160(uint256(hash)));
    }
    
    // Check if a pool's target has been met
    function checkPoolStatus(address poolAddress) external {
        StageDotFunPool pool = StageDotFunPool(poolAddress);
        pool.checkPoolStatus();
    }
    
    // Check if a pool's end time has passed without meeting target
    function checkAllPoolsStatus() external {
        for (uint i = 0; i < deployedPools.length; i++) {
            StageDotFunPool pool = StageDotFunPool(deployedPools[i]);
            try pool.checkPoolStatus() {
                // Successfully checked pool status
            } catch {
                // Skip if there's an error
            }
        }
    }

    // Get details for deployed pools with pagination support
    // If both startIndex and endIndex are 0, returns all pools
    function getDeployedPoolsDetails(
        uint256 startIndex,
        uint256 endIndex
    ) external view returns (
        string[] memory names,
        string[] memory uniqueIds,
        address[] memory creators,
        uint256[] memory totalDeposits,
        uint256[] memory revenueAccumulated,
        uint256[] memory endTimes,
        uint256[] memory targetAmounts,
        uint256[] memory capAmounts,
        uint8[] memory statuses,
        address[] memory lpTokenAddresses,
        address[] memory nftContractAddresses,
        uint256[] memory tierCounts
    ) {
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
                new string[](0),
                new string[](0),
                new address[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint256[](0),
                new uint8[](0),
                new address[](0),
                new address[](0),
                new uint256[](0)
            );
        }
        
        uint256 batchSize = endIndex - startIndex + 1;
        
        names = new string[](batchSize);
        uniqueIds = new string[](batchSize);
        creators = new address[](batchSize);
        totalDeposits = new uint256[](batchSize);
        revenueAccumulated = new uint256[](batchSize);
        endTimes = new uint256[](batchSize);
        targetAmounts = new uint256[](batchSize);
        capAmounts = new uint256[](batchSize);
        statuses = new uint8[](batchSize);
        lpTokenAddresses = new address[](batchSize);
        nftContractAddresses = new address[](batchSize);
        tierCounts = new uint256[](batchSize);
        
        for (uint256 i = 0; i < batchSize; i++) {
            uint256 poolIndex = startIndex + i;
            address poolAddress = deployedPools[poolIndex];
            StageDotFunPool pool = StageDotFunPool(poolAddress);
            
            (
                names[i],
                uniqueIds[i],
                creators[i],
                totalDeposits[i],
                revenueAccumulated[i],
                endTimes[i],
                targetAmounts[i],
                capAmounts[i],
                statuses[i],
                lpTokenAddresses[i],
                nftContractAddresses[i],
                tierCounts[i]
            ) = pool.getPoolDetails();
        }
        
        return (
            names,
            uniqueIds,
            creators,
            totalDeposits,
            revenueAccumulated,
            endTimes,
            targetAmounts,
            capAmounts,
            statuses,
            lpTokenAddresses,
            nftContractAddresses,
            tierCounts
        );
    }

    function getDeployedPools() external view returns (address[] memory) {
        return deployedPools;
    }

    function getPoolCount() external view returns (uint256) {
        return deployedPools.length;
    }
} 