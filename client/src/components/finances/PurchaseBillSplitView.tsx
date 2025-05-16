import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Transaction, User, Account, Product } from "@shared/schema";
import { PurchaseBill, PurchaseBillItem } from "@/lib/validation";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PlusCircle, Search, Printer, Clock, CheckCircle, AlertTriangle, MessageCircle } from "lucide-react";
import PurchaseBillFormSplit from "./PurchaseBillFormSplit";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BillPrintDialog } from "./BillPrint";

interface PurchaseBillSplitViewProps {
  businessData?: any;
}

export default function PurchaseBillSplitView({ businessData }: PurchaseBillSplitViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  // Get bills from transactions
  const { data: bills, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    select: (transactions) => {
      return transactions.filter(transaction => 
        transaction.type === "expense" && 
        transaction.documentType === "bill"
      ).sort((a, b) => {
        // Sort by date descending (newest first)
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
  });
  
  // Get vendors
  const { data: vendors } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.type === "vendor")
  });
  
  // Handle search
  const filteredBills = bills?.filter(bill => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (bill.documentNumber && bill.documentNumber.toLowerCase().includes(query)) ||
      (bill.contactName && bill.contactName.toLowerCase().includes(query)) ||
      (bill.description && bill.description.toLowerCase().includes(query))
    );
  });
  
  // Handle print bill
  const handlePrintBill = () => {
    if (selectedBill) {
      setIsPrintDialogOpen(true);
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    
    switch(status) {
      case "draft":
        return (
          <div className="flex items-center text-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            <span className="text-xs">Draft</span>
          </div>
        );
      case "received":
        return (
          <div className="flex items-center text-blue-500">
            <MessageCircle className="w-3 h-3 mr-1" />
            <span className="text-xs">Received</span>
          </div>
        );
      case "paid":
        return (
          <div className="flex items-center text-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            <span className="text-xs">Paid</span>
          </div>
        );
      case "overdue":
        return (
          <div className="flex items-center text-red-500">
            <AlertTriangle className="w-3 h-3 mr-1" />
            <span className="text-xs">Overdue</span>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="flex flex-col lg:flex-row lg:space-x-6 h-full">
      {/* Left panel for bill view/form */}
      <div className="lg:flex-1 mb-6 lg:mb-0">
        {selectedBill ? (
          <div className="space-y-6 bg-white p-6 border rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">Bill #{selectedBill.documentNumber}</h2>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrintBill}>
                  <Printer className="w-4 h-4 mr-1" /> Print
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedBill(null)}>
                  Close
                </Button>
              </div>
            </div>
            
            {/* Bill Header */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">From:</h3>
                <p className="font-medium">{selectedBill.contactName}</p>
                <p className="text-sm text-gray-600">{selectedBill.contactEmail}</p>
                <p className="text-sm text-gray-600">{selectedBill.contactPhone}</p>
                <p className="text-sm text-gray-600">{selectedBill.contactAddress}</p>
              </div>
              <div className="text-right">
                <h3 className="font-semibold mb-2">To:</h3>
                <p className="font-medium">{businessData?.name || "My Business"}</p>
                <p className="text-sm text-gray-600">{businessData?.email || "business@example.com"}</p>
                <p className="text-sm text-gray-600">{businessData?.phone || "+1 (555) 123-4567"}</p>
                <p className="text-sm text-gray-600">{businessData?.address || "123 Business St, Demo City"}</p>
              </div>
            </div>
            
            {/* Bill Details */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
              <div>
                <p className="text-sm text-gray-500">Bill Date</p>
                <p className="font-medium">{selectedBill.date ? format(new Date(selectedBill.date), "PPP") : "-"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Bill Number</p>
                <p className="font-medium">{selectedBill.documentNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <div className="font-medium">{getStatusBadge(selectedBill.status)}</div>
              </div>
            </div>
            
            {/* Bill Items */}
            <div>
              <h3 className="font-semibold mb-3">Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.isArray(selectedBill.items) && selectedBill.items.map((item: any, index: number) => (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium">{item.description}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Bill Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      Array.isArray(selectedBill.items) 
                        ? selectedBill.items.reduce((sum: number, item: any) => sum + item.amount, 0) 
                        : 0
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold">{formatCurrency(selectedBill.amount / 100)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Payment Made:</span>
                  <span className="font-medium">{formatCurrency((selectedBill.paymentReceived || 0) / 100)}</span>
                </div>
                {(selectedBill.paymentReceived || 0) < selectedBill.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance Due:</span>
                    <span className="font-bold text-red-500">
                      {formatCurrency((selectedBill.amount - (selectedBill.paymentReceived || 0)) / 100)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Notes */}
            {selectedBill.notes && (
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-gray-600">{selectedBill.notes}</p>
              </div>
            )}
            
            {/* Signature Line */}
            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between">
                <div className="w-1/3 border-t border-gray-300 mt-8 pt-2 text-center">
                  <p className="text-sm text-gray-600">Vendor's signature</p>
                </div>
                <div className="w-1/3 text-center">
                  <p className="text-sm text-gray-600">Received by</p>
                  <p className="font-semibold">{businessData?.name || "Business Name"}</p>
                </div>
                <div className="w-1/3 text-right">
                  <p className="text-sm text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        ) : isCreatingNew ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">New Purchase Bill</h2>
              <Button variant="ghost" onClick={() => setIsCreatingNew(false)}>
                Cancel
              </Button>
            </div>
            <PurchaseBillFormSplit
              onCancel={() => setIsCreatingNew(false)}
              onSave={(bill) => {
                setSelectedBill(bill);
                setIsCreatingNew(false);
              }}
              editingBill={null}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <h3 className="text-xl font-semibold mb-2">No Purchase Bill Selected</h3>
              <p className="text-gray-500 mb-6">Select a bill from the list or create a new one to get started.</p>
              <Button onClick={() => setIsCreatingNew(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Purchase Bill
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Right panel for bill list */}
      <div className="lg:w-80 space-y-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Search bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedBill(null);
              setIsCreatingNew(true);
            }}
            title="Create New Purchase Bill"
          >
            <PlusCircle className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="bg-muted/40 rounded-lg">
          <div className="p-2 font-medium text-sm">Purchase Bills</div>
          {isLoading ? (
            <div className="p-6 text-center">
              <p>Loading...</p>
            </div>
          ) : filteredBills && filteredBills.length > 0 ? (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {filteredBills.map((bill) => (
                <div 
                  key={bill.id}
                  className={`p-3 cursor-pointer hover:bg-muted transition-colors ${selectedBill?.id === bill.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedBill(bill)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{bill.documentNumber}</p>
                      <p className="text-sm text-gray-500">{bill.contactName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(bill.amount / 100)}</p>
                      {getStatusBadge(bill.status)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {bill.date ? format(new Date(bill.date), "MMM d, yyyy") : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No bills found</p>
              <Button 
                variant="link" 
                onClick={() => setIsCreatingNew(true)}
                className="mt-2"
              >
                Create your first bill
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Print Dialog */}
      <BillPrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        bill={selectedBill}
        businessData={businessData}
      />
    </div>
  );
}