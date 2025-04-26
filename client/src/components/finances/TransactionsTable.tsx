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
import { ChevronLeft, ChevronRight, Download, Search, Filter, Plus } from "lucide-react";

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
  
  return (
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
                <TableRow key={transaction.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell className="font-medium">{transaction.id}</TableCell>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>{renderTypeBadge(transaction.type)}</TableCell>
                  <TableCell>{transaction.category}</TableCell>
                  <TableCell>{transaction.description || "N/A"}</TableCell>
                  <TableCell className={`text-right font-medium ${transaction.type === "income" ? "text-green-600" : transaction.type === "expense" ? "text-red-600" : ""}`}>
                    {transaction.type === "expense" ? "-" : ""}{formatCurrency(transaction.amount)}
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
  );
}