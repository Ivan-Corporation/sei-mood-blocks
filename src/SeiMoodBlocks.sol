// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SeiMoodBlocks {
    string[] public emojis = [
        unicode"❤️",
        unicode"😎",
        unicode"😭",
        unicode"😡"
    ];

    struct MoodRecord {
        address user;
        uint256 blockNumber;
        string emoji;
    }

    // ✅ every mood ever set
    MoodRecord[] public globalHistory;

    // ✅ per-user full history
    mapping(address => MoodRecord[]) public userHistory;

    // ✅ per-block counts
    mapping(uint256 => mapping(string => uint256)) public blockMoods;

    // ✅ global leaderboard
    mapping(string => uint256) public globalMoodCount;

    // ✅ last mood user gave for each block
    mapping(address => mapping(uint256 => string)) public userMood;

    event MoodSet(address indexed user, uint256 blockNumber, string emoji);

    function setMood(string memory _emoji) public {
        require(isValidEmoji(_emoji), "Invalid emoji");

        uint256 blockNum = block.number;
        string memory prev = userMood[msg.sender][blockNum];

        // undo previous if they change mood in same block
        if (bytes(prev).length != 0 && keccak256(bytes(prev)) != keccak256(bytes(_emoji))) {
            blockMoods[blockNum][prev]--;
            globalMoodCount[prev]--;
        }

        userMood[msg.sender][blockNum] = _emoji;
        blockMoods[blockNum][_emoji]++;
        globalMoodCount[_emoji]++;

        MoodRecord memory record = MoodRecord(msg.sender, blockNum, _emoji);
        globalHistory.push(record);
        userHistory[msg.sender].push(record);

        emit MoodSet(msg.sender, blockNum, _emoji);
    }

    function getBlockMood(uint256 blockNum) public view returns (string memory) {
        uint256 max = 0;
        string memory top;

        for (uint256 i = 0; i < emojis.length; i++) {
            uint256 count = blockMoods[blockNum][emojis[i]];
            if (count > max) {
                max = count;
                top = emojis[i];
            }
        }
        return top;
    }

    function getTopEmoji() public view returns (string memory) {
        uint256 max = 0;
        string memory top;

        for (uint256 i = 0; i < emojis.length; i++) {
            uint256 count = globalMoodCount[emojis[i]];
            if (count > max) {
                max = count;
                top = emojis[i];
            }
        }
        return top;
    }

    function getUserHistory(address _user) public view returns (MoodRecord[] memory) {
        return userHistory[_user];
    }

    function getGlobalHistory() public view returns (MoodRecord[] memory) {
        return globalHistory;
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
