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
        address lpTokenAddress,
        uint256 endTime
    );

    constructor(address _depositToken) Ownable(msg.sender) {
        depositToken = _depositToken;
        // Get the bytecode hash of the pool contract
        poolBytecodeHash = keccak256(
            abi.encodePacked(
                type(StageDotFunPool).creationCode,
                abi.encode(address(0), "", "", 0, address(0), address(0)) // Default constructor arguments
            )
        );
    }

    function createPool(
        string memory name,
        string memory symbol,
        uint256 endTime,
        uint256 targetAmount,
        uint256 minCommitment
    ) external onlyOwner returns (address) {
        require(endTime > block.timestamp, "End time must be in future");
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(minCommitment > 0, "Min commitment must be greater than 0");
        require(minCommitment <= targetAmount, "Min commitment cannot exceed target amount");

        // Generate a unique salt for this pool
        bytes32 salt = keccak256(abi.encodePacked(name, block.timestamp));
        
        // Deploy pool using CREATE2
        StageDotFunPool newPool = new StageDotFunPool{salt: salt}(
            name,
            symbol,
            endTime,
            depositToken,
            msg.sender,
            targetAmount,
            minCommitment
        );
        
        deployedPools.push(address(newPool));
        
        emit PoolCreated(
            address(newPool),
            name,
            address(newPool.lpToken()),
            endTime
        );
        
        return address(newPool);
    }

    // Predict the address where a pool will be deployed
    function predictPoolAddress(
        string memory name,
        uint256 timestamp
    ) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(name, timestamp));
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

    function getDeployedPools() external view returns (address[] memory) {
        return deployedPools;
    }

    function getPoolCount() external view returns (uint256) {
        return deployedPools.length;
    }
} 