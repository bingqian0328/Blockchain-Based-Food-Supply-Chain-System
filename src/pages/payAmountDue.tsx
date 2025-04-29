import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Receipt, CreditCard, AlertCircle } from "lucide-react";

type InvoiceDetails = {
  id: string;
  name: string;
  amountDue: string; // Wei
  invoicePaid: boolean;
};

export default function PayAmountDue() {
  const [invoices, setInvoices] = useState<InvoiceDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetails | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(""); // Wei

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

  useEffect(() => {
    fetchInvoices();
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
    } catch (e) {
      console.error("Error paying invoice:", e);
      alert("Failed to pay invoice.");
    }
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
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <p className="text-gray-600">No pending invoices.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Invoices Grid */}
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
                        {inv.amountDue} Wei
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>

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
                      Amount (Wei)
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
          </div>
        )}
      </main>
    </div>
  );
}
