/**
 * TaskManagerV2 contract ABI
 * N+M consensus model with Borda Count + Kendall Tau
 * Generated from forge build output
 */
export const TaskManagerV2ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_escrowVault",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_agentAdapter",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_protocolTreasury",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_emergencyAdmin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "BPS_DENOMINATOR",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "MAX_FEE_BPS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "acceptOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "agentAdapter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IPactAgentAdapter"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "cancelTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "createTask",
    "inputs": [
      {
        "name": "specCid",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "bounty",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "bountyToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "requiredWorkers",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "requiredJudges",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "workDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "judgeDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "emergencyAdmin",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "emergencyRefund",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "escrowVault",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IEscrowVault"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getJudgment",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct TaskManagerV2.Judgment",
        "components": [
          {
            "name": "judge",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "rankings",
            "type": "uint8[]",
            "internalType": "uint8[]"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getJudgmentCount",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubmission",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "index",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct TaskManagerV2.Submission",
        "components": [
          {
            "name": "worker",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "submissionCid",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSubmissionCount",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getTask",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct TaskManagerV2.Task",
        "components": [
          {
            "name": "creator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "specCid",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "bounty",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "bountyToken",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "requiredWorkers",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "requiredJudges",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "workDeadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "judgeDeadline",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "phase",
            "type": "uint8",
            "internalType": "enum TaskManagerV2.TaskPhase"
          },
          {
            "name": "submissionCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "judgmentCount",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSubmittedJudgment",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hasSubmittedWork",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minBounty",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "paused",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pendingOwner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolFeeBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "protocolTreasury",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "renounceOwnership",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolve",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setEmergencyAdmin",
    "inputs": [
      {
        "name": "newAdmin",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setMinBounty",
    "inputs": [
      {
        "name": "newMinBounty",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setProtocolFee",
    "inputs": [
      {
        "name": "newFeeBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setProtocolTreasury",
    "inputs": [
      {
        "name": "newTreasury",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setWorkerShare",
    "inputs": [
      {
        "name": "newShareBps",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitJudgment",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "rankings",
        "type": "uint8[]",
        "internalType": "uint8[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitWork",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "submissionCid",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "taskCounter",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tasks",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "creator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "specCid",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "bounty",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "bountyToken",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "requiredWorkers",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "requiredJudges",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "workDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "judgeDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "phase",
        "type": "uint8",
        "internalType": "enum TaskManagerV2.TaskPhase"
      },
      {
        "name": "submissionCount",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "judgmentCount",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transferOwnership",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "unpause",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "workerShareBps",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "JudgmentSubmitted",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "judge",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "judgmentIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferStarted",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "OwnershipTransferred",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Paused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PhaseChanged",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "fromPhase",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum TaskManagerV2.TaskPhase"
      },
      {
        "name": "toPhase",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum TaskManagerV2.TaskPhase"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskCancelled",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskCreated",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "creator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "bounty",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "bountyToken",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "specCid",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "requiredWorkers",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "requiredJudges",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "workDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "judgeDeadline",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskFailed",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "reason",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "TaskResolved",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "consensusRanking",
        "type": "uint8[]",
        "indexed": false,
        "internalType": "uint8[]"
      },
      {
        "name": "winningWorkers",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "consensusJudges",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Unpaused",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "WorkSubmitted",
    "inputs": [
      {
        "name": "taskId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "worker",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "submissionCid",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "slotIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadySubmitted",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CannotJudge",
    "inputs": []
  },
  {
    "type": "error",
    "name": "EnforcedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ExpectedPause",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InsufficientBounty",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidDeadlines",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidJudgeCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPermutation",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidPhase",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidRankingLength",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidWorkerCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "JudgeDeadlineNotPassed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "JudgeDeadlinePassed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "JudgeIsWorker",
    "inputs": []
  },
  {
    "type": "error",
    "name": "JudgeSlotsFull",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotRegistered",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NothingToResolve",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OnlyCreator",
    "inputs": []
  },
  {
    "type": "error",
    "name": "OwnableInvalidOwner",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "OwnableUnauthorizedAccount",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "TaskHasSubmissions",
    "inputs": []
  },
  {
    "type": "error",
    "name": "TaskNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WorkDeadlineNotPassed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WorkDeadlinePassed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "WorkerSlotsFull",
    "inputs": []
  }
] as const;

// Backward compatibility alias
export const TaskManagerABI = TaskManagerV2ABI;
