import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Receipt, CreditCard, AlertCircle, ArrowUpRight, ArrowDownLeft } from "lucide-react";

type InvoiceDetails = {
  id: string;
  name: string;
  amountDue: string; // Gwei instead of Wei
  invoicePaid: boolean;
};

// New type for payment records
type PaymentRecord = {
  productId: string;
  productName: string;
  amount: string; // Explicitly typed as string to ensure compatibility and avoid 'never' type inference
  timestamp: number;
  isSent: boolean;
  counterpartyAddress: string;
};

export default function PayAmountDue() {
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(""); // Wei
  
  // New states for payment records
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const contract = getContract();
      if (!contract || !window.ethereum) {
        alert("MetaMask is not installed!");
        return;
      }
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const raw = await contract.getProductsForNextOwner(address.toLowerCase());
      const pending = raw
        .filter((p: any) => !p.invoicePaid && p.amountDue > 0)
        .map((p: any) => ({
          id: p.id,
          name: p.name,
          amountDue: p.amountDue.toString(),
          invoicePaid: p.invoicePaid,
        }));
      setInvoices(pending);
    } catch (e) {
      console.error("Error fetching invoices:", e);
    } finally {
      setLoading(false);
    }
  };
  
  // Update the fetchPaymentRecords function to correctly load product details

const fetchPaymentRecords = async () => {
  setLoadingRecords(true);
  try {
    const contract = getContract();
    if (!contract || !window.ethereum) return;
    
    const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
    const userAddress = address.toLowerCase();
    
    // Get all InvoicePaid events
    const filter = contract.filters.InvoicePaid();
    const allEvents = await contract.queryFilter(filter);
    const records: PaymentRecord[] = [];
    
    console.log(`Found ${allEvents.length} payment events in total`);
    
    for (const evt of allEvents) {
      try {
        // Extract and normalize product ID - this is the key fix
        let productId;
        if (evt.args && evt.args.productId) {
          // Handle string hash type (most likely case)
          if (evt.args.productId._isIndexed && evt.args.productId.hash) {
            // This is an indexed string parameter - need to decode it from transaction logs
            // Get the transaction receipt to access logs
            const txReceipt = await evt.getTransactionReceipt();
            
            // For now, use the transaction hash as a placeholder
            const txHash = evt.transactionHash;
            console.log("Transaction Hash:", txHash);
            
            // Use the raw transaction to find the actual product ID
            const tx = await evt.getTransaction();
            const txData = tx.data;
            
            // Extract product ID from transaction input data if possible
            try {
              const rawTx = await contract.provider.getTransaction(txHash);
              const decodedData = contract.interface.parseTransaction({ data: rawTx.data });
              if (decodedData && decodedData.args && decodedData.args.length > 0) {
                // The first argument should be the product ID
                productId = decodedData.args[0];
                console.log("Decoded product ID from tx:", productId);
              }
            } catch (decodeError) {
              console.error("Error decoding transaction:", decodeError);
            }
          } else {
            // Direct string value
            productId = String(evt.args.productId);
          }
        }
        
        // If we still couldn't get the product ID, look for it in the logs
        if (!productId) {
          try {
            // Another approach: look at topics in the logs
            const receipt = await evt.getTransactionReceipt();
            if (receipt && receipt.logs && receipt.logs.length > 0) {
              // Log the topics to help debug
              console.log("Event topics:", receipt.logs[0].topics);
            }
          } catch (err) {
            console.log("Error getting transaction receipt:", err);
          }
          
          // Use a placeholder if all else fails
          productId = "unknown-id";
        }
        
        // Extract other event data
        const payer = evt.args?.payer ? String(evt.args.payer).toLowerCase() : "";
        const amount = evt.args?.amountPaid ? String(evt.args.amountPaid) : "0";
        const recipient = evt.args?.recipient ? String(evt.args.recipient).toLowerCase() : "";
        let timestamp = Math.floor(Date.now()/1000); // Use current time as fallback
        
        // Get block timestamp
        try {
          const block = await evt.getBlock();
          if (block) {
            timestamp = block.timestamp;
          }
        } catch (error) {
          console.error("Error fetching block timestamp:", error);
        }
        
        console.log("Extracted data:", { productId, payer, amount, recipient, timestamp });
        
        // Get product details - use the transaction parameters to find the product
        let productName = "Unknown Product";
        let productDetails = null;
        
        // Try to get the product from the chain using the ID
        try {
          // First try with the extracted ID
          const product = await contract.products(productId);
          if (product && product.name) {
            productName = product.name;
            productDetails = product;
            console.log("Found product:", productName);
          }
          
          // If that didn't work, try searching recent products
          if (productName === "Unknown Product") {
            // Get all products and find the one that might match this transaction
            const allProductIds = [];
            let count = 0;
            try {
              // Try to get product count - may not exist in your contract
              count = await contract.getProductCount();
            } catch {
              // If there's no getter for count, try a reasonable limit
              count = 100;
            }
            
            // Try looking through recent products
            for (let i = 0; i < 20; i++) {
              try {
                const id = await contract.allProductIds(i);
                if (id) {
                  const product = await contract.products(id);
                  console.log("Checking product:", id, product.name);
                  if (product) {
                    // If this product was involved in a payment near this timestamp
                    const productCreatedRecently = Math.abs(timestamp - product.timestamp) < 3600; // within 1 hour
                    if (productCreatedRecently || product.invoicePaid) {
                      productName = product.name;
                      productDetails = product;
                      productId = id;
                      break;
                    }
                  }
                }
              } catch (e) {
                break; // Stop if we've reached the end
              }
            }
          }
        } catch (error) {
          console.error("Error fetching product details:", error);
        }
        
        // User sent this payment
        if (payer === userAddress) {
          records.push({
            productId: productId || "Unknown",
            productName: productName || "Unknown Product",
            amount,
            timestamp,
            isSent: true,
            counterpartyAddress: recipient
          });
          console.log("Added SENT payment record");
        }
        
        // User received this payment
        if (recipient === userAddress) {
          records.push({
            productId: productId || "Unknown",
            productName: productName || "Unknown Product",
            amount,
            timestamp,
            isSent: false,
            counterpartyAddress: payer
          });
          console.log("Added RECEIVED payment record");
        }
      } catch (error) {
        console.error("Error processing payment event:", error);
      }
    }
    
    // Sort by timestamp, newest first
    records.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`Found ${records.length} payment records for user`);
    setPaymentRecords(records);
  } catch (error) {
    console.error("Error fetching payment records:", error);
  } finally {
    setLoadingRecords(false);
  }
};

  useEffect(() => {
    fetchInvoices();
    fetchPaymentRecords();
  }, []);

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return;
    try {
      const contract = getContract();
      if (!contract) return;
      const tx = await contract.payAmountDue(selectedInvoice.id, {
        value: paymentAmount,
      });
      await tx.wait();
      alert("Invoice paid successfully!");
      setSelectedInvoice(null);
      setPaymentAmount("");
      fetchInvoices();
      fetchPaymentRecords(); // Refresh payment records after a new payment
    } catch (e) {
      console.error("Error paying invoice:", e);
      alert("Failed to pay invoice.");
    }
  };
  
  // Updated formatAddress function
  const formatAddress = (address: string) => {
    if (!address || address === "Unknown") return "Unknown";
    
    try {
      // Make sure we're dealing with a string
      const addressStr = String(address);
      
      // If it looks like an Ethereum address
      if (addressStr.startsWith('0x') && addressStr.length >= 10) {
        return `${addressStr.substring(0, 6)}...${addressStr.substring(addressStr.length - 4)}`;
      }
      
      // If it's something else, just return it as is, truncated if too long
      return addressStr.length > 20 ? `${addressStr.substring(0, 17)}...` : addressStr;
    } catch (error) {
      console.error('Error formatting address:', error);
      return String(address).substring(0, 10) + '...';
    }
  };
  
  // Helper function to format timestamp
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            Payment <span className="text-[#2D4EA2]">Portal</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage and pay your pending invoices
          </p>
        </section>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading invoices...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Invoices Grid */}
            {invoices.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                <p className="text-gray-600">No pending invoices.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {invoices.map((inv) => (
                  <Card
                    key={inv.id}
                    className={`bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer border-2 ${
                      selectedInvoice?.id === inv.id
                        ? "border-[#2D4EA2]"
                        : "border-transparent hover:border-[#2D4EA2]"
                    }`}
                    onClick={() => {
                      setSelectedInvoice(inv);
                      setPaymentAmount(inv.amountDue);
                    }}
                  >
                    <CardHeader className="border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                            <Receipt className="w-5 h-5 text-[#2D4EA2]" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-[#161C54]">
                              {inv.name}
                            </CardTitle>
                            <p className="text-gray-500 mt-1">ID: {inv.id}</p>
                          </div>
                        </div>
                        <Badge className="bg-[#EEF2F6] text-[#2D4EA2] font-medium px-3 py-1">
                          {inv.amountDue} Gwei
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}

            {/* Payment Section */}
            {selectedInvoice && (
              <Card className="bg-white rounded-2xl shadow-md border-2 border-transparent">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                      <CreditCard className="w-5 h-5 text-[#2D4EA2]" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-[#161C54]">
                        Payment Details
                      </CardTitle>
                      <p className="text-gray-500 mt-1">
                        for {selectedInvoice.name}
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[#161C54] font-medium" htmlFor="amount">
                      Amount (Gwei)
                    </Label>
                    <Input
                      id="amount"
                      type="text"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                    />
                  </div>

                  <div className="flex items-center p-4 bg-[#EEF2F6] rounded-lg">
                    <AlertCircle className="w-5 h-5 text-[#2D4EA2] mr-3" />
                    <p className="text-sm text-gray-600">
                      Please confirm the amount before proceeding with the payment
                    </p>
                  </div>

                  <Button
                    className="w-full bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5"
                    onClick={handlePayInvoice}
                    disabled={!paymentAmount}
                  >
                    Confirm & Pay
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* Payment History Section */}
            <div className="mt-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-[#161C54]">
                  Payment <span className="text-[#2D4EA2]">History</span>
                </h2>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentHistory(!showPaymentHistory);
                    if (!showPaymentHistory) {
                      fetchPaymentRecords();
                    }
                  }}
                  className="border-[#2D4EA2] text-[#2D4EA2] hover:bg-[#2D4EA2] hover:text-white"
                >
                  {showPaymentHistory ? 'Hide' : 'Show'} History
                </Button>
              </div>
              
              {showPaymentHistory && (
                <Card className="bg-white rounded-2xl shadow-md border-2 border-transparent">
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                        <Receipt className="w-5 h-5 text-[#2D4EA2]" />
                      </div>
                      <div>
                        <CardTitle className="text-xl text-[#161C54]">
                          Transaction Records
                        </CardTitle>
                        <p className="text-gray-500 mt-1">
                          Payments sent and received
                        </p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-6">
                    {loadingRecords ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Loading payment records...</p>
                      </div>
                    ) : paymentRecords.length === 0 ? (
                      <p className="text-center text-gray-500 py-4">No payment records found.</p>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {paymentRecords.map((record, i) => (
                          <div key={i} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <div className="flex items-start space-x-4">
                                <div className={`p-2 mt-1 rounded-md ${record.isSent ? 'bg-orange-50' : 'bg-green-50'}`}>
                                  {record.isSent ? (
                                    <ArrowUpRight className="w-4 h-4 text-orange-500" />
                                  ) : (
                                    <ArrowDownLeft className="w-4 h-4 text-green-500" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-[#161C54]">
                                    {record.isSent ? 'Sent payment for' : 'Received payment for'} {record.productName || "Unknown Product"}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    ID: {String(record.productId)} • {formatDate(record.timestamp)}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {record.isSent ? 'To: ' : 'From: '}
                                    {formatAddress(record.counterpartyAddress)}
                                  </p>
                                </div>
                              </div>
                              <Badge className={`px-3 py-1 ${record.isSent ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                {record.isSent ? '-' : '+'}
                                {String(record.amount)} Gwei
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
