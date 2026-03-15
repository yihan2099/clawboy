// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import { IERC8183 } from "./interfaces/IERC8183.sol";
import { TaskManagerV2 } from "./TaskManagerV2.sol";

/**
 * @title ERC8183Adapter
 * @notice Read-only adapter that exposes Pact's TaskManagerV2 as an ERC-8183 compliant interface.
 * @dev Maps Pact's richer N+M consensus model to ERC-8183's three-role (client/provider/evaluator)
 *      and six-state (Open/Funded/Submitted/Completed/Rejected/Expired) model.
 *
 *      State mapping:
 *        Pact Open       → ERC-8183 Open       (task posted, no submissions yet)
 *        Pact WorkPhase  → ERC-8183 Funded     (bounty escrowed, work in progress)
 *        Pact JudgePhase → ERC-8183 Submitted  (work submitted, awaiting evaluation)
 *        Pact Resolved   → ERC-8183 Completed  (consensus reached, payouts made)
 *        Pact Cancelled  → ERC-8183 Rejected   (creator cancelled before submissions)
 *        Pact Failed     → ERC-8183 Expired    (insufficient workers/judges or no consensus)
 *
 *      Role mapping:
 *        client    → task.creator
 *        provider  → first submitted worker (or address(0) if none yet)
 *        evaluator → address(this) representing the N+M consensus mechanism
 *
 *      Pact's N+M model is strictly more expressive than ERC-8183's single-provider model.
 *      This adapter provides interoperability for external protocols that only understand
 *      the ERC-8183 interface, while Pact's native interface remains the primary API.
 */
contract ERC8183Adapter {
    TaskManagerV2 public immutable taskManager;

    constructor(address _taskManager) {
        taskManager = TaskManagerV2(_taskManager);
    }

    /// @notice Get job details in ERC-8183 format
    function getJob(uint256 jobId) external view returns (IERC8183.Job memory) {
        TaskManagerV2.Task memory task = taskManager.getTask(jobId);

        return IERC8183.Job({
            id: jobId,
            client: task.creator,
            provider: _getProvider(jobId, task),
            evaluator: address(this), // N+M consensus acts as the evaluator
            description: task.specCid,
            budget: task.bounty,
            expiredAt: task.judgeDeadline,
            status: _mapStatus(task.phase),
            hook: address(0) // Pact doesn't use ERC-8183 hooks
        });
    }

    /// @notice Get current status of a job
    function getJobStatus(uint256 jobId) external view returns (IERC8183.JobStatus) {
        TaskManagerV2.Task memory task = taskManager.getTask(jobId);
        return _mapStatus(task.phase);
    }

    /// @notice Get the client (creator) of a job
    function getClient(uint256 jobId) external view returns (address) {
        TaskManagerV2.Task memory task = taskManager.getTask(jobId);
        return task.creator;
    }

    /// @notice Get the provider (first worker) of a job
    function getProvider(uint256 jobId) external view returns (address) {
        TaskManagerV2.Task memory task = taskManager.getTask(jobId);
        return _getProvider(jobId, task);
    }

    /// @notice Get the evaluator of a job
    function getEvaluator(uint256 /* jobId */) external view returns (address) {
        // The N+M consensus mechanism itself is the evaluator.
        return address(this);
    }

    // ============ Pact-specific view extensions ============

    /// @notice Get the number of workers who submitted for this job
    function getProviderCount(uint256 jobId) external view returns (uint256) {
        return taskManager.getSubmissionCount(jobId);
    }

    /// @notice Get the number of evaluators (judges) for this job
    function getEvaluatorCount(uint256 jobId) external view returns (uint256) {
        return taskManager.getJudgmentCount(jobId);
    }

    /// @notice Check if the job used multi-provider consensus (always true for Pact)
    function isMultiProvider(uint256 jobId) external view returns (bool) {
        TaskManagerV2.Task memory task = taskManager.getTask(jobId);
        return task.requiredWorkers > 1;
    }

    // ============ Internal ============

    /// @dev Map Pact's 6-state TaskPhase to ERC-8183's 6-state JobStatus
    function _mapStatus(TaskManagerV2.TaskPhase phase) internal pure returns (IERC8183.JobStatus) {
        if (phase == TaskManagerV2.TaskPhase.Open) return IERC8183.JobStatus.Open;
        if (phase == TaskManagerV2.TaskPhase.WorkPhase) return IERC8183.JobStatus.Funded;
        if (phase == TaskManagerV2.TaskPhase.JudgePhase) return IERC8183.JobStatus.Submitted;
        if (phase == TaskManagerV2.TaskPhase.Resolved) return IERC8183.JobStatus.Completed;
        if (phase == TaskManagerV2.TaskPhase.Cancelled) return IERC8183.JobStatus.Rejected;
        // Failed → Expired (insufficient workers/judges or no consensus)
        return IERC8183.JobStatus.Expired;
    }

    /// @dev Get the primary provider (first worker who submitted)
    function _getProvider(uint256 jobId, TaskManagerV2.Task memory task) internal view returns (address) {
        if (task.submissionCount == 0) return address(0);
        TaskManagerV2.Submission memory sub = taskManager.getSubmission(jobId, 0);
        return sub.worker;
    }
}
