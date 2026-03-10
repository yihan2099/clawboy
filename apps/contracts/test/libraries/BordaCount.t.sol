// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { BordaCount } from "../../src/libraries/BordaCount.sol";

contract BordaCountTest is Test {
    /**
     * @dev Test unanimous agreement: all 3 judges rank [0, 1, 2]
     *      Expected: aggregate = [0, 1, 2], scores = [0, 3, 6]
     */
    function test_Unanimous() public pure {
        uint8[][] memory rankings = new uint8[][](3);
        for (uint256 i = 0; i < 3; i++) {
            rankings[i] = new uint8[](3);
            rankings[i][0] = 0;
            rankings[i][1] = 1;
            rankings[i][2] = 2;
        }

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 3);

        // All judges agree: sub 0 at pos 0 (score 0), sub 1 at pos 1 (score 3), sub 2 at pos 2 (score 6)
        assertEq(scores[0], 0);
        assertEq(scores[1], 3);
        assertEq(scores[2], 6);

        assertEq(aggregate[0], 0);
        assertEq(aggregate[1], 1);
        assertEq(aggregate[2], 2);
    }

    /**
     * @dev Test split vote: 2 judges rank [0,1,2], 1 ranks [2,1,0]
     *      Scores: sub0 = 0+0+2=2, sub1 = 1+1+1=3, sub2 = 2+2+0=4
     *      Expected aggregate: [0, 1, 2]
     */
    function test_SplitVote() public pure {
        uint8[][] memory rankings = new uint8[][](3);

        // Judge 0: [0, 1, 2]
        rankings[0] = new uint8[](3);
        rankings[0][0] = 0;
        rankings[0][1] = 1;
        rankings[0][2] = 2;

        // Judge 1: [0, 1, 2]
        rankings[1] = new uint8[](3);
        rankings[1][0] = 0;
        rankings[1][1] = 1;
        rankings[1][2] = 2;

        // Judge 2: [2, 1, 0] — dissenter
        rankings[2] = new uint8[](3);
        rankings[2][0] = 2;
        rankings[2][1] = 1;
        rankings[2][2] = 0;

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 3);

        assertEq(scores[0], 2); // 0+0+2
        assertEq(scores[1], 3); // 1+1+1
        assertEq(scores[2], 4); // 2+2+0

        assertEq(aggregate[0], 0);
        assertEq(aggregate[1], 1);
        assertEq(aggregate[2], 2);
    }

    /**
     * @dev Test tied scores: submissions tie on Borda score, lower index wins
     *      Judge 0: [0, 1], Judge 1: [1, 0]
     *      Scores: sub0 = 0+1=1, sub1 = 1+0=1  (tied)
     *      Tie-break: lower index (0) wins
     */
    function test_TiedScores() public pure {
        uint8[][] memory rankings = new uint8[][](2);

        rankings[0] = new uint8[](2);
        rankings[0][0] = 0;
        rankings[0][1] = 1;

        rankings[1] = new uint8[](2);
        rankings[1][0] = 1;
        rankings[1][1] = 0;

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 2);

        assertEq(scores[0], 1);
        assertEq(scores[1], 1);

        // Tie-break: lower submission index wins
        assertEq(aggregate[0], 0);
        assertEq(aggregate[1], 1);
    }

    /**
     * @dev Test fully reversed: all judges rank [2, 1, 0]
     *      Scores: sub0=6, sub1=3, sub2=0
     *      Expected aggregate: [2, 1, 0]
     */
    function test_Reversed() public pure {
        uint8[][] memory rankings = new uint8[][](3);
        for (uint256 i = 0; i < 3; i++) {
            rankings[i] = new uint8[](3);
            rankings[i][0] = 2;
            rankings[i][1] = 1;
            rankings[i][2] = 0;
        }

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 3);

        assertEq(scores[0], 6);
        assertEq(scores[1], 3);
        assertEq(scores[2], 0);

        assertEq(aggregate[0], 2);
        assertEq(aggregate[1], 1);
        assertEq(aggregate[2], 0);
    }

    /**
     * @dev Test with only two submissions
     *      3 judges: [0,1], [0,1], [1,0]
     *      Scores: sub0 = 0+0+1=1, sub1 = 1+1+0=2
     *      Expected aggregate: [0, 1]
     */
    function test_TwoSubmissions() public pure {
        uint8[][] memory rankings = new uint8[][](3);

        rankings[0] = new uint8[](2);
        rankings[0][0] = 0;
        rankings[0][1] = 1;

        rankings[1] = new uint8[](2);
        rankings[1][0] = 0;
        rankings[1][1] = 1;

        rankings[2] = new uint8[](2);
        rankings[2][0] = 1;
        rankings[2][1] = 0;

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 2);

        assertEq(scores[0], 1);
        assertEq(scores[1], 2);

        assertEq(aggregate[0], 0);
        assertEq(aggregate[1], 1);
    }

    /**
     * @dev Test with five submissions and three judges
     *      Judge 0: [0,1,2,3,4]
     *      Judge 1: [0,2,1,3,4]
     *      Judge 2: [4,0,1,2,3]
     *      Scores:
     *        sub0 = 0+0+1 = 1
     *        sub1 = 1+2+2 = 5
     *        sub2 = 2+1+3 = 6
     *        sub3 = 3+3+4 = 10
     *        sub4 = 4+4+0 = 8
     *      Expected aggregate: [0, 1, 2, 4, 3]
     */
    function test_FiveSubmissions() public pure {
        uint8[][] memory rankings = new uint8[][](3);

        rankings[0] = new uint8[](5);
        rankings[0][0] = 0;
        rankings[0][1] = 1;
        rankings[0][2] = 2;
        rankings[0][3] = 3;
        rankings[0][4] = 4;

        rankings[1] = new uint8[](5);
        rankings[1][0] = 0;
        rankings[1][1] = 2;
        rankings[1][2] = 1;
        rankings[1][3] = 3;
        rankings[1][4] = 4;

        rankings[2] = new uint8[](5);
        rankings[2][0] = 4;
        rankings[2][1] = 0;
        rankings[2][2] = 1;
        rankings[2][3] = 2;
        rankings[2][4] = 3;

        (uint8[] memory aggregate, uint256[] memory scores) = BordaCount.compute(rankings, 5);

        assertEq(scores[0], 1);
        assertEq(scores[1], 5);
        assertEq(scores[2], 6);
        assertEq(scores[3], 10);
        assertEq(scores[4], 8);

        assertEq(aggregate[0], 0); // score 1
        assertEq(aggregate[1], 1); // score 5
        assertEq(aggregate[2], 2); // score 6
        assertEq(aggregate[3], 4); // score 8
        assertEq(aggregate[4], 3); // score 10
    }
}
