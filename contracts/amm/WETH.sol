// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    constructor() ERC20("Wrapped MON", "WMON") {}

    // Function to deposit MON (native token) and receive WETH
    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }

    // Function to withdraw MON by burning WETH
    function withdraw(uint amount) external {
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
    }

    // Fallback to deposit MON when receiving without calling deposit
    receive() external payable {
        _mint(msg.sender, msg.value);
    }
} 