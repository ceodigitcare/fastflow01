import React, { useState, useEffect } from 'react';
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
  Clock,
  X,
  User,
  BookOpen,
  DollarSign,
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
import { Separator } from "@/components/ui/separator";

interface TransactionVersionHistoryProps {
  transactionId: number;
  onClose?: () => void;
}

interface ChangeSummary {
  field: string;
  oldValue: any;
  newValue: any;
}

export default function TransactionVersionHistory({ transactionId, onClose }: TransactionVersionHistoryProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  // Simplified state management - removed restore-related state
  const [changeSummaries, setChangeSummaries] = useState<Map<number, ChangeSummary[]>>(new Map());

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
    enabled: !!transactionId,
  });

  // Compute change summaries when versions change
  useEffect(() => {
    if (!versions || versions.length <= 1) return;
    
    const summaries = new Map<number, ChangeSummary[]>();
    
    // Start from the second version (index 1), as the first version has no "previous" version
    for (let i = versions.length - 2; i >= 0; i--) {
      const currentVersion = versions[i];
      const previousVersion = versions[i + 1];
      
      if (!currentVersion || !previousVersion) continue;
      
      const currentData = currentVersion.data as any;
      const previousData = previousVersion.data as any;
      
      // Skip if data is not available
      if (!currentData || !previousData) continue;
      
      const changes: ChangeSummary[] = [];
      
      // Check for changes in amount
      if (currentData.amount !== previousData.amount) {
        changes.push({
          field: 'Amount',
          oldValue: previousData.amount / 100, // Convert cents to dollars for display
          newValue: currentData.amount / 100
        });
      }
      
      // Check for changes in status
      if (currentData.status !== previousData.status) {
        changes.push({
          field: 'Status',
          oldValue: previousData.status,
          newValue: currentData.status
        });
      }
      
      // Check for changes in payment received
      if (currentData.paymentReceived !== previousData.paymentReceived) {
        changes.push({
          field: 'Payment Received',
          oldValue: previousData.paymentReceived / 100, // Convert cents to dollars for display
          newValue: currentData.paymentReceived / 100
        });
      }
      
      // Check for changes in date
      if (new Date(currentData.date).toDateString() !== new Date(previousData.date).toDateString()) {
        changes.push({
          field: 'Date',
          oldValue: format(new Date(previousData.date), 'MMM dd, yyyy'),
          newValue: format(new Date(currentData.date), 'MMM dd, yyyy')
        });
      }
      
      // Check for changes in items (more complex)
      if (Array.isArray(currentData.items) && Array.isArray(previousData.items)) {
        if (currentData.items.length !== previousData.items.length) {
          changes.push({
            field: 'Items',
            oldValue: `${previousData.items.length} items`,
            newValue: `${currentData.items.length} items`
          });
        } else {
          // Check for changes in item quantities
          for (let j = 0; j < currentData.items.length; j++) {
            const currentItem = currentData.items[j];
            const previousItem = previousData.items[j];
            
            if (currentItem.quantity !== previousItem.quantity) {
              changes.push({
                field: `Item #${j + 1} Quantity`,
                oldValue: previousItem.quantity,
                newValue: currentItem.quantity
              });
            }
            
            // Check for changes in item received quantities
            if (currentItem.quantityReceived !== previousItem.quantityReceived) {
              changes.push({
                field: `Item #${j + 1} Received`,
                oldValue: previousItem.quantityReceived || 0,
                newValue: currentItem.quantityReceived || 0
              });
            }
          }
        }
      }
      
      // Add other change checks as needed
      
      summaries.set(currentVersion.id, changes);
    }
    
    setChangeSummaries(summaries);
  }, [versions]);

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

  // Handle toggling version importance
  const handleToggleImportant = (versionId: number, currentImportant: boolean) => {
    markImportantMutation.mutate({ versionId, important: !currentImportant });
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Removed restore functionality as requested

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h4 className="font-medium">Version History</h4>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <div>
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
          <ScrollArea className="h-[400px]">
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
                    
                    {version.userId && (
                      <div className="ml-3 flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        <span>User ID: {version.userId}</span>
                      </div>
                    )}
                  </div>
                  
                  {version.changeDescription && (
                    <p className="text-sm mb-2">{version.changeDescription}</p>
                  )}
                  
                  {/* Change summary section */}
                  {changeSummaries.has(version.id) && changeSummaries.get(version.id)?.length > 0 && (
                    <div className="mt-3 mb-3 bg-gray-50 p-2 rounded-md">
                      <p className="text-sm font-medium mb-1 flex items-center">
                        <BookOpen className="h-4 w-4 mr-1" /> Changes:
                      </p>
                      <div className="space-y-1">
                        {changeSummaries.get(version.id)?.map((change, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{change.field}:</span>{' '}
                            <span className="text-red-500 line-through">
                              {change.field.includes('Amount') || change.field.includes('Payment') 
                                ? formatCurrency(change.oldValue) 
                                : change.oldValue}
                            </span>{' '}
                            <span className="text-green-500">
                              {change.field.includes('Amount') || change.field.includes('Payment') 
                                ? formatCurrency(change.newValue) 
                                : change.newValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Restore button removed as requested */}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

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