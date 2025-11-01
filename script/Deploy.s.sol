// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/SeiMoodBlocks.sol";

contract DeployMood is Script {
    function run() external returns (SeiMoodBlocks) {
        vm.startBroadcast();
        SeiMoodBlocks mood = new SeiMoodBlocks();
        vm.stopBroadcast();
        return mood;
    }
}
