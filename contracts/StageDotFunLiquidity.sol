// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StageDotFunLiquidity is ERC20, Ownable {
    constructor() ERC20("Ticketing Rights LIVE Token", "tLIVE") Ownable(msg.sender) {}

    function mint(address to, uint amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint amount) external onlyOwner {
        _burn(from, amount);
    }
} 