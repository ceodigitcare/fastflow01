import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { TransactionVersion, User as UserType, Account, Product } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Star,
  History,
  Clock,
  X,
  User,
} from 'lucide-react';
import { queryClient } from '@/lib/queryClient';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';

interface TransactionVersionHistoryProps {
  transactionId: number;
  onClose?: () => void;
}

interface ChangeSummary {
  field: string;
  oldValue: any;
  newValue: any;
  accountName?: string; // For amount changes
  productName?: string; // For item changes
}

export default function TransactionVersionHistory({ transactionId, onClose }: TransactionVersionHistoryProps) {
  const { toast } = useToast();
  const [changeSummaries, setChangeSummaries] = useState<Map<number, ChangeSummary[]>>(new Map());
  const [userMap, setUserMap] = useState<Map<number, string>>(new Map());
  const [accountMap, setAccountMap] = useState<Map<number, string>>(new Map());
  const [productMap, setProductMap] = useState<Map<number, string>>(new Map());
  
  // Fetch all users to map user IDs to names
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      return response.json() as Promise<UserType[]>;
    }
  });

  // Fetch all accounts to map account IDs to names
  const { data: accounts } = useQuery({
    queryKey: ['/api/accounts'],
    queryFn: async () => {
      const response = await fetch('/api/accounts');
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json() as Promise<Account[]>;
    }
  });

  // Fetch all products to map product IDs to names
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await fetch('/api/products');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json() as Promise<Product[]>;
    }
  });

  // Build a map of user IDs to names
  useEffect(() => {
    if (users && users.length > 0) {
      const map = new Map<number, string>();
      users.forEach(user => {
        if (user.id) {
          map.set(user.id, user.name);
        }
      });
      setUserMap(map);
    }
  }, [users]);

  // Build a map of account IDs to names
  useEffect(() => {
    if (accounts && accounts.length > 0) {
      const map = new Map<number, string>();
      accounts.forEach(account => {
        if (account.id) {
          map.set(account.id, account.name);
        }
      });
      setAccountMap(map);
    }
  }, [accounts]);

  // Build a map of product IDs to names
  useEffect(() => {
    if (products && products.length > 0) {
      const map = new Map<number, string>();
      products.forEach(product => {
        if (product.id) {
          map.set(product.id, product.name);
        }
      });
      setProductMap(map);
    }
  }, [products]);
  
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
        const accountName = currentData.accountId ? accountMap.get(currentData.accountId) : undefined;
        changes.push({
          field: 'Amount',
          oldValue: previousData.amount / 100, // Convert cents to dollars for display
          newValue: currentData.amount / 100,
          accountName
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
        const accountName = currentData.accountId ? accountMap.get(currentData.accountId) : undefined;
        changes.push({
          field: 'Payment Received',
          oldValue: previousData.paymentReceived / 100, // Convert cents to dollars for display
          newValue: currentData.paymentReceived / 100,
          accountName
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
            
            const productName = currentItem.productId ? productMap.get(currentItem.productId) : undefined;
            
            if (currentItem.quantity !== previousItem.quantity) {
              changes.push({
                field: 'Item Quantity',
                oldValue: previousItem.quantity,
                newValue: currentItem.quantity,
                productName
              });
            }
            
            // Check for changes in item received quantities
            if (currentItem.quantityReceived !== previousItem.quantityReceived) {
              changes.push({
                field: 'Item Received',
                oldValue: previousItem.quantityReceived || 0,
                newValue: currentItem.quantityReceived || 0,
                productName
              });
            }
          }
        }
      }
      
      summaries.set(currentVersion.id, changes);
    }
    
    setChangeSummaries(summaries);
  }, [versions, accountMap, productMap]);

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
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{version.timestamp ? formatDateTime(version.timestamp) : "No timestamp available"}</span>
                    </div>
                    <div className="flex items-center mt-1">
                      <User className="h-3 w-3 mr-1" />
                      <span>
                        {version.userId && userMap.has(version.userId) 
                          ? userMap.get(version.userId) 
                          : version.userId 
                            ? `Unknown User (ID: ${version.userId})` 
                            : "System Action"}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-2">
                    <p className="text-sm">{version.changeDescription}</p>
                  </div>
                  
                  {changeSummaries.has(version.id) && changeSummaries.get(version.id)?.length ? (
                    <div className="mt-2 border-t pt-2">
                      <div className="text-xs font-medium mb-1">Changes:</div>
                      <div className="space-y-1">
                        {changeSummaries.get(version.id)?.map((change, idx) => (
                          <div key={idx} className="text-xs">
                            <span className="font-medium">{change.field}:</span>{' '}
                            <span className="text-red-500">
                              {change.field.includes('Amount') || change.field.includes('Payment') 
                                ? formatCurrency(change.oldValue) 
                                : change.oldValue}
                            </span>{' '}
                            →{' '}
                            <span className="text-green-500">
                              {change.field.includes('Amount') || change.field.includes('Payment') 
                                ? formatCurrency(change.newValue) 
                                : change.newValue}
                            </span>
                            {/* Show account name for amount changes */}
                            {change.accountName && (change.field.includes('Amount') || change.field.includes('Payment')) && (
                              <span className="text-blue-600 ml-1">
                                → Account: {change.accountName}
                              </span>
                            )}
                            {/* Show product name for item changes */}
                            {change.productName && (change.field.includes('Item')) && (
                              <span className="text-purple-600 ml-1">
                                → Product: {change.productName}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </>
  );
}