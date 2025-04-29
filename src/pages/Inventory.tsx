import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import QRCode from "react-qr-code";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Package, History, QrCode } from "lucide-react";

type ProductDetails = {
  id: string;
  name: string;
  barcode: string;
  componentProductIds: string[];
  previousLocations: string[];
  attributes: {
    placeOfOrigin: string;
    productionDate: string;
    expirationDate: string;
    unitQuantity: any; // could be a BigNumber
    unitQuantityType: string;
    batchQuantity: any; // could be a BigNumber
    unitPrice: string;
    category: string;
    variety: string;
    misc: string;
  };
  locationEntry: {
    location: string;
    arrivalDate: string;
  };
  nextOwner: string;
  logisticPartner: string;
  shipmentStatus: any; // could be a BigNumber or string after conversion
};

export default function Inventory() {
  const [inventory, setInventory] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);
  // For updating sold quantity per product (keyed by product id)
  const [soldQuantityUpdates, setSoldQuantityUpdates] = useState<{ [key: string]: string }>({});

  // Fetch inventory from contract
  const fetchInventory = async () => {
    try {
      const contract = getContract();
      if (!contract) return;
      if (!window.ethereum) {
        alert("MetaMask is not installed!");
        return;
      }
      const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
      const userAddress = address.toLowerCase();
      const inv = await contract.getInventory(userAddress);
      // Convert BigNumber fields to strings for rendering
      const formatted = inv.map((product: ProductDetails) => ({
        ...product,
        attributes: {
          ...product.attributes,
          unitQuantity:
            typeof product.attributes.unitQuantity === "object"
              ? product.attributes.unitQuantity.toString()
              : product.attributes.unitQuantity,
          batchQuantity:
            typeof product.attributes.batchQuantity === "object"
              ? product.attributes.batchQuantity.toString()
              : product.attributes.batchQuantity,
        },
        shipmentStatus:
          typeof product.shipmentStatus === "object"
            ? product.shipmentStatus.toString()
            : product.shipmentStatus,
      }));
      setInventory(formatted);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Handler for updating sold quantity on a product
  const handleUpdateSoldOut = async (productId: string) => {
    const contract = getContract();
    if (!contract) return;
    const soldQuantity = parseInt(soldQuantityUpdates[productId]);
    if (isNaN(soldQuantity) || soldQuantity <= 0) {
      alert("Please enter a valid sold quantity");
      return;
    }
    try {
      const tx = await contract.updateSoldOut(productId, soldQuantity);
      await tx.wait();
      alert("Inventory updated successfully!");
      // Refresh inventory after update
      fetchInventory();
    } catch (error) {
      console.error("Error updating inventory:", error);
      alert("Failed to update inventory.");
    }
  };

  // Update input state for sold quantity
  const handleSoldQuantityChange = (productId: string, value: string) => {
    setSoldQuantityUpdates((prev) => ({ ...prev, [productId]: value }));
  };

  // Redirect to product history page
  const handleViewProductHistory = (productId: string) => {
    // When running in a browser, window.location.origin will contain the base URL.
    if (typeof window !== "undefined") {
      window.location.href = `${window.location.origin}/productHistory?productId=${productId}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            Product <span className="text-[#2D4EA2]">Inventory</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Manage and track your product inventory
          </p>
        </section>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <p className="text-gray-600">Your inventory is empty.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {inventory.map((product) => (
              <Card 
                key={product.id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]"
              >
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                        <Package className="w-6 h-6 text-[#2D4EA2]" />
                      </div>
                      <div>
                        <CardTitle className="text-2xl text-[#161C54]">
                          {product.name}
                        </CardTitle>
                        <p className="text-gray-500 mt-1">ID: {product.id}</p>
                      </div>
                    </div>
                    <div className="text-lg font-medium text-[#2D4EA2]">
                      Stock: {product.attributes.batchQuantity}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-8">
                  {/* Product Details */}
                  <div className="grid grid-cols-3 gap-x-12 gap-y-6 mb-8">
                    <div>
                      <p className="text-base text-gray-500">Barcode</p>
                      <p className="text-lg font-medium text-[#161C54] mt-1">{product.barcode}</p>
                    </div>
                    <div>
                      <p className="text-base text-gray-500">Unit Quantity</p>
                      <p className="text-lg font-medium text-[#161C54] mt-1">
                        {product.attributes.unitQuantity} {product.attributes.unitQuantityType}
                      </p>
                    </div>
                    <div>
                      <p className="text-base text-gray-500">Category</p>
                      <p className="text-lg font-medium text-[#161C54] mt-1">{product.attributes.category}</p>
                    </div>
                  </div>

                  {/* Update sold quantity section */}
                  <div className="flex items-end gap-3 mb-8">
                    <div className="flex-1">
                      <label className="block text-base font-medium text-[#161C54] mb-2">
                        Update Sold Quantity
                      </label>
                      <Input
                        type="number"
                        value={soldQuantityUpdates[product.id] || ""}
                        onChange={(e) => handleSoldQuantityChange(product.id, e.target.value)}
                        className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                        placeholder="Enter quantity sold"
                      />
                    </div>
                    <Button
                      onClick={() => handleUpdateSoldOut(product.id)}
                      className="bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium px-8 h-10"
                    >
                      Update
                    </Button>
                  </div>

                  {/* Actions and QR Code */}
                  <div className="flex items-start gap-8">
                    <div className="flex-1 space-y-3">
                      <Button
                        onClick={() => handleViewProductHistory(product.id)}
                        className="w-full bg-white border-2 border-[#2D4EA2] text-[#2D4EA2] hover:bg-[#EEF2F6] font-medium h-11"
                      >
                        <History className="w-5 h-5 mr-2" />
                        View History
                      </Button>
                      <Button
                        className="w-full bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium h-11"
                        onClick={() => {
                          // Add QR code modal or action here
                        }}
                      >
                        <QrCode className="w-5 h-5 mr-2" />
                        Show QR Code
                      </Button>
                    </div>

                    {/* QR Code */}
                    <div className="w-32">
                      {typeof window !== "undefined" && (
                        <QRCode
                          value={`${window.location.origin}/productHistory?productId=${product.id}`}
                          className="w-full h-auto"
                        />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
