import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-3xl font-semibold">Pay Amount Due</h1>

        {loading ? (
          <p className="text-center py-12">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <p className="text-center py-12 text-gray-600">No pending invoices.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {invoices.map((inv) => (
                <Card
                  key={inv.id}
                  className={`cursor-pointer border-2 ${
                    selectedInvoice?.id === inv.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-transparent hover:border-gray-300"
                  }`}
                  onClick={() => {
                    setSelectedInvoice(inv);
                    setPaymentAmount(inv.amountDue);
                  }}
                >
                  <CardHeader className="flex justify-between items-center">
                    <CardTitle className="text-lg">{inv.name}</CardTitle>
                    <Badge variant="secondary">{inv.amountDue} Wei</Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-700">
                    <p>
                      <strong>ID:</strong> {inv.id}
                    </p>
                    <p>
                      <strong>Status:</strong>{" "}
                      {inv.invoicePaid ? "Paid" : "Unpaid"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedInvoice && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-xl">
                    Pay “{selectedInvoice.name}”
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="amount">Amount (Wei)</Label>
                    <Input
                      id="amount"
                      type="text"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                    />
                  </div>
                  <Button
                    className="w-full bg-[#161C54] hover:bg-[#161C54]/90 text-white"
                    onClick={handlePayInvoice}
                    disabled={!paymentAmount}
                  >
                    Confirm & Pay
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
