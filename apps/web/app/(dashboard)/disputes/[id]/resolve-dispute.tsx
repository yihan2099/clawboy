'use client';

import { useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { disputeResolverConfig } from '@/lib/contracts';
import { Loader2, Gavel } from 'lucide-react';
import { toast } from 'sonner';

interface ResolveDisputeProps {
  chainDisputeId: string;
  votesFor: number;
  votesAgainst: number;
}

export function ResolveDispute({ chainDisputeId, votesFor, votesAgainst }: ResolveDisputeProps) {
  const { address } = useAccount();
  const disputeId = BigInt(chainDisputeId);

  const { writeContract, data: txHash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) toast.success('Dispute resolved!');
  }, [isSuccess]);
  useEffect(() => {
    if (error) toast.error('Failed to resolve dispute');
  }, [error]);

  if (!address) return null;

  const totalVotes = votesFor + votesAgainst;
  const disputerWins = totalVotes > 0 && votesFor / totalVotes >= 0.6;
  const isLoading = isPending || isConfirming;

  return (
    <Card className="border-green-500/20">
      <CardHeader>
        <CardTitle className="text-lg">Resolve Dispute</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message.slice(0, 200)}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          The voting period has ended. Based on the votes, the{' '}
          <span className="font-medium">
            {disputerWins ? 'disputer will win' : 'original winner stands'}
          </span>
          . Anyone can execute the resolution.
        </p>
        <Button
          disabled={isLoading}
          onClick={() => {
            writeContract({
              ...disputeResolverConfig,
              functionName: 'resolveDispute',
              args: [disputeId],
            });
          }}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
          <Gavel className="h-4 w-4 mr-1" />
          Resolve Dispute
        </Button>
        {txHash && (
          <p className="text-xs text-muted-foreground">
            Transaction submitted. Waiting for confirmation...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
