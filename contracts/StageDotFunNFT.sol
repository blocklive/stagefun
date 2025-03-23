// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StageDotFunNFT is ERC721URIStorage, Ownable {
    modifier initializer() {
        require(!initialized, "Already initialized");
        _;
        initialized = true;
    }
    
    bool private initialized;
    
    function initialize(
        string memory name,
        string memory symbol,
        address _owner
    ) external initializer {
        _transferOwnership(_owner);
    }
    
    constructor() ERC721("", "") Ownable(msg.sender) {}
    
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