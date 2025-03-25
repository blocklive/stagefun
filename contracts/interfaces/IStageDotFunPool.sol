// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IStageDotFunPool {
    struct TierInitData {
        string name;
        uint256 price;
        string nftMetadata;
        bool isVariablePrice;
        uint256 minPrice;
        uint256 maxPrice;
        uint256 maxPatrons;
    }

    function getUserTierCommitments(address user) external view returns (uint256[] memory);
} 