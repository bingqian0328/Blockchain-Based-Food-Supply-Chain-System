import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import QRCode from "react-qr-code";

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
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="mt-24 p-8">
        <h2 className="text-2xl font-bold mb-4">Your Inventory</h2>
        {loading ? (
          <p>Loading inventory...</p>
        ) : inventory.length === 0 ? (
          <p>Your inventory is empty.</p>
        ) : (
          <div className="grid gap-4">
            {inventory.map((product) => (
              <div key={product.id} className="bg-white p-4 shadow rounded">
                <p>
                  <strong>ID:</strong> {product.id}
                </p>
                <p>
                  <strong>Name:</strong> {product.name}
                </p>
                <p>
                  <strong>Barcode:</strong> {product.barcode}
                </p>
                <p>
                  <strong>Stock:</strong> {product.attributes.batchQuantity}
                </p>
                <p>
                  <strong>Unit Quantity:</strong> {product.attributes.unitQuantity}{" "}
                  {product.attributes.unitQuantityType}
                </p>
                {/* Update sold quantity section */}
                <div className="mt-4">
                  <label className="block font-medium mb-1">
                    Enter sold quantity:
                  </label>
                  <input
                    type="number"
                    value={soldQuantityUpdates[product.id] || ""}
                    onChange={(e) =>
                      handleSoldQuantityChange(product.id, e.target.value)
                    }
                    className="w-full border p-2 rounded"
                    placeholder="Enter quantity sold"
                  />
                  <button
                    onClick={() => handleUpdateSoldOut(product.id)}
                    className="mt-2 w-full bg-blue-600 text-white py-2 rounded"
                  >
                    Update Quantity Sold
                  </button>
                </div>
                {/* Button to view product history */}
                <div className="mt-4">
                  <button
                    onClick={() => handleViewProductHistory(product.id)}
                    className="mt-2 w-full bg-green-600 text-white py-2 rounded"
                  >
                    View Product History
                  </button>
                </div>
                {/* Display a QR code linking to the product's history page */}
                <div className="mt-4">
                  <p className="font-medium mb-1">QR Code for Product History:</p>
                  {typeof window !== "undefined" && (
                    <QRCode
                      value={`${window.location.origin}/productHistory?productId=${product.id}`}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
