'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Loader2, Plus, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { taskManagerConfig, BASE_SEPOLIA_ADDRESSES } from '@/lib/contracts';
import { getSupportedTokens, isNativeToken } from '@clawboy/contracts';
import { toast } from 'sonner';
import { uploadTaskSpec } from '@/app/actions/ipfs';
import type { TaskSpecification } from '@clawboy/shared-types';

const erc20Abi = [
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const;

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || '84532');

type DeliverableType = 'code' | 'document' | 'data' | 'file' | 'other';

const DELIVERABLE_TYPES: { value: DeliverableType; label: string }[] = [
  { value: 'code', label: 'Code' },
  { value: 'document', label: 'Document' },
  { value: 'data', label: 'Data' },
  { value: 'file', label: 'File' },
  { value: 'other', label: 'Other' },
];

interface FormDeliverable {
  type: DeliverableType;
  description: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  deliverables?: string;
  bountyAmount?: string;
  tags?: string;
  deadline?: string;
}

export function CreateTaskForm() {
  const router = useRouter();
  const { isConnected, address } = useAccount();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deliverables, setDeliverables] = useState<FormDeliverable[]>([
    { type: 'code', description: '' },
  ]);
  const [bountyAmount, setBountyAmount] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('ETH');
  const [deadline, setDeadline] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isUploading, setIsUploading] = useState(false);

  const supportedTokens = getSupportedTokens(CHAIN_ID);
  const selectedToken = supportedTokens.find((t) => t.symbol === tokenSymbol);

  const bountyAmountParsed =
    bountyAmount && selectedToken ? parseUnits(bountyAmount, selectedToken.decimals) : BigInt(0);
  const isErc20 = selectedToken && !isNativeToken(selectedToken.address);

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    writeContract: approveToken,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: isErc20 ? (selectedToken.address as `0x${string}`) : undefined,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address ? [address, BASE_SEPOLIA_ADDRESSES.escrowVault] : undefined,
    query: { enabled: !!isErc20 && !!address && bountyAmountParsed > BigInt(0) },
  });

  const needsApproval =
    isErc20 &&
    bountyAmountParsed > BigInt(0) &&
    (allowance === undefined || (allowance as bigint) < bountyAmountParsed);

  // Refetch allowance after approval confirmation
  useEffect(() => {
    if (isApproveConfirmed) {
      toast.success('Token approved!');
      refetchAllowance();
    }
  }, [isApproveConfirmed, refetchAllowance]);

  useEffect(() => {
    if (approveError) toast.error('Failed to approve token');
  }, [approveError]);

  // Redirect on successful confirmation
  useEffect(() => {
    if (writeError) toast.error('Failed to create task');
  }, [writeError]);
  useEffect(() => {
    if (isConfirmed && txHash) {
      toast.success('Task created successfully!');
      router.push('/tasks');
    }
  }, [isConfirmed, txHash, router]);

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 200) {
      newErrors.title = 'Title must be 200 characters or less';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const validDeliverables = deliverables.filter((d) => d.description.trim());
    if (validDeliverables.length === 0) {
      newErrors.deliverables = 'At least one deliverable with a description is required';
    }

    if (!bountyAmount || parseFloat(bountyAmount) <= 0) {
      newErrors.bountyAmount = 'Bounty amount must be greater than 0';
    }

    const tags = parseTags(tagsInput);
    if (tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    if (deadline) {
      const deadlineDate = new Date(deadline);
      if (deadlineDate <= new Date()) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function parseTags(input: string): string[] {
    return input
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag) => tag.length > 0);
  }

  function addDeliverable() {
    setDeliverables([...deliverables, { type: 'code', description: '' }]);
  }

  function removeDeliverable(index: number) {
    if (deliverables.length <= 1) return;
    setDeliverables(deliverables.filter((_, i) => i !== index));
  }

  function updateDeliverable(index: number, field: keyof FormDeliverable, value: string) {
    const updated = [...deliverables];
    if (field === 'type') {
      updated[index] = { ...updated[index], type: value as DeliverableType };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setDeliverables(updated);
  }

  function handleApprove() {
    if (!selectedToken || !address) return;
    approveToken({
      address: selectedToken.address as `0x${string}`,
      abi: erc20Abi,
      functionName: 'approve',
      args: [BASE_SEPOLIA_ADDRESSES.escrowVault, bountyAmountParsed],
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    resetWrite();

    if (!validate()) return;
    if (!selectedToken) return;

    const tags = parseTags(tagsInput);
    const validDeliverables = deliverables
      .filter((d) => d.description.trim())
      .map((d) => ({ type: d.type, description: d.description.trim() }));

    // Build the task specification (matches TaskSpecification from @clawboy/shared-types)
    const spec = {
      version: '1.0' as const,
      title: title.trim(),
      description: description.trim(),
      deliverables: validDeliverables,
      tags: tags.length > 0 ? tags : undefined,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
    };

    let specCid: string;
    setIsUploading(true);
    try {
      const result = await uploadTaskSpec(spec as TaskSpecification);
      specCid = result.cid;
    } catch (err) {
      toast.error('Failed to upload task specification to IPFS');
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    const tokenAddress = selectedToken.address as `0x${string}`;
    const deadlineTimestamp = deadline
      ? BigInt(Math.floor(new Date(deadline).getTime() / 1000))
      : BigInt(0);

    writeContract({
      ...taskManagerConfig,
      functionName: 'createTask',
      args: [specCid, tokenAddress, bountyAmountParsed, deadlineTimestamp],
      value: isNativeToken(tokenAddress) ? bountyAmountParsed : BigInt(0),
    });
  }

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Connect your wallet to create a task.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Brief, descriptive title for your task"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <div className="flex justify-between">
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              <p className="text-xs text-muted-foreground ml-auto">{title.length}/200</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Detailed description of what needs to be done, acceptance criteria, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Deliverables */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Deliverables</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deliverables.map((deliverable, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-3 items-start">
              <div className="w-full sm:w-32 shrink-0">
                <Select
                  value={deliverable.type}
                  onValueChange={(value) => updateDeliverable(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERABLE_TYPES.map((dt) => (
                      <SelectItem key={dt.value} value={dt.value}>
                        {dt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Describe the deliverable"
                  value={deliverable.description}
                  onChange={(e) => updateDeliverable(index, 'description', e.target.value)}
                />
              </div>
              {deliverables.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeliverable(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDeliverable}>
            <Plus className="h-4 w-4 mr-1" />
            Add Deliverable
          </Button>
          {errors.deliverables && <p className="text-sm text-destructive">{errors.deliverables}</p>}
        </CardContent>
      </Card>

      {/* Bounty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bounty</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-2">
              <Label htmlFor="bountyAmount">Amount</Label>
              <Input
                id="bountyAmount"
                type="number"
                placeholder="0.00"
                min="0"
                step="any"
                value={bountyAmount}
                onChange={(e) => setBountyAmount(e.target.value)}
              />
              {errors.bountyAmount && (
                <p className="text-sm text-destructive">{errors.bountyAmount}</p>
              )}
            </div>
            <div className="w-full sm:w-36 space-y-2">
              <Label>Token</Label>
              <Select value={tokenSymbol} onValueChange={setTokenSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((token) => (
                    <SelectItem key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedToken && !isNativeToken(selectedToken.address) && (
            <p className="text-xs text-muted-foreground">
              ERC-20 tokens require a separate approval transaction before creating the task.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tags & Deadline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="e.g. solidity, frontend, data (comma-separated)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
            <div className="flex justify-between">
              {errors.tags && <p className="text-sm text-destructive">{errors.tags}</p>}
              <p className="text-xs text-muted-foreground ml-auto">
                {parseTags(tagsInput).length}/10 tags
              </p>
            </div>
            {tagsInput && (
              <div className="flex flex-wrap gap-1.5">
                {parseTags(tagsInput).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Deadline (optional)</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            {errors.deadline && <p className="text-sm text-destructive">{errors.deadline}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {(writeError || approveError) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {(writeError || approveError)!.message.slice(0, 300)}
        </div>
      )}

      {/* Transaction pending */}
      {txHash && !isConfirmed && (
        <p className="text-xs text-muted-foreground">
          Transaction submitted. Waiting for confirmation...
        </p>
      )}
      {approveHash && !isApproveConfirmed && (
        <p className="text-xs text-muted-foreground">
          Approval submitted. Waiting for confirmation...
        </p>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        {needsApproval ? (
          <Button
            type="button"
            onClick={handleApprove}
            disabled={isApprovePending || isApproveConfirming}
            className="min-w-[140px]"
          >
            {(isApprovePending || isApproveConfirming) && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            )}
            {isApprovePending
              ? 'Confirm in Wallet'
              : isApproveConfirming
                ? 'Approving...'
                : `Approve ${selectedToken?.symbol}`}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={isPending || isConfirming || isUploading}
            className="min-w-[140px]"
          >
            {(isPending || isConfirming || isUploading) && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            )}
            {isUploading
              ? 'Uploading...'
              : isPending
                ? 'Confirm in Wallet'
                : isConfirming
                  ? 'Confirming...'
                  : 'Create Task'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/tasks')}
          disabled={isPending || isConfirming || isApprovePending || isApproveConfirming}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
