'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

type TxState = 'pending' | 'success' | 'error';

interface TransactionStatusProps {
  open: boolean;
  onClose: () => void;
  state: TxState;
  txHash?: string;
  errorMessage?: string;
}

export function TransactionStatus({
  open,
  onClose,
  state,
  txHash,
  errorMessage,
}: TransactionStatusProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-sm text-center">
        <DialogHeader>
          <DialogTitle>
            {state === 'pending' && 'Transaction Pending'}
            {state === 'success' && 'Transaction Successful'}
            {state === 'error' && 'Transaction Failed'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {state === 'pending' && (
            <Loader2 className="h-16 w-16 animate-spin text-accent" />
          )}
          {state === 'success' && (
            <CheckCircle2 className="h-16 w-16 text-success" />
          )}
          {state === 'error' && (
            <XCircle className="h-16 w-16 text-danger" />
          )}

          {state === 'pending' && (
            <p className="text-sm text-muted">
              Waiting for transaction confirmation...
            </p>
          )}

          {state === 'success' && txHash && (
            <div className="w-full rounded-lg bg-default px-3 py-2">
              <p className="text-xs text-muted">Transaction Hash</p>
              <p className="break-all text-sm font-mono text-foreground">{txHash}</p>
            </div>
          )}

          {state === 'error' && errorMessage && (
            <p className="text-sm text-danger">{errorMessage}</p>
          )}
        </div>

        {state !== 'pending' && (
          <DialogFooter>
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
