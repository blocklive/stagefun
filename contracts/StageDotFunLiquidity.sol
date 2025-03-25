// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StageDotFunLiquidity is ERC20, Ownable {
    // Add initializer modifier
    modifier initializer() {
        require(!initialized, "Already initialized");
        _;
        initialized = true;
    }
    
    // Add initialization state
    bool private initialized;
    
    // Add initialize function
    function initialize(string memory name, string memory symbol) external initializer {
        // Transfer ownership to the factory
        _transferOwnership(msg.sender);
    }
    
    // Track all holders
    address[] private _holders;
    mapping(address => bool) private _isHolder;
    
    constructor() ERC20("", "") Ownable(msg.sender) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        _addHolder(to);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
        _removeHolder(from, balanceOf(from));
    }

    function _update(address from, address to, uint256 value) internal virtual override {
        super._update(from, to, value);
        
        if (from != address(0)) {
            _removeHolder(from, balanceOf(from));
        }
        if (to != address(0)) {
            _addHolder(to);
        }
    }
    
    function _addHolder(address holder) private {
        if (!_isHolder[holder]) {
            _holders.push(holder);
            _isHolder[holder] = true;
        }
    }
    
    function _removeHolder(address holder, uint256 newBalance) private {
        if (_isHolder[holder] && newBalance == 0) {
            // Find and remove the holder from the array
            for (uint256 i = 0; i < _holders.length; i++) {
                if (_holders[i] == holder) {
                    // Move the last element to the current position
                    _holders[i] = _holders[_holders.length - 1];
                    _holders.pop();
                    break;
                }
            }
            _isHolder[holder] = false;
        }
    }
    
    function getHolders() external view returns (address[] memory) {
        return _holders;
    }
    
    function getHolderCount() external view returns (uint256) {
        return _holders.length;
    }
    
    function isHolder(address account) external view returns (bool) {
        return _isHolder[account];
    }
} 