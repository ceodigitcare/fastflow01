import { useState } from "react";
import { Transaction } from "@shared/schema";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Share2 } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

interface BillPrintProps {
  bill: Transaction | null;
  businessData?: any;
}

function BillPrintContent({ bill, businessData }: BillPrintProps) {
  if (!bill) return null;
  
  return (
    <div className="p-8 max-w-3xl mx-auto bg-white text-black">
      {/* Bill Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-1">{businessData?.name || "My Business"}</h1>
          <p className="text-sm">{businessData?.address || "123 Business St, Demo City, 12345"}</p>
          <p className="text-sm">{businessData?.email || "business@example.com"}</p>
          <p className="text-sm">{businessData?.phone || "+1 (555) 123-4567"}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold mb-2">PURCHASE BILL</h2>
          <p><span className="font-medium">Bill #:</span> {bill.documentNumber}</p>
          <p><span className="font-medium">Date:</span> {bill.date ? format(new Date(bill.date), "MMMM d, yyyy") : "-"}</p>
        </div>
      </div>
      
      {/* Vendor & Business Info */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="font-bold text-gray-600 mb-2">From:</h3>
          <p className="font-medium">{bill.contactName}</p>
          <p>{bill.contactAddress}</p>
          <p>{bill.contactEmail}</p>
          <p>{bill.contactPhone}</p>
        </div>
        <div>
          <h3 className="font-bold text-gray-600 mb-2">To:</h3>
          <p className="font-medium">{businessData?.name || "My Business"}</p>
          <p>{businessData?.address || "123 Business St, Demo City, 12345"}</p>
          <p>{businessData?.email || "business@example.com"}</p>
          <p>{businessData?.phone || "+1 (555) 123-4567"}</p>
        </div>
      </div>
      
      {/* Bill Details */}
      <table className="w-full mb-6 border-collapse">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="py-2 text-left">Item</th>
            <th className="py-2 text-center">Qty</th>
            <th className="py-2 text-right">Unit Price</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(bill.items) && bill.items.map((item: any, index: number) => (
            <tr key={index} className="border-b border-gray-200">
              <td className="py-2">
                <div className="font-medium">{item.description}</div>
              </td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">{formatCurrency(item.unitPrice / 100)}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(item.amount / 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Bill Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-1/3">
          <div className="flex justify-between py-1">
            <span>Subtotal:</span>
            <span>
              {formatCurrency(
                Array.isArray(bill.items) 
                  ? bill.items.reduce((sum: number, item: any) => sum + (item.amount / 100), 0) 
                  : 0
              )}
            </span>
          </div>
          <div className="flex justify-between py-1 font-bold border-t border-gray-300">
            <span>Total:</span>
            <span>{formatCurrency(bill.amount / 100)}</span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-300">
            <span>Payment Made:</span>
            <span>{formatCurrency((bill.paymentReceived || 0) / 100)}</span>
          </div>
          {(bill.paymentReceived || 0) < bill.amount && (
            <div className="flex justify-between py-1 font-bold">
              <span>Balance Due:</span>
              <span>{formatCurrency((bill.amount - (bill.paymentReceived || 0)) / 100)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Notes */}
      {bill.notes && (
        <div className="mb-8">
          <h3 className="font-bold mb-2">Notes</h3>
          <p className="text-sm">{bill.notes}</p>
        </div>
      )}
      
      {/* Signature Lines */}
      <div className="grid grid-cols-3 gap-4 mt-12">
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-sm text-gray-600">Vendor's Signature</p>
        </div>
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-sm text-gray-600">Date</p>
        </div>
        <div className="border-t border-gray-300 pt-2 text-center">
          <p className="text-sm text-gray-600">Authorized Signature</p>
        </div>
      </div>
    </div>
  );
}

interface BillPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: Transaction | null;
  businessData?: any;
}

export function BillPrintDialog({ 
  open, 
  onOpenChange, 
  bill, 
  businessData 
}: BillPrintDialogProps) {
  const componentRef = useRef<HTMLDivElement>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  
  const handlePrint = useReactToPrint({
    documentTitle: "Purchase Bill",
    onPrintError: (error) => console.error("Print failed", error),
    content: () => componentRef.current,
    onBeforeGetContent: () => {
      setIsPrinting(true);
      return Promise.resolve();
    },
    onAfterPrint: () => {
      setIsPrinting(false);
    },
  });
  
  const handleShare = () => {
    // Share functionality could be implemented here
    // For now, we'll just show a message
    alert("Share functionality is coming soon!");
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Print Purchase Bill</DialogTitle>
        </DialogHeader>
        
        <div className="flex space-x-2 mb-4">
          <Button onClick={handlePrint} className="flex items-center">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={handleShare} className="flex items-center">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" className="flex items-center ml-auto">
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto bg-gray-100 p-4 rounded">
          <div className="bg-white shadow rounded mx-auto" ref={componentRef}>
            <BillPrintContent bill={bill} businessData={businessData} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}