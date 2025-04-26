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
import { ChevronLeft, ChevronRight, Download, Search, Filter } from "lucide-react";

interface TransactionsTableProps {
  transactions: Transaction[] | undefined;
  isLoading: boolean;
}

export default function TransactionsTable({ transactions, isLoading }: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter transactions based on search term and status filter
  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = 
      transaction.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.orderId?.toString().includes(searchTerm) ||
      transaction.id.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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
  
  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-success hover:bg-success">{status}</Badge>;
      case "pending":
        return <Badge className="bg-warning hover:bg-warning">{status}</Badge>;
      case "failed":
        return <Badge className="bg-destructive hover:bg-destructive">{status}</Badge>;
      case "refunded":
        return <Badge className="bg-secondary hover:bg-secondary">{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>Manage your financial transactions</CardDescription>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4 pb-0 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by customer, order ID..."
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
              value={statusFilter} 
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1); // Reset to first page on filter
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction ID</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-20"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-12"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-28"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-24"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-16"></div></TableCell>
                  <TableCell><div className="h-4 bg-gray-200 rounded w-20"></div></TableCell>
                </TableRow>
              ))
            ) : paginatedTransactions?.length ? (
              paginatedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{transaction.orderId || "N/A"}</TableCell>
                  <TableCell>{transaction.customerName}</TableCell>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{formatCurrency(transaction.amount / 100)}</TableCell>
                  <TableCell>{renderStatusBadge(transaction.status)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {searchTerm || statusFilter !== "all" ? (
                    <>
                      <p className="text-gray-500">No matching transactions found</p>
                      <Button 
                        variant="link"
                        onClick={() => {
                          setSearchTerm("");
                          setStatusFilter("all");
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
  );
}