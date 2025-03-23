// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract StageDotFunNFT is Initializable, ERC721URIStorageUpgradeable, OwnableUpgradeable {
    constructor() {
        _disableInitializers();
    }
    
    function initialize(
        string memory name,
        string memory symbol,
        address _owner
    ) external initializer {
        __ERC721_init(name, symbol);
        __ERC721URIStorage_init();
        __Ownable_init(_owner);
    }
    
    uint256 private _tokenIds;
    string private _baseTokenURI;
    
    function mintNFT(address recipient, string memory tokenURI) external onlyOwner returns (uint256) {
        _tokenIds++;
        uint256 newItemId = _tokenIds;
        
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        
        return newItemId;
    }
    
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }
    
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }
    
    function totalSupply() external view returns (uint256) {
        return _tokenIds;
    }
} 