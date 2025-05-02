import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Transaction, User, Account, Product } from "@shared/schema";
import { SalesInvoice, SalesInvoiceItem } from "@/lib/validation";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { PlusCircle, Search, Printer, Clock, CheckCircle, AlertTriangle, MessageCircle } from "lucide-react";
import SalesInvoiceFormSplit from "./SalesInvoiceFormSplit";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { InvoicePrintDialog } from "./InvoicePrint";

interface SalesInvoiceSplitViewProps {
  businessData?: any;
}

export default function SalesInvoiceSplitView({ businessData }: SalesInvoiceSplitViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  // Get invoices from transactions
  const { data: invoices, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    select: (transactions) => {
      return transactions.filter(transaction => 
        transaction.type === "income" && 
        transaction.documentType === "invoice"
      ).sort((a, b) => {
        // Sort by date descending (newest first)
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
  });

  // Get customers, accounts, and products needed for the form
  const { data: customers, isLoading: customersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.type === "customer")
  });
  
  const { data: accounts, isLoading: accountsLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
    select: (accounts) => accounts.filter(account => 
      account.isActive && 
      (account.name.toLowerCase().includes("bank") || 
       account.name.toLowerCase().includes("cash"))
    )
  });
  
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Filter invoices based on search query
  const filteredInvoices = invoices?.filter(invoice => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      invoice.documentNumber?.toLowerCase().includes(query) ||
      invoice.contactName?.toLowerCase().includes(query) ||
      invoice.status?.toLowerCase().includes(query)
    );
  });

  // Create a new invoice
  const handleCreateNew = () => {
    setSelectedInvoice(null);
    setIsCreatingNew(true);
  };

  // View an existing invoice
  const handleSelectInvoice = (invoice: Transaction) => {
    setSelectedInvoice(invoice);
    setIsCreatingNew(false);
  };

  // Print invoice
  const handlePrintInvoice = () => {
    if (!selectedInvoice) return;
    setIsPrintDialogOpen(true);
  };

  // Share invoice via WhatsApp
  const handleShareWhatsApp = () => {
    if (!selectedInvoice) return;
    
    // Prepare WhatsApp message
    const customerPhone = selectedInvoice.contactPhone;
    if (!customerPhone) {
      toast({
        title: "Missing Phone Number",
        description: "Customer phone number is required for WhatsApp sharing.",
        variant: "destructive",
      });
      return;
    }
    
    // Format the message
    const message = `Dear ${selectedInvoice.contactName},\n\nYour invoice #${selectedInvoice.documentNumber} for ${formatCurrency(selectedInvoice.amount / 100)} is ready. Thank you for your business!\n\nRegards,\n${businessData?.name || 'Business Name'}`;
    
    // Create WhatsApp link (remove any non-digits from phone)
    const phone = customerPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // Open in new window
    window.open(whatsappUrl, '_blank');
  };

  // Function to get status badge
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Paid</span>;
      case "sent":
        return <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Sent</span>;
      case "overdue":
        return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Overdue</span>;
      case "draft":
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">Draft</span>;
      case "cancelled":
        return <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">Cancelled</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">{status}</span>;
    }
  };

  return (
    <div className="flex h-[calc(100vh-250px)] border rounded-md">
      {/* Left panel for viewing/editing invoice */}
      <div className="flex-1 overflow-auto border-r p-6">
        {selectedInvoice ? (
          <div className="space-y-6">
            {/* Invoice View Mode */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Invoice #{selectedInvoice.documentNumber}</h2>
                <p className="text-gray-500">
                  {selectedInvoice.date && format(new Date(selectedInvoice.date), "PP")}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={handlePrintInvoice}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            </div>

            {/* Business Information */}
            <div className="flex justify-between">
              <div>
                <h3 className="font-bold text-lg">{businessData?.name || "Business Name"}</h3>
                <p>{businessData?.email || "business@example.com"}</p>
                <p>{businessData?.phone || "+1234567890"}</p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-gray-200 rounded-lg px-4 py-2 mb-4">
                  <h3 className="text-lg font-bold">INVOICE</h3>
                </div>
                <p><span className="font-semibold">Date:</span> {selectedInvoice.date && format(new Date(selectedInvoice.date), "PP")}</p>
                <p><span className="font-semibold">Invoice:</span> #{selectedInvoice.documentNumber}</p>
                <p><span className="font-semibold">Status:</span> {getStatusBadge(selectedInvoice.status)}</p>
              </div>
            </div>

            {/* Customer Information */}
            <div className="border-t border-b py-4 my-4">
              <h3 className="font-semibold mb-2">Bill To:</h3>
              <p className="font-bold">{selectedInvoice.contactName}</p>
              <p>{selectedInvoice.contactEmail}</p>
              <p>{selectedInvoice.contactPhone}</p>
              <p>{selectedInvoice.contactAddress}</p>
            </div>

            {/* Invoice Items */}
            <div className="border rounded-md">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Item</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Qty</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {Array.isArray(selectedInvoice.items) && selectedInvoice.items.length > 0 ? (
                    selectedInvoice.items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2">{item.description}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-center text-gray-500">No items</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Invoice Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedInvoice.amount / 100)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedInvoice.amount / 100)}</span>
                </div>
                <div className="flex justify-between text-gray-500 italic text-sm">
                  <span>Balance due:</span>
                  <span>{formatCurrency(selectedInvoice.amount / 100)}</span>
                </div>
              </div>
            </div>

            {/* Invoice Notes */}
            {selectedInvoice.notes && (
              <div className="border-t pt-4 mt-6">
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
              </div>
            )}

            {/* Customer Signature Line */}
            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between">
                <div className="w-1/3 border-t border-gray-300 mt-8 pt-2 text-center">
                  <p className="text-sm text-gray-600">Customer's signature</p>
                </div>
                <div className="w-1/3 text-center">
                  <p className="text-sm text-gray-600">Prepared by</p>
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
              <h2 className="text-2xl font-bold">New Invoice</h2>
              <Button variant="ghost" onClick={() => setIsCreatingNew(false)}>
                Cancel
              </Button>
            </div>
            <SalesInvoiceFormSplit
              onCancel={() => setIsCreatingNew(false)}
              onSave={(invoice) => {
                setSelectedInvoice(invoice);
                setIsCreatingNew(false);
              }}
              editingInvoice={null}
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Select an invoice</h2>
              <p className="text-gray-500">Select an invoice from the list or create a new one</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Right panel for invoice list */}
      <div className="w-80 flex flex-col border-l">
        <div className="p-3 border-b sticky top-0 bg-white">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search invoices..."
              className="pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <p>Loading invoices...</p>
            </div>
          ) : filteredInvoices && filteredInvoices.length > 0 ? (
            <div>
              {filteredInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  className={`w-full text-left p-3 hover:bg-gray-50 border-b ${selectedInvoice?.id === invoice.id ? 'bg-blue-50' : ''}`}
                  onClick={() => handleSelectInvoice(invoice)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{invoice.documentNumber}</p>
                      <p className="text-sm text-gray-600 truncate">{invoice.contactName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {invoice.date && format(new Date(invoice.date), "MM/dd/yy")}
                      </p>
                      <div className="mt-1">{getStatusBadge(invoice.status)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <p>No invoices found</p>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t sticky bottom-0 bg-white">
          <Button 
            className="w-full" 
            variant="default" 
            onClick={handleCreateNew}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Print dialog */}
      <InvoicePrintDialog
        open={isPrintDialogOpen}
        onOpenChange={setIsPrintDialogOpen}
        invoice={selectedInvoice}
      />
    </div>
  );
}
