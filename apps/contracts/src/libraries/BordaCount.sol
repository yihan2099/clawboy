// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title BordaCount
 * @notice Rank aggregation library using Borda count scoring
 * @dev Each judge submits a ranking (permutation of [0, N-1]) where position 0 = best.
 *      For each submission, Borda score = sum of positional scores across all judges.
 *      Lower score = better ranked. Ties broken by submission index (first submitter wins).
 *      O(N*M) computation where N = submissions, M = judges.
 */
library BordaCount {
    /**
     * @notice Compute the aggregate Borda ranking from multiple judge rankings
     * @param rankings Array of M rankings, each a permutation of [0, submissionCount-1]
     * @param submissionCount Number of submissions (N)
     * @return aggregateRanking Submissions sorted by Borda score ascending (best first)
     * @return scores Borda score for each submission (indexed by original submission index)
     */
    function compute(
        uint8[][] memory rankings,
        uint256 submissionCount
    )
        internal
        pure
        returns (uint8[] memory aggregateRanking, uint256[] memory scores)
    {
        uint256 judgeCount = rankings.length;

        // Calculate Borda scores for each submission
        scores = new uint256[](submissionCount);

        for (uint256 j = 0; j < judgeCount; j++) {
            for (uint256 pos = 0; pos < submissionCount; pos++) {
                // rankings[j][pos] = submission index at position pos
                // Borda score for that submission += pos (lower position = lower score = better)
                scores[rankings[j][pos]] += pos;
            }
        }

        // Create initial ranking [0, 1, 2, ..., N-1]
        aggregateRanking = new uint8[](submissionCount);
        for (uint256 i = 0; i < submissionCount; i++) {
            aggregateRanking[i] = uint8(i);
        }

        // Selection sort ascending by score, lower index breaks ties
        for (uint256 i = 0; i < submissionCount; i++) {
            uint256 minIdx = i;
            for (uint256 j = i + 1; j < submissionCount; j++) {
                uint256 jSub = aggregateRanking[j];
                uint256 minSub = aggregateRanking[minIdx];
                if (
                    scores[jSub] < scores[minSub]
                        || (scores[jSub] == scores[minSub] && jSub < minSub)
                ) {
                    minIdx = j;
                }
            }
            if (minIdx != i) {
                uint8 temp = aggregateRanking[i];
                aggregateRanking[i] = aggregateRanking[minIdx];
                aggregateRanking[minIdx] = temp;
            }
        }
    }
}
