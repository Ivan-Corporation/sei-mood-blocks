// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../src/SeiMoodBlocks.sol";

contract SeiMoodBlocksTest is Test {
    SeiMoodBlocks mood;
    address user1 = address(0x1);
    address user2 = address(0x2);

    function setUp() public {
        mood = new SeiMoodBlocks();
    }

    function testSetMood() public {
        vm.prank(user1);
        mood.setMood(unicode"❤️");
        assertEq(mood.globalMoodCount(unicode"❤️"), 1);
        assertEq(mood.blockMoods(block.number, unicode"❤️"), 1);
    }

    function testChangeMood() public {
        vm.startPrank(user1);
        mood.setMood(unicode"❤️");
        mood.setMood(unicode"😡");
        vm.stopPrank();

        assertEq(mood.globalMoodCount(unicode"❤️"), 0);
        assertEq(mood.globalMoodCount(unicode"😡"), 1);
    }

    function testMultipleUsersSameBlock() public {
        vm.prank(user1);
        mood.setMood(unicode"😭");

        vm.prank(user2);
        mood.setMood(unicode"😭");

        assertEq(mood.blockMoods(block.number, unicode"😭"), 2);
        assertEq(mood.globalMoodCount(unicode"😭"), 2);
    }

    function testInvalidEmojiFails() public {
        vm.expectRevert("Invalid emoji");
        vm.prank(user1);
        mood.setMood(unicode"🤣");
    }

    function testGetTopEmoji() public {
        vm.prank(user1);
        mood.setMood(unicode"❤️");

        vm.prank(user2);
        mood.setMood(unicode"😎");

        vm.prank(address(0x3));
        mood.setMood(unicode"❤️");

        assertEq(mood.getTopEmoji(), unicode"❤️");
    }
}
