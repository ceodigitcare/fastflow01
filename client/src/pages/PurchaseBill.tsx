import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import MainLayout from "@/components/layout/MainLayout";
import PurchaseBillSplitView from "@/components/finances/PurchaseBillSplitView";
import { Transaction } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function PurchaseBill() {
  const [location] = useLocation();
  const [showNewForm, setShowNewForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
  const [preselectedProductId, setPreselectedProductId] = useState<number | null>(null);
  const [rightPanelVisible, setRightPanelVisible] = useState(() => {
    // On desktop (lg and above), default to visible
    return window.innerWidth >= 1024;
  });
  
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
  
  // Check for product pre-selection in URL query parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const preselectedProduct = urlParams.get('preselect_product');
    
    if (preselectedProduct) {
      const productId = parseInt(preselectedProduct);
      if (!isNaN(productId)) {
        setPreselectedProductId(productId);
        setShowNewForm(true);
        setSelectedBill(null);
        // Clear the URL parameter to avoid re-triggering
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [location]);

  // Automatically select the most recent bill when loaded
  useEffect(() => {
    if (bills && bills.length > 0 && !selectedBill && !showNewForm && !preselectedProductId) {
      // Set after a small timeout to ensure React has completed other rendering tasks
      setTimeout(() => {
        setSelectedBill(bills[0]);
      }, 100);
    }
  }, [bills, preselectedProductId]);

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
    <MainLayout onRightPanelToggle={() => setRightPanelVisible(!rightPanelVisible)}>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Purchase Bill</h1>
            <p className="text-sm text-gray-500">Manage and track your supplier invoices and bill payments</p>
          </div>
          <Button onClick={handleNewBill} className="h-fit">
            <Plus className="mr-2 h-4 w-4" /> New Purchase Bill
          </Button>
        </div>
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
          preselectedProductId={preselectedProductId}
          onCreateCancel={() => {
            setShowNewForm(false);
            setPreselectedProductId(null);
          }}
          onSelectBill={(bill) => {
            setSelectedBill(bill);
            setShowNewForm(false);
            setPreselectedProductId(null);
          }}
          billPanelVisible={rightPanelVisible}
          onToggleBillPanel={() => setRightPanelVisible(!rightPanelVisible)}
        />
      </div>
    </MainLayout>
  );
}