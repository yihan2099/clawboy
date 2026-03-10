// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { Test } from "forge-std/Test.sol";
import { KendallTau } from "../../src/libraries/KendallTau.sol";

contract KendallTauTest is Test {
    /**
     * @dev Identical rankings have 0 distance
     */
    function test_IdenticalRankings() public pure {
        uint8[] memory a = new uint8[](3);
        a[0] = 0;
        a[1] = 1;
        a[2] = 2;

        uint8[] memory b = new uint8[](3);
        b[0] = 0;
        b[1] = 1;
        b[2] = 2;

        assertEq(KendallTau.distance(a, b), 0);
    }

    /**
     * @dev One swap: [0,1,2] vs [0,2,1] — items 1 and 2 are swapped
     *      Only pair (1,2) disagrees → distance = 1
     */
    function test_OneSwap() public pure {
        uint8[] memory a = new uint8[](3);
        a[0] = 0;
        a[1] = 1;
        a[2] = 2;

        uint8[] memory b = new uint8[](3);
        b[0] = 0;
        b[1] = 2;
        b[2] = 1;

        assertEq(KendallTau.distance(a, b), 1);
    }

    /**
     * @dev Fully reversed: [0,1,2] vs [2,1,0]
     *      All pairs disagree → distance = 3 = maxDistance(3)
     */
    function test_FullyReversed() public pure {
        uint8[] memory a = new uint8[](3);
        a[0] = 0;
        a[1] = 1;
        a[2] = 2;

        uint8[] memory b = new uint8[](3);
        b[0] = 2;
        b[1] = 1;
        b[2] = 0;

        assertEq(KendallTau.distance(a, b), 3);
        assertEq(KendallTau.maxDistance(3), 3);
    }

    /**
     * @dev Two items: only one possible pair
     *      [0,1] vs [1,0] → distance = 1
     *      [0,1] vs [0,1] → distance = 0
     */
    function test_TwoItems() public pure {
        uint8[] memory a = new uint8[](2);
        a[0] = 0;
        a[1] = 1;

        uint8[] memory b = new uint8[](2);
        b[0] = 1;
        b[1] = 0;

        assertEq(KendallTau.distance(a, b), 1);

        // Same rankings
        uint8[] memory c = new uint8[](2);
        c[0] = 0;
        c[1] = 1;

        assertEq(KendallTau.distance(a, c), 0);
    }

    /**
     * @dev Five items with partial disagreement
     *      a = [0,1,2,3,4], b = [0,1,3,2,4]
     *      Only pair (2,3) disagrees → distance = 1
     */
    function test_FiveItems() public pure {
        uint8[] memory a = new uint8[](5);
        a[0] = 0;
        a[1] = 1;
        a[2] = 2;
        a[3] = 3;
        a[4] = 4;

        uint8[] memory b = new uint8[](5);
        b[0] = 0;
        b[1] = 1;
        b[2] = 3;
        b[3] = 2;
        b[4] = 4;

        assertEq(KendallTau.distance(a, b), 1);
    }

    /**
     * @dev Verify consensus threshold values for N=2..5
     *      threshold = floor(N*(N-1)/6)
     */
    function test_ThresholdValues() public pure {
        // N=2: floor(2*1/6) = 0
        assertEq(KendallTau.consensusThreshold(2), 0);

        // N=3: floor(3*2/6) = 1
        assertEq(KendallTau.consensusThreshold(3), 1);

        // N=4: floor(4*3/6) = 2
        assertEq(KendallTau.consensusThreshold(4), 2);

        // N=5: floor(5*4/6) = 3
        assertEq(KendallTau.consensusThreshold(5), 3);

        // N=10: floor(10*9/6) = 15
        assertEq(KendallTau.consensusThreshold(10), 15);
    }

    /**
     * @dev Verify max distance values for N=2..5
     *      maxDistance = N*(N-1)/2
     */
    function test_MaxDistanceValues() public pure {
        // N=2: 2*1/2 = 1
        assertEq(KendallTau.maxDistance(2), 1);

        // N=3: 3*2/2 = 3
        assertEq(KendallTau.maxDistance(3), 3);

        // N=4: 4*3/2 = 6
        assertEq(KendallTau.maxDistance(4), 6);

        // N=5: 5*4/2 = 10
        assertEq(KendallTau.maxDistance(5), 10);

        // N=10: 10*9/2 = 45
        assertEq(KendallTau.maxDistance(10), 45);
    }
}
