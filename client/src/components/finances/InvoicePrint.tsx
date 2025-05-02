import { forwardRef, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { SalesInvoiceItem } from "@/lib/validation";
import { QRCodeSVG } from "qrcode.react";

interface InvoicePrintProps {
  invoice: Transaction;
  businessName?: string;
  businessAddress?: string;
  businessLogo?: string;
  businessPhone?: string;
  businessEmail?: string;
}

// Component for printing invoices
const InvoicePrint = forwardRef<HTMLDivElement, InvoicePrintProps>((
  {
    invoice,
    businessName = "Demo Business",
    businessAddress = "123 Business St, Demo City, 12345",
    businessLogo = "",
    businessPhone = "+1 (555) 123-4567",
    businessEmail = "info@demobusiness.com",
  },
  ref
) => {
  // Calculate totals from invoice items
  const items = invoice.items as SalesInvoiceItem[] || [];
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.amount * (item.taxRate / 100)), 0);
  const totalAmount = subtotal + taxAmount;
  
  // Generate QR code data - can be used for payment info or invoice details
  const qrCodeData = JSON.stringify({
    invoiceNumber: invoice.documentNumber,
    amount: totalAmount,
    date: invoice.date,
    business: businessName,
  });
  
  return (
    <div ref={ref} className="p-8 max-w-4xl mx-auto bg-white font-sans print:p-0">
      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          {businessLogo ? (
            <img src={businessLogo} alt="Business Logo" className="h-16 mb-2" />
          ) : (
            <h1 className="text-2xl font-bold text-gray-800">{businessName}</h1>
          )}
          <div className="text-sm text-gray-600 space-y-1">
            <p>{businessAddress}</p>
            <p>Phone: {businessPhone}</p>
            <p>Email: {businessEmail}</p>
          </div>
        </div>
        
        <div className="text-right">
          <h1 className="text-3xl font-bold text-primary mb-2">INVOICE</h1>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Invoice #:</span> {invoice.documentNumber}</p>
            <p><span className="font-medium">Date:</span> {invoice.date ? format(new Date(invoice.date), "MMM dd, yyyy") : "N/A"}</p>
            <p><span className="font-medium">Due Date:</span> {invoice.date ? format(new Date(new Date(invoice.date).getTime() + 30 * 24 * 60 * 60 * 1000), "MMM dd, yyyy") : "N/A"}</p>
            <p><span className="font-medium">Status:</span> {invoice.status?.toUpperCase() || "DRAFT"}</p>
          </div>
        </div>
      </div>
      
      {/* Bill To section */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-2">Bill To:</h2>
        <div className="text-sm text-gray-600 space-y-1">
          <p className="font-medium text-gray-800">{invoice.contactName}</p>
          <p>{invoice.contactEmail}</p>
          <p>{invoice.contactPhone}</p>
          <p>{invoice.contactAddress}</p>
        </div>
      </div>
      
      {/* Invoice Items */}
      <div className="mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 border-y border-gray-300">
              <th className="py-2 px-2 text-left font-semibold">Item</th>
              <th className="py-2 px-2 text-left font-semibold">Description</th>
              <th className="py-2 px-2 text-center font-semibold">Qty</th>
              <th className="py-2 px-2 text-right font-semibold">Unit Price</th>
              <th className="py-2 px-2 text-right font-semibold">Tax</th>
              <th className="py-2 px-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? (
              items.map((item, index) => (
                <tr key={index} className="border-b border-gray-200">
                  <td className="py-3 px-2">{index + 1}</td>
                  <td className="py-3 px-2">{item.description}</td>
                  <td className="py-3 px-2 text-center">{item.quantity}</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-3 px-2 text-right">{item.taxRate}%</td>
                  <td className="py-3 px-2 text-right">{formatCurrency(item.amount)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No items found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Invoice Summary */}
      <div className="flex justify-between mb-8">
        <div className="w-1/2">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Payment Information:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">Bank:</span> Demo Bank</p>
              <p><span className="font-medium">Account:</span> 123456789</p>
              <p><span className="font-medium">Routing:</span> 987654321</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Notes:</h3>
            <p className="text-sm text-gray-600">{invoice.notes || "Thank you for your business!"}</p>
          </div>
        </div>
        
        <div className="w-1/3 space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Tax:</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-300">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
          </div>
          
          <div className="flex justify-end mt-4">
            <QRCodeSVG value={qrCodeData} size={100} />
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="text-center text-sm text-gray-600 border-t border-gray-300 pt-4">
        <p>Payment is due within 30 days of the invoice date.</p>
        <p>If you have any questions about this invoice, please contact us.</p>
        <p className="mt-2">&copy; {new Date().getFullYear()} {businessName}. All rights reserved.</p>
      </div>
    </div>
  );
});

InvoicePrint.displayName = "InvoicePrint";

export default InvoicePrint;

// Component for a print-friendly dialog to view and print invoice
interface InvoicePrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Transaction | null;
}

export function InvoicePrintDialog({ open, onOpenChange, invoice }: InvoicePrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);
  
  // Add a useEffect to handle when the dialog is closed
  useEffect(() => {
    if (!open) {
      return;
    }
    // If dialog is opened but no invoice is provided
    if (!invoice) {
      onOpenChange(false);
    }
  }, [open, invoice, onOpenChange]);

  const handlePrint = () => {
    if (!invoice) return;
    
    const content = printRef.current;
    if (content) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Invoice #${invoice.documentNumber}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; }
                }
                body { font-family: Arial, sans-serif; }
              </style>
            </head>
            <body>
              ${content.innerHTML}
              <script>
                window.onload = function() { window.print(); window.close(); }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };
  
  // If no invoice or dialog is closed, don't render anything
  if (!open || !invoice) {
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Invoice #{invoice.documentNumber}</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Print
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <InvoicePrint ref={printRef} invoice={invoice} />
        </div>
      </div>
    </div>
  );
}
