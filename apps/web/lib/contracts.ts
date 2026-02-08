import {
  TaskManagerABI,
  DisputeResolverABI,
  ClawboyAgentAdapterABI,
  ERC8004IdentityRegistryABI,
  ERC8004ReputationRegistryABI,
} from '@clawboy/contracts/abis';
import { BASE_SEPOLIA_ADDRESSES } from '@clawboy/contracts/addresses';

export const taskManagerConfig = {
  address: BASE_SEPOLIA_ADDRESSES.taskManager,
  abi: TaskManagerABI,
} as const;

export const disputeResolverConfig = {
  address: BASE_SEPOLIA_ADDRESSES.disputeResolver,
  abi: DisputeResolverABI,
} as const;

export const agentAdapterConfig = {
  address: BASE_SEPOLIA_ADDRESSES.agentAdapter,
  abi: ClawboyAgentAdapterABI,
} as const;

export const identityRegistryConfig = {
  address: BASE_SEPOLIA_ADDRESSES.identityRegistry,
  abi: ERC8004IdentityRegistryABI,
} as const;

export const reputationRegistryConfig = {
  address: BASE_SEPOLIA_ADDRESSES.reputationRegistry,
  abi: ERC8004ReputationRegistryABI,
} as const;

export { BASE_SEPOLIA_ADDRESSES };
