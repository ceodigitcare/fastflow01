import { useState, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Transaction, User, Account, Product } from "@shared/schema";
import { PurchaseBill, PurchaseBillItem } from "@/lib/validation";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { 
  PlusCircle, 
  Search, 
  Printer, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Edit,
  History
} from "lucide-react";
import PurchaseBillFormSplit from "./PurchaseBillFormSplit";
import TransactionVersionHistory from "./TransactionVersionHistory";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BillPrintDialog } from "./BillPrint";
import { calculatePurchaseBillStatus, renderStatusBadge } from "@/lib/purchase-bill-status";

interface PurchaseBillSplitViewProps {
  businessData?: any;
  initialBill?: Transaction | null;
  isCreatingNew?: boolean;
  preselectedProductId?: number | null;
  onCreateCancel?: () => void;
  onSelectBill?: (bill: Transaction) => void;
  billPanelVisible?: boolean;
  onToggleBillPanel?: () => void;
}

export default function PurchaseBillSplitView({ 
  businessData, 
  initialBill = null,
  isCreatingNew: externalCreatingNew = false,
  onCreateCancel,
  onSelectBill,
  billPanelVisible = true,
  onToggleBillPanel
}: PurchaseBillSplitViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(initialBill);
  const [isCreatingNew, setIsCreatingNew] = useState(externalCreatingNew);
  
  // Bill panel visibility is now controlled by parent component
  
  // Update state when props change to ensure synchronization with parent
  useEffect(() => {
    setSelectedBill(initialBill);
  }, [initialBill]);
  
  useEffect(() => {
    setIsCreatingNew(externalCreatingNew);
  }, [externalCreatingNew]);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Transaction | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Handle history panel toggle with auto-scroll
  const handleHistoryToggle = () => {
    const newState = !showVersionHistory;
    setShowVersionHistory(newState);
    
    // Auto-scroll to version history when opening
    if (newState) {
      setTimeout(() => {
        const historyElement = document.getElementById('version-history-section');
        if (historyElement) {
          historyElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    }
  };
  
  // State for toggling received quantity column visibility
  const [showReceivedQuantity, setShowReceivedQuantity] = useState(() => {
    // Check if preference is stored in localStorage
    const savedPreference = localStorage.getItem('showReceivedQuantity');
    // Default to false (hidden) if no preference is saved
    return savedPreference ? savedPreference === 'true' : false;
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
  
  // Get vendors
  const { data: vendors } = useQuery<User[]>({
    queryKey: ["/api/users"],
    select: (users) => users.filter(user => user.type === "vendor")
  });
  
  // Get products for displaying in bill items
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
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
  
  // Calculate automated status for a bill
  const calculateBillStatus = (bill: Transaction) => {
    if (!bill || !Array.isArray(bill.items)) return "draft";
    
    const totalAmount = (bill.amount || 0) / 100; // Convert from cents to dollars
    const paymentReceived = (bill.paymentReceived || 0) / 100; // Convert from cents to dollars
    
    const items = bill.items.map((item: any) => ({
      quantity: item.quantity || 0,
      quantityReceived: item.quantityReceived || 0
    }));

    return calculatePurchaseBillStatus({
      totalAmount,
      paymentReceived,
      items
    });
  };

  // Get automated status badge (no icons as per requirement)
  const getAutomatedStatusBadge = (bill: Transaction) => {
    const status = calculateBillStatus(bill);
    const { colorClass, label } = renderStatusBadge(status);
    
    return (
      <div className={`px-2 py-1 text-xs font-medium border rounded-full ${colorClass}`}>
        {label}
      </div>
    );
  };
  
  return (
    <div className="flex flex-col lg:flex-row h-full relative">
      {/* Left panel for bill view/form */}
      <div className={`lg:flex-1 mb-4 lg:mb-0 ${billPanelVisible ? 'lg:mr-4' : ''} transition-all duration-300`}>
        {selectedBill ? (
          <div className="space-y-6 bg-white p-6 border rounded-lg shadow-sm">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">Bill #{selectedBill.documentNumber}</h2>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleHistoryToggle}
                >
                  <History className="h-4 w-4 mr-2" /> History
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    // Original edit logic starts here
                    // COMPLETELY NEW APPROACH: Create a fresh object with ONLY the necessary data
                    // This avoids reference issues and ensures clean data
                    
                    // Log the original bill data to understand what we're working with
                    console.log("Original bill for editing:", selectedBill);
                    
                    // Parse metadata from JSON string if it exists, or create a new object
                    // Include receivedQuantityMap in the default structure to avoid undefined errors
                    let metadata = { 
                      totalDiscount: 0,
                      totalDiscountType: 'flat',
                      dueDate: selectedBill.date,
                      itemQuantitiesReceived: [] as {productId: number, quantityReceived: number}[],
                      receivedQuantityMap: {} as Record<string, number>
                    };
                    
                    try {
                      // Try to parse metadata if it exists
                      if (selectedBill.metadata && typeof selectedBill.metadata === 'string') {
                        const parsedMetadata = JSON.parse(selectedBill.metadata);
                        
                        // Ensure all array structures are preserved (don't overwrite arrays with undefined)
                        const mergedMetadata = {
                          ...metadata,
                          ...parsedMetadata,
                          // Explicitly preserve itemQuantitiesReceived if it exists
                          itemQuantitiesReceived: parsedMetadata.itemQuantitiesReceived || metadata.itemQuantitiesReceived
                        };
                        
                        metadata = mergedMetadata;
                        console.log("Successfully parsed metadata with itemQuantitiesReceived:", 
                          metadata.itemQuantitiesReceived,
                          "Full metadata:", metadata);
                      }
                    } catch (error) {
                      console.error("Error parsing metadata:", error);
                    }
                    
                    console.log("Prepared metadata for edit:", metadata);
                    
                    // Process items to ensure they have the right structure and type conversions
                    const processedItems = Array.isArray(selectedBill.items) 
                      ? selectedBill.items.map(item => {
                          const productId = Number(item.productId);
                          
                          // ===== CRITICAL FIX: ULTRA-ROBUST RECEIVED QUANTITY EXTRACTION =====
                          // Step 1: Set up tracking object with diagnostic info
                          const extraction = {
                            directValue: null as number | null,
                            metadataMapValue: null as number | null,
                            metadataArrayValue: null as number | null,
                            finalValue: 0, // Default to 0, will be overwritten if values are found
                            source: "default-zero"
                          };
                          
                          // Step 2: Extract from all possible data sources with full error handling
                          try {
                            // SOURCE 1: Direct item property (HIGH PRIORITY)
                            if (item.quantityReceived !== undefined && item.quantityReceived !== null) {
                              const directValue = Number(item.quantityReceived);
                              if (!isNaN(directValue)) {
                                extraction.directValue = directValue;
                                extraction.finalValue = directValue;
                                extraction.source = "direct-property";
                                console.log(`🟢 EDIT PREP: Found direct property value ${directValue} for product ${productId}`);
                              }
                            }
                            
                            // SOURCE 2: Metadata map (MEDIUM PRIORITY)
                            // Only check if we didn't find a direct value or it was 0
                            if (metadata && metadata.receivedQuantityMap && 
                               (!extraction.directValue || extraction.directValue === 0)) {
                              const mapKey = `product_${productId}`;
                              if (metadata.receivedQuantityMap[mapKey] !== undefined) {
                                const mapValue = Number(metadata.receivedQuantityMap[mapKey]);
                                if (!isNaN(mapValue)) {
                                  extraction.metadataMapValue = mapValue;
                                  
                                  // Only overwrite the final value if we don't already have one
                                  if (!extraction.directValue || extraction.directValue === 0) {
                                    extraction.finalValue = mapValue;
                                    extraction.source = "metadata-map";
                                    console.log(`🟢 EDIT PREP: Using metadata map value ${mapValue} for product ${productId}`);
                                  }
                                }
                              }
                            }
                            
                            // SOURCE 3: Metadata array (LOW PRIORITY)
                            // Only check if we still don't have a value
                            if (metadata && metadata.itemQuantitiesReceived && 
                                Array.isArray(metadata.itemQuantitiesReceived) &&
                                (extraction.finalValue === 0)) {
                              
                              // Find exact product ID match
                              const arrayItem = metadata.itemQuantitiesReceived.find(
                                (m: any) => m && Number(m.productId) === productId
                              );
                              
                              if (arrayItem && arrayItem.quantityReceived !== undefined) {
                                const arrayValue = Number(arrayItem.quantityReceived);
                                if (!isNaN(arrayValue)) {
                                  extraction.metadataArrayValue = arrayValue;
                                  extraction.finalValue = arrayValue;
                                  extraction.source = "metadata-array";
                                  console.log(`🟢 EDIT PREP: Using metadata array value ${arrayValue} for product ${productId}`);
                                }
                              }
                            }
                          } catch (error) {
                            console.error(`🔴 EDIT PREP ERROR: Failed to extract quantity for product ${productId}:`, error);
                          }
                          
                          // Step 3: Final validation to guarantee we have a valid number
                          // This ensures we never pass undefined/null/NaN to the form
                          if (extraction.finalValue === null || isNaN(extraction.finalValue)) {
                            extraction.finalValue = 0;
                            extraction.source = "fallback-after-error";
                            console.log(`🟠 EDIT PREP: Using fallback value 0 for product ${productId} after errors`);
                          }
                          
                          // Step 4: Log the complete extraction process for debugging
                          console.log(`📊 EDIT PREP SUMMARY for product ${productId}:`, {
                            directValue: extraction.directValue,
                            metadataMapValue: extraction.metadataMapValue,
                            metadataArrayValue: extraction.metadataArrayValue,
                            finalDecision: extraction.finalValue,
                            source: extraction.source
                          });
                          
                          console.log(`VIEW FINAL: Product ${productId} received qty = ${extraction.finalValue} (${extraction.source})`);
                          
                          return {
                            ...item,
                            productId: productId,
                            quantityReceived: extraction.finalValue, // Use our extracted and validated value
                            quantity: Number(item.quantity || 1),
                            unitPrice: Number(item.unitPrice || 0),
                            taxRate: Number(item.taxRate || 0),
                            discount: Number(item.discount || 0),
                            taxType: item.taxType || 'percentage',
                            discountType: item.discountType || 'percentage'
                          };
                        })
                      : [];
                      
                    // Calculate contact ID from the selectedBill (vendor contact)
                    // First try standard properties that might hold the vendor ID
                    let contactId = null;
                    if (typeof selectedBill.contactId === 'number') {
                      contactId = selectedBill.contactId;
                    } else if (selectedBill.contact && typeof selectedBill.contact.id === 'number') {
                      contactId = selectedBill.contact.id;
                    } else if (selectedBill.vendorId) {
                      contactId = selectedBill.vendorId;
                    }
                    
                    console.log("Determined contact ID:", contactId);
                    
                    // Log processed items to verify they have all required data
                    console.log("Processed items:", processedItems);
                                         
                    // Create an EditBill object with the data that the form expects
                    // This should match the structure expected by the PurchaseBillForm component
                    const billToEdit = {
                      // Basic transaction data
                      id: selectedBill.id,
                      businessId: selectedBill.businessId,
                      accountId: selectedBill.accountId,
                      documentNumber: selectedBill.documentNumber || "",
                      date: selectedBill.date,
                      notes: selectedBill.notes || "",
                      description: selectedBill.description || "",
                      status: selectedBill.status || "draft",
                      contactName: selectedBill.contactName || "",
                      
                      // Form-specific fields
                      vendorId: contactId, // Key field for the form
                      billNumber: selectedBill.documentNumber || "",
                      billDate: selectedBill.date || new Date(),
                      dueDate: metadata.dueDate ? new Date(metadata.dueDate) : new Date(),
                      
                      // Financial details
                      amount: selectedBill.amount,
                      paymentReceived: selectedBill.paymentReceived || 0,
                      items: processedItems,
                      
                      // Custom metadata fields (exposed directly for form usage)
                      totalDiscount: Number(metadata.totalDiscount || 0) / 100, // Convert to dollars
                      totalDiscountType: (metadata.totalDiscountType || 'flat') as 'flat' | 'percentage',
                      
                      // Set other necessary fields the form expects
                      createdAt: selectedBill.createdAt,
                      type: selectedBill.type || "purchase_bill",
                      category: selectedBill.category || "expense",
                      
                      // Store the processed metadata string for saving
                      metadata: JSON.stringify(metadata),
                    };
                    
                    // Log the clean bill object we've created
                    // Log the prepared bill object for debugging
                    console.log("Bill object prepared for editing:", billToEdit);
                    
                    // Only proceed when we have the data
                    if (billToEdit) {
                      // Ensure metadata is properly formatted as a string for the form component
                      // This is critical for the metadata to be correctly parsed
                      if (billToEdit.metadata && typeof billToEdit.metadata !== 'string') {
                        try {
                          billToEdit.metadata = JSON.stringify(billToEdit.metadata);
                        } catch (e) {
                          console.error("Error stringifying metadata:", e);
                        }
                      }
                      
                      // Cast to any to avoid TypeScript errors related to the Transaction type
                      // This is necessary because we've added custom fields to handle editing properly
                      setEditingBill(billToEdit as any);
                      setIsCreatingNew(true);
                      
                      // Important: This is needed to show the edit form
                      setSelectedBill(null);
                    } else {
                      toast({
                        title: "Error",
                        description: "Failed to load bill data for editing",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <span className="mr-1">✏️</span> Edit
                </Button>
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
                <div className="font-medium">{getAutomatedStatusBadge(selectedBill)}</div>
              </div>
            </div>
            
            {/* Bill Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Items</h3>
                
                {/* Toggle switch for showing/hiding Received Quantity */}
                <div className="flex items-center">
                  <label htmlFor="toggle-received-qty" className="mr-2 text-sm text-gray-600">
                    {showReceivedQuantity ? "Hide Received Quantity" : "Show Received Quantity"}
                  </label>
                  <button 
                    id="toggle-received-qty"
                    onClick={() => {
                      const newValue = !showReceivedQuantity;
                      setShowReceivedQuantity(newValue);
                      // Save preference to localStorage
                      localStorage.setItem('showReceivedQuantity', newValue.toString());
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      showReceivedQuantity ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showReceivedQuantity ? 'translate-x-6' : 'translate-x-1'
                      }`} 
                    />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="text-xs uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      {/* Conditionally render Received Qty column based on toggle state */}
                      {showReceivedQuantity && (
                        <th className="px-4 py-3 text-center">Received Qty</th>
                      )}
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Array.isArray(selectedBill.items) && selectedBill.items.map((item: any, index: number) => (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-3 text-sm">
                          {/* Display item name and description in two separate lines */}
                          <div className="font-medium">
                            {products?.find(p => p.id === item.productId)?.name || "Unknown Product"}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{item.description}</div>
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                            {item.discount > 0 && (
                              <span className="inline-flex items-center bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">
                                Discount: {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount/100)}
                              </span>
                            )}
                            {item.taxRate > 0 && (
                              <span className="inline-flex items-center bg-green-50 text-green-800 px-1.5 py-0.5 rounded">
                                Tax: {item.taxType === 'percentage' ? `${item.taxRate}%` : formatCurrency(item.taxRate/100)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                        
                        {/* Conditionally render Received Quantity cell based on toggle state */}
                        {showReceivedQuantity && (
                          <td className="px-4 py-3 text-sm text-center">
                            {/* COMPLETE REBUILD: Ultra-reliable display with guaranteed values */}
                            <div className="flex justify-center items-center">
                              {/* Simple, robust approach to received quantity display */}
                              {(() => {
                                // Extract quantity received with validation
                                let receivedQty = 0;
                                
                                // Try direct property first (most reliable)
                                if (item.quantityReceived !== undefined && item.quantityReceived !== null) {
                                  const parsed = Number(item.quantityReceived);
                                  if (!isNaN(parsed)) {
                                    receivedQty = parsed;
                                  }
                                }
                                
                                // Compute styling based on completion status
                                let textColorClass = 'text-gray-500'; 
                                let displaySymbol = '';
                                const orderedQty = item.quantity || 0;
                                
                                if (receivedQty === 0) {
                                  // Not received yet
                                  textColorClass = 'text-gray-500';
                                } else if (receivedQty >= orderedQty) {
                                  // Fully received
                                  textColorClass = 'text-green-600 font-medium';
                                  displaySymbol = '✓ ';
                                } else if (receivedQty > 0) {
                                  // Partially received
                                  textColorClass = 'text-blue-600 font-medium';
                                  displaySymbol = '⚬ ';
                                }
                                
                                return (
                                  <>
                                    <span className={`inline-block ${textColorClass}`}>
                                      {displaySymbol}{receivedQty.toFixed(
                                        Number.isInteger(receivedQty) ? 0 : 2
                                      )}
                                    </span>
                                    
                                    {receivedQty > 0 && receivedQty < orderedQty && (
                                      <span className="text-xs text-gray-500 ml-1">
                                        /{orderedQty}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </td>
                        )}
                        
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(item.unitPrice / 100)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(item.amount / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Bill Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                {/* Subtotal */}
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      Array.isArray(selectedBill.items) 
                        ? selectedBill.items.reduce((sum: number, item: any) => 
                            sum + (item.quantity * (item.unitPrice / 100)), 0) 
                        : 0
                    )}
                  </span>
                </div>
                
                {/* Tax Amount - Show only if tax exists */}
                {Array.isArray(selectedBill.items) && selectedBill.items.some((item: any) => item.taxRate > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Tax{selectedBill.items.every((item: any) => item.taxType === 'percentage') ? ' (%)' : ''}:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(
                        selectedBill.items.reduce((sum: number, item: any) => {
                          if (item.taxRate <= 0) return sum;
                          
                          if (item.taxType === 'percentage') {
                            const subtotal = item.quantity * (item.unitPrice / 100);
                            // For percentage, apply discount first if applicable
                            let discountAmount = 0;
                            if (item.discountType === 'percentage') {
                              discountAmount = subtotal * (item.discount / 100);
                            } else {
                              discountAmount = Math.min((item.discount / 100), subtotal);
                            }
                            return sum + ((subtotal - discountAmount) * (item.taxRate / 100));
                          } else {
                            // For flat tax, use the exact amount (converted from cents)
                            return sum + (item.taxRate / 100);
                          }
                        }, 0)
                      )}
                    </span>
                  </div>
                )}
                
                {/* Item Discount Amount - Show only if item discounts exist */}
                {Array.isArray(selectedBill.items) && selectedBill.items.some((item: any) => item.discount > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      Item Discount{selectedBill.items.every((item: any) => item.discountType === 'percentage') ? ' (%)' : ''}:
                    </span>
                    <span className="font-medium text-red-500">
                      -{formatCurrency(
                        selectedBill.items.reduce((sum: number, item: any) => {
                          if (item.discount <= 0) return sum;
                          
                          const subtotal = item.quantity * (item.unitPrice / 100);
                          if (item.discountType === 'percentage') {
                            return sum + (subtotal * (item.discount / 100));
                          } else {
                            return sum + Math.min((item.discount / 100), subtotal);
                          }
                        }, 0)
                      )}
                    </span>
                  </div>
                )}
                
                {/* Total Discount - Show only if total discount exists and is greater than 0 */}
                {(() => {
                  // Extract discount values with safer checking, using both legacy and new metadata paths
                  console.log("Checking for discount in bill view:", {
                    bill: selectedBill.documentNumber,
                    metadata: selectedBill.metadata,
                    directTotalDiscount: selectedBill.totalDiscount,
                    metadataTotalDiscount: selectedBill.metadata?.totalDiscount
                  });
                  
                  // Extract discount with extensive logging
                  console.log("Bill metadata when checking discount:", selectedBill.metadata);
                  
                  // Check both metadata and direct properties with fallbacks
                  let discountValue = 0;
                  if (selectedBill.metadata?.totalDiscount !== undefined && 
                      Number(selectedBill.metadata.totalDiscount) > 0) {
                    discountValue = Number(selectedBill.metadata.totalDiscount);
                    console.log("Found non-zero discount in metadata:", discountValue);
                  } else if (selectedBill.totalDiscount !== undefined && 
                            Number(selectedBill.totalDiscount) > 0) {
                    discountValue = Number(selectedBill.totalDiscount);
                    console.log("Found non-zero discount in direct property:", discountValue);
                  }
                  
                  const discountType = 
                    selectedBill.metadata?.totalDiscountType || 
                    selectedBill.totalDiscountType || 
                    'flat';
                  
                  // Calculate the subtotal for percentage discounts
                  const subtotal = Array.isArray(selectedBill.items) 
                    ? selectedBill.items.reduce((sum: number, item: any) => 
                        sum + (item.quantity * (item.unitPrice / 100)), 0) 
                    : 0;
                    
                  // Fixed calculation to handle the discount amount correctly
                  let actualDiscountAmount = 0;
                  if (discountType === 'percentage') {
                    // For percentage type, we need to convert the value to a decimal percentage
                    // If the value is already small (less than 1), don't divide by 100 again
                    const percentageValue = discountValue > 100 ? discountValue / 100 : discountValue;
                    actualDiscountAmount = subtotal * (percentageValue / 100);
                  } else {
                    // For flat type, convert from cents to dollars if needed
                    actualDiscountAmount = discountValue > 100 ? discountValue / 100 : discountValue;
                  }
                  
                  console.log("Discount calculation with improved handling:", {
                    originalDiscountValue: discountValue,
                    discountType,
                    subtotal,
                    actualDiscountAmount,
                    isCentsValue: discountValue > 100
                  });
                  
                  // Only show the discount row if there's actually a discount amount
                  if (discountValue > 0) {
                    // Determine the display value correctly based on type
                    const percentageValue = discountValue > 100 
                      ? (discountValue / 100).toFixed(2) 
                      : discountValue.toFixed(2);
                      
                    return (
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">
                          Total Discount{discountType === 'percentage' ? ` (${percentageValue}%)` : ''}:
                        </span>
                        <span className="font-medium text-red-500">
                          -{formatCurrency(actualDiscountAmount)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* Total */}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold">{formatCurrency(selectedBill.amount / 100)}</span>
                </div>
                
                {/* Payment Made */}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Payment Made:</span>
                  <span className="font-medium">{formatCurrency((selectedBill.paymentReceived || 0) / 100)}</span>
                </div>
                
                {/* Balance Due - Only show if there's a balance */}
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
            
            {/* Version History - Only shown when explicitly toggled */}
            {showVersionHistory && selectedBill && (
              <div id="version-history-section" className="mt-6 border-t pt-6">
                <TransactionVersionHistory 
                  transactionId={selectedBill.id} 
                  onClose={() => setShowVersionHistory(false)}
                />
              </div>
            )}
            
            {/* Signature Line */}
            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between">
                <div className="w-1/2 border-t border-gray-300 mt-8 pt-2 text-center">
                  <p className="text-sm text-gray-600">Vendor's signature</p>
                </div>
                <div className="w-1/2 border-t border-gray-300 mt-8 pt-2 text-right">
                  <p className="text-sm text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>
        ) : isCreatingNew ? (
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold">{editingBill ? 'Edit Purchase Bill' : 'New Purchase Bill'}</h2>
              <Button variant="ghost" onClick={() => {
                setIsCreatingNew(false);
                setEditingBill(null);
                if (onCreateCancel) onCreateCancel();
              }}>
                Cancel
              </Button>
            </div>
            <PurchaseBillFormSplit
              onCancel={() => {
                setIsCreatingNew(false);
                setEditingBill(null);
                if (onCreateCancel) onCreateCancel();
              }}
              onSave={(bill) => {
                setSelectedBill(bill);
                if (onSelectBill) onSelectBill(bill);
                setIsCreatingNew(false);
                setEditingBill(null);
              }}
              editingBill={editingBill}
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
      
      {/* Right panel for bill list - with responsive behavior */}
      <div className={`
        fixed lg:relative 
        top-0 bottom-0 
        right-0 
        h-screen lg:h-auto
        z-20
        bg-white 
        lg:w-80
        space-y-4
        shadow-xl lg:shadow-none
        border-l lg:border-none
        transition-transform duration-300 ease-in-out
        ${billPanelVisible ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        overflow-hidden
        flex flex-col
        p-4
        ${!billPanelVisible && 'lg:hidden'}
      `}>
        {/* Mobile panel header with close button */}
        <div className="flex justify-between items-center mb-4 lg:hidden">
          <h3 className="font-semibold text-lg">Purchase Bills</h3>
          <Button variant="ghost" size="icon" onClick={onToggleBillPanel} aria-label="Close panel">
            <X className="h-5 w-5" />
          </Button>
        </div>
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
                  onClick={() => {
                    setSelectedBill(bill);
                    setIsCreatingNew(false);
                    setEditingBill(null);
                    if (onSelectBill) onSelectBill(bill);
                    
                    // On mobile, close the panel after selecting a bill
                    if (window.innerWidth < 1024) {
                      onToggleBillPanel && onToggleBillPanel();
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{bill.documentNumber}</p>
                      <p className="text-sm text-gray-500">{bill.contactName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(bill.amount / 100)}</p>
                      {getAutomatedStatusBadge(bill)}
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