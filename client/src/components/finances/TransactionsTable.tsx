import { useState } from "react";
import { Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Search, 
  Filter, 
  Plus, 
  FileText, 
  ExternalLink, 
  Printer, 
  Share2, 
  Copy,
  Package
} from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TransactionsTableProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
  onNewTransaction?: () => void;
}

export default function TransactionsTable({ 
  transactions, 
  isLoading, 
  onNewTransaction 
}: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [documentViewOpen, setDocumentViewOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const itemsPerPage = 10;
  
  // Filter transactions based on search term and type filter
  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.orderId?.toString().includes(searchTerm) ||
      transaction.id.toString().includes(searchTerm) ||
      transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    
    return matchesSearch && matchesType;
  });
  
  // Pagination
  const totalPages = filteredTransactions 
    ? Math.ceil(filteredTransactions.length / itemsPerPage) 
    : 0;
  
  const paginatedTransactions = filteredTransactions?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // Render type badge
  const renderTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "income":
        return <Badge className="bg-success hover:bg-success">{type}</Badge>;
      case "expense":
        return <Badge className="bg-destructive hover:bg-destructive">{type}</Badge>;
      case "transfer":
        return <Badge className="bg-secondary hover:bg-secondary">{type}</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };
  
  // Get document type based on transaction type
  const getDocumentType = (type: string) => {
    switch (type.toLowerCase()) {
      case "income":
        return "Invoice";
      case "expense":
        return "Bill";
      case "transfer":
        return "Voucher";
      default:
        return "Document";
    }
  };
  
  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    });
  };
  
  // Function to share via WhatsApp
  const shareViaWhatsApp = (transaction: Transaction) => {
    const businessName = "Your Business Name"; // Replace with actual business name from context
    const docType = getDocumentType(transaction.type);
    const docNumber = transaction.documentNumber || `DOC-${transaction.id}`;
    const amount = formatCurrency(transaction.amount);
    
    // Create share text
    const shareText = `${businessName} ${docType} ${docNumber}\n` +
      `Amount: ${amount}\n` +
      `Date: ${formatDate(transaction.date)}\n` +
      (transaction.contactName ? `Contact: ${transaction.contactName}\n` : '') +
      (transaction.description ? `Description: ${transaction.description}\n` : '') +
      `\nThank you for your business!`;
    
    // Encode for URL
    const encodedText = encodeURIComponent(shareText);
    
    // Open WhatsApp in new tab
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>Manage your financial transactions</CardDescription>
            </div>
            <div className="flex gap-2">
              {onNewTransaction && (
                <Button onClick={onNewTransaction}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Transaction
                </Button>
              )}
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pb-0 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by description, category..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
            />
          </div>
          <div className="flex gap-2">
            <Select 
              value={typeFilter} 
              onValueChange={(value) => {
                setTypeFilter(value);
                setCurrentPage(1); // Reset to first page on filter
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-8"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-32"></div></TableCell>
                  <TableCell className="text-right"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></TableCell>
                </TableRow>
              ))
            ) : paginatedTransactions?.length ? (
              paginatedTransactions.map((transaction) => (
                <TableRow 
                  key={transaction.id} 
                  className="hover:bg-gray-50"
                  onClick={() => {
                    setSelectedTransaction(transaction);
                    setDocumentViewOpen(true);
                  }}
                >
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{renderTypeBadge(transaction.type)}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description || "N/A"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-medium ${transaction.type === "income" ? "text-green-600" : transaction.type === "expense" ? "text-red-600" : ""}`}>
                        {transaction.type === "expense" ? "-" : ""}{formatCurrency(transaction.amount)}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTransaction(transaction);
                                setDocumentViewOpen(true);
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Document</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm || typeFilter !== "all" ? (
                    <>
                      <p className="text-gray-500">No matching transactions found</p>
                      <Button 
                        variant="link"
                        onClick={() => {
                          setSearchTerm("");
                          setTypeFilter("all");
                        }}
                      >
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <p className="text-gray-500">No transactions yet</p>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Pagination */}
      {filteredTransactions?.length ? (
        <CardFooter className="flex justify-between items-center p-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredTransactions.length)} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of{" "}
            {filteredTransactions.length} transactions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
    
    {/* Document Viewer Drawer */}
    <Drawer open={documentViewOpen} onOpenChange={setDocumentViewOpen}>
      <DrawerContent className="max-w-4xl mx-auto">
        <DrawerHeader className="border-b">
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {selectedTransaction && 
              `${getDocumentType(selectedTransaction.type)} #${selectedTransaction.documentNumber || `DOC-${selectedTransaction.id}`}`
            }
          </DrawerTitle>
          <DrawerDescription>
            View and share transaction document
          </DrawerDescription>
        </DrawerHeader>

        {selectedTransaction && (
          <div className="p-6">
            <div className="bg-white border rounded-lg p-8 mx-auto max-w-3xl">
              {/* Document Header */}
              <div className="flex justify-between border-b pb-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    {getDocumentType(selectedTransaction.type)}
                  </h2>
                  <p className="text-gray-500">
                    #{selectedTransaction.documentNumber || `DOC-${selectedTransaction.id}`}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-medium">Your Business Name</h3>
                  <p className="text-gray-500 text-sm">123 Business Street</p>
                  <p className="text-gray-500 text-sm">City, Country, ZIP</p>
                  <p className="text-gray-500 text-sm">email@example.com</p>
                </div>
              </div>

              {/* Document Details */}
              <div className="grid md:grid-cols-2 gap-8 mb-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">
                    {selectedTransaction.type === "income" ? "Bill To:" : "Vendor:"}
                  </h4>
                  <p className="font-medium">{selectedTransaction.contactName || "N/A"}</p>
                  <p className="text-gray-600 text-sm">{selectedTransaction.contactEmail || ""}</p>
                </div>
                <div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Date:</p>
                      <p className="font-medium">{formatDate(selectedTransaction.date)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Reference:</p>
                      <p className="font-medium">{selectedTransaction.reference || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Status:</p>
                      <p className="font-medium">
                        <Badge variant="outline" className="bg-green-50 border-green-200 text-green-600">
                          Paid
                        </Badge>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border rounded-md mb-6 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="text-left p-3 font-medium">Description</th>
                      <th className="text-right p-3 font-medium">Qty</th>
                      <th className="text-right p-3 font-medium">Unit Price</th>
                      <th className="text-right p-3 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedTransaction.lineItems?.length ? (
                      selectedTransaction.lineItems.map((item, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-3">{selectedTransaction.description || "Transaction"}</td>
                        <td className="p-3 text-right">1</td>
                        <td className="p-3 text-right">{formatCurrency(selectedTransaction.amount)}</td>
                        <td className="p-3 text-right font-medium">{formatCurrency(selectedTransaction.amount)}</td>
                      </tr>
                    )}
                    <tr className="bg-gray-50 font-medium">
                      <td className="p-3" colSpan={3} align="right">Total:</td>
                      <td className="p-3 text-right">{formatCurrency(selectedTransaction.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {selectedTransaction.notes && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-gray-600 text-sm">{selectedTransaction.notes}</p>
                </div>
              )}

              {/* Thank You */}
              <div className="text-center py-4 border-t mt-8">
                <p className="text-gray-600">Thank you for your business!</p>
              </div>
            </div>
          </div>
        )}

        <DrawerFooter className="border-t">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Share Document</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => selectedTransaction && shareViaWhatsApp(selectedTransaction)}>
                      <svg 
                        className="w-4 h-4 mr-2 text-green-500" 
                        fill="currentColor" 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (selectedTransaction) {
                          const text = `${getDocumentType(selectedTransaction.type)} #${selectedTransaction.documentNumber || `DOC-${selectedTransaction.id}`}: ${formatCurrency(selectedTransaction.amount)}`;
                          copyToClipboard(text);
                        }
                      }}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy to clipboard
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Email
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost">Close</Button>
            </DrawerClose>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  </>
  );
}