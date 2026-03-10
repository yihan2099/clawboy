'use client';

import { useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { taskManagerConfig } from '@/lib/contracts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskActionsProps {
  chainTaskId: string;
  status: string;
  creatorAddress: string;
  submissions: { agentAddress: string; submissionIndex: number }[];
}

export function TaskActions({
  chainTaskId,
  status,
  creatorAddress,
  submissions,
}: TaskActionsProps) {
  const { address } = useAccount();

  const {
    writeContract: resolveTask,
    data: resolveHash,
    isPending: isResolving,
    error: resolveError,
  } = useWriteContract();

  const {
    writeContract: cancelTask,
    data: cancelHash,
    isPending: isCancelling,
    error: cancelError,
  } = useWriteContract();

  const { isLoading: isResolveConfirming, isSuccess: isResolveSuccess } =
    useWaitForTransactionReceipt({ hash: resolveHash });
  const { isLoading: isCancelConfirming, isSuccess: isCancelSuccess } =
    useWaitForTransactionReceipt({ hash: cancelHash });

  useEffect(() => {
    if (isResolveSuccess) toast.success('Task resolved, bounties distributed!');
  }, [isResolveSuccess]);
  useEffect(() => {
    if (isCancelSuccess) toast.success('Task cancelled, bounty refunded');
  }, [isCancelSuccess]);
  useEffect(() => {
    if (resolveError) toast.error('Failed to resolve task');
  }, [resolveError]);
  useEffect(() => {
    if (cancelError) toast.error('Failed to cancel task');
  }, [cancelError]);

  const taskId = BigInt(chainTaskId);

  if (!address) return null;

  // Both addresses are lowercased before comparison. Ethereum addresses are case-insensitive
  // (EIP-55 checksum casing is optional), but wagmi returns the connected address in checksum
  // form while database values may be stored in lowercase. Normalizing both sides avoids
  // false negatives when the casing differs.
  const isCreator = address.toLowerCase() === creatorAddress.toLowerCase();

  const error = resolveError || cancelError;
  const isAnyPending =
    isResolving ||
    isCancelling ||
    isResolveConfirming ||
    isCancelConfirming;

  return (
    <>
      {/* Creator Actions */}
      {isCreator && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Creator Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {error.message}
              </div>
            )}

            {status === 'judge_phase' && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Once all judgments are in, resolve the task to distribute bounties via consensus.
                </p>
                <Button
                  disabled={isAnyPending}
                  onClick={() => {
                    resolveTask({
                      ...taskManagerConfig,
                      functionName: 'resolve',
                      args: [taskId],
                    });
                  }}
                >
                  {isResolving || isResolveConfirming ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Resolve Task
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              {status === 'open' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isAnyPending}>
                      Cancel Task
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancel this task?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will cancel the task and refund the bounty to your wallet. This cannot
                        be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Task</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          cancelTask({
                            ...taskManagerConfig,
                            functionName: 'cancelTask',
                            args: [taskId],
                          });
                        }}
                      >
                        Cancel Task
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {status === 'open' && submissions.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No submissions yet. Actions will appear once agents submit work.
              </p>
            )}

            {(resolveHash || cancelHash) && (
              <p className="text-xs text-muted-foreground">
                Transaction submitted. Waiting for confirmation...
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
