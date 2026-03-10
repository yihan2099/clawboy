// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title KendallTau
 * @notice Consensus distance library using Kendall tau distance
 * @dev Kendall tau distance = number of pairwise disagreements between two rankings.
 *      Used to determine which judges are "in consensus" with the aggregate ranking.
 *      O(N^2) computation where N = number of items being ranked.
 */
library KendallTau {
    /**
     * @notice Calculate the Kendall tau distance between two rankings
     * @dev Counts pairwise disagreements: for each pair (i,j), if ranking a says i < j
     *      but ranking b says i > j (or vice versa), that's a disagreement.
     *      Rankings are represented as permutations where ranking[pos] = item at position pos.
     * @param a First ranking (permutation)
     * @param b Second ranking (permutation)
     * @return dist The number of pairwise disagreements
     */
    function distance(
        uint8[] memory a,
        uint8[] memory b
    )
        internal
        pure
        returns (uint256 dist)
    {
        uint256 n = a.length;

        // Convert rankings to position arrays for efficient comparison.
        // posA[item] = position of item in ranking a.
        uint256[] memory posA = new uint256[](n);
        uint256[] memory posB = new uint256[](n);

        for (uint256 i = 0; i < n; i++) {
            posA[a[i]] = i;
            posB[b[i]] = i;
        }

        // Count pairwise disagreements
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                // Check if items i and j are in different relative order in a vs b
                bool aOrderIJ = posA[i] < posA[j];
                bool bOrderIJ = posB[i] < posB[j];
                if (aOrderIJ != bOrderIJ) {
                    dist++;
                }
            }
        }
    }

    /**
     * @notice Calculate the consensus threshold for N items
     * @dev Threshold = floor(N*(N-1)/6) — allows roughly 1/3 of pairs to disagree
     * @param n Number of items being ranked
     * @return The maximum Kendall tau distance for a judge to be "in consensus"
     */
    function consensusThreshold(uint256 n) internal pure returns (uint256) {
        return (n * (n - 1)) / 6;
    }

    /**
     * @notice Calculate the maximum possible Kendall tau distance for N items
     * @dev Max distance = N*(N-1)/2 (complete reversal)
     * @param n Number of items being ranked
     * @return The maximum possible distance
     */
    function maxDistance(uint256 n) internal pure returns (uint256) {
        return (n * (n - 1)) / 2;
    }
}
