import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import PurchaseBillSplitView from "@/components/finances/PurchaseBillSplitView";
import { Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PurchaseBill() {
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
  
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

  // Get the business data from query
  const { data: businessData } = useQuery({
    queryKey: ["/api/business"],
  });
  
  // Automatically select the most recent bill when loaded
  useEffect(() => {
    if (bills && bills.length > 0 && !selectedBill && !showNewForm) {
      // Set after a small timeout to ensure React has completed other rendering tasks
      setTimeout(() => {
        setSelectedBill(bills[0]);
      }, 100);
    }
  }, [bills]);

  // Handle new bill button click
  const handleNewBill = () => {
    // First, reset the selected bill to null
    setSelectedBill(null);
    // Then, after a small delay to ensure state updates properly, set showNewForm to true
    setTimeout(() => {
      setShowNewForm(true);
    }, 50);
  };
  
  return (
    <MainLayout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Purchase Bill</h1>
          <p className="text-sm text-gray-500">Manage and track your supplier invoices and bill payments</p>
        </div>
        <Button onClick={handleNewBill}>
          <Plus className="mr-2 h-4 w-4" /> New Purchase Bill
        </Button>
      </div>
      
      <div className="flex-1">
        <PurchaseBillSplitView 
          businessData={businessData || {
            name: "My Business",
            email: "business@example.com",
            phone: "+1 (555) 123-4567",
            address: "123 Business St, Demo City, 12345"
          }}
          initialBill={selectedBill}
          isCreatingNew={showNewForm}
          onCreateCancel={() => setShowNewForm(false)}
          onSelectBill={(bill) => {
            setSelectedBill(bill);
            setShowNewForm(false);
          }}
        />
      </div>
    </MainLayout>
  );
}