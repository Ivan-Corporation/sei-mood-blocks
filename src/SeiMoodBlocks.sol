// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SeiMoodBlocks {
    string[] public emojis = [
        unicode"❤️",
        unicode"😎",
        unicode"😭",
        unicode"😡"
    ];

    mapping(uint256 => mapping(string => uint256)) public blockMoods;
    mapping(string => uint256) public globalMoodCount;
    mapping(address => mapping(uint256 => string)) public userMood;

    event MoodSet(address indexed user, uint256 blockNumber, string emoji);

    function setMood(string memory _emoji) public {
        require(isValidEmoji(_emoji), "Invalid emoji");

        uint256 blockNum = block.number;
        string memory prev = userMood[msg.sender][blockNum];

        if (bytes(prev).length != 0) {
            if (keccak256(bytes(prev)) != keccak256(bytes(_emoji))) {
                blockMoods[blockNum][prev]--;
                globalMoodCount[prev]--;
            } else {
                return;
            }
        }

        userMood[msg.sender][blockNum] = _emoji;
        blockMoods[blockNum][_emoji]++;
        globalMoodCount[_emoji]++;

        emit MoodSet(msg.sender, blockNum, _emoji);
    }

    function getBlockMood(
        uint256 blockNum
    ) public view returns (string memory) {
        uint256 max = 0;
        string memory top;
        for (uint256 i = 0; i < emojis.length; i++) {
            string memory e = emojis[i];
            uint256 count = blockMoods[blockNum][e];
            if (count > max) {
                max = count;
                top = e;
            }
        }
        return top;
    }

    function getTopEmoji() public view returns (string memory) {
        uint256 max = 0;
        string memory top;
        for (uint256 i = 0; i < emojis.length; i++) {
            string memory e = emojis[i];
            uint256 count = globalMoodCount[e];
            if (count > max) {
                max = count;
                top = e;
            }
        }
        return top;
    }

    function isValidEmoji(string memory _emoji) internal view returns (bool) {
        for (uint256 i = 0; i < emojis.length; i++) {
            if (keccak256(bytes(emojis[i])) == keccak256(bytes(_emoji))) {
                return true;
            }
        }
        return false;
    }
}
