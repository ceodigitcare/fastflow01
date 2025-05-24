import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TransactionVersion } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Star,
  History,
  ArrowUpRight,
  CornerDownLeft,
  AlertCircle,
  Trash,
  Clock
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';

interface TransactionVersionHistoryProps {
  transactionId: number;
}

export default function TransactionVersionHistory({ transactionId }: TransactionVersionHistoryProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TransactionVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);

  // Fetch version history
  const { data: versions, isLoading } = useQuery({
    queryKey: ['/api/transactions', transactionId, 'versions'],
    queryFn: async () => {
      const response = await fetch(`/api/transactions/${transactionId}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch version history');
      }
      return response.json() as Promise<TransactionVersion[]>;
    },
    enabled: isOpen && !!transactionId,
  });

  // Mutation to mark a version as important
  const markImportantMutation = useMutation({
    mutationFn: async ({ versionId, important }: { versionId: number; important: boolean }) => {
      const response = await fetch(`/api/transactions/${transactionId}/versions/${versionId}/important`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ important }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update version importance');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transactionId, 'versions'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mutation to restore a version
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const response = await fetch(`/api/transactions/${transactionId}/versions/${versionId}/restore`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to restore version');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Version restored successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions', transactionId, 'versions'] });
      setShowRestoreDialog(false);
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleToggleImportant = (versionId: number, currentImportant: boolean) => {
    markImportantMutation.mutate({ versionId, important: !currentImportant });
  };

  const handleRestore = (version: TransactionVersion) => {
    setSelectedVersion(version);
    setShowRestoreDialog(true);
  };

  const confirmRestore = () => {
    if (selectedVersion) {
      restoreVersionMutation.mutate(selectedVersion.id);
    }
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'create':
        return <Badge className="bg-green-500">Created</Badge>;
      case 'update':
        return <Badge className="bg-blue-500">Updated</Badge>;
      case 'delete':
        return <Badge className="bg-red-500">Deleted</Badge>;
      case 'restore':
        return <Badge className="bg-purple-500">Restored</Badge>;
      case 'pre-restore':
        return <Badge className="bg-gray-500">Backup</Badge>;
      default:
        return <Badge>{changeType}</Badge>;
    }
  };

  const formatDateTime = (timestamp: Date) => {
    return format(new Date(timestamp), 'MMM dd, yyyy h:mm a');
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            Version History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Version History</SheetTitle>
            <SheetDescription>
              View and restore previous versions of this transaction.
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <p>Loading version history...</p>
              </div>
            ) : !versions || versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <History className="h-10 w-10 mb-2" />
                <p>No version history available</p>
              </div>
            ) : (
              <ScrollArea className="h-[65vh]">
                <div className="space-y-4">
                  {versions.map((version) => (
                    <div 
                      key={version.id} 
                      className={`p-4 border rounded-md ${
                        version.important ? 'border-yellow-400 bg-yellow-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          {getChangeTypeIcon(version.changeType)}
                          <span className="ml-2 font-semibold">
                            Version {version.version}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleImportant(version.id, !!version.important)}
                          disabled={markImportantMutation.isPending}
                        >
                          <Star
                            className={`h-4 w-4 ${
                              version.important ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
                            }`}
                          />
                        </Button>
                      </div>
                      
                      <div className="text-sm text-gray-500 mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDateTime(version.timestamp as unknown as Date)}
                      </div>
                      
                      {version.changeDescription && (
                        <p className="text-sm mb-2">{version.changeDescription}</p>
                      )}
                      
                      <div className="flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                          disabled={restoreVersionMutation.isPending}
                        >
                          <CornerDownLeft className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Version</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this transaction to version {selectedVersion?.version}? 
              This will overwrite the current version.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore}>
              {restoreVersionMutation.isPending ? 'Restoring...' : 'Restore'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}