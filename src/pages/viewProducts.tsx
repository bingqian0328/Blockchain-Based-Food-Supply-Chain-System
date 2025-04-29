import { useState, useEffect } from "react";
import { getContract } from "@/contracts/contractConfig";
import NavBar from "@/components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import ShipmentTracker from "@/components/ShipmentTracker";

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
    unitQuantity: number;
    unitQuantityType: string;
    batchQuantity: number;
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
  shipmentStatus: number; // 0: NotShipped … 5: Delivered
};

export default function ViewProducts() {
  const [assignedProducts, setAssignedProducts] = useState<ProductDetails[]>([]);
  const [createdProducts, setCreatedProducts] = useState<ProductDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [shipmentStatusUpdates, setShipmentStatusUpdates] = useState<
    Record<string, number>
  >({});
  const [receivedProducts, setReceivedProducts] = useState<Set<string>>(new Set());
  const [inventoryProducts, setInventoryProducts] = useState<Set<string>>(new Set());

  const getIPFSHash = (misc: string) => {
    const marker = "IPFS:";
    const idx = misc.indexOf(marker);
    if (idx === -1) return "";
    return misc.substring(idx + marker.length).split("|")[0].trim();
  };

  const statusLabel = (s: number) =>
    [
      "Not Shipped",
      "Ready For Shipment",
      "Picked Up",
      "Arrived at Sorting Center",
      "On The Way to Delivery Hub",
      "Arrived at Delivery Hub",
      "Out For Delivery",
      "Delivered"
    ][s] || "Unknown";

  async function fetchProducts() {
    setLoading(true);
    try {
      const contract = getContract();
      if (!contract || !window.ethereum) return;
      const [addr] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const lower = addr.toLowerCase();
      setUserAddress(lower);

      const roleBN = await contract.getUserRole(lower);
      const roleNames = [
        "Supplier",
        "Manufacturer",
        "Logistic Partner",
        "Distribution Center",
        "Retail Store",
      ];
      const role = roleNames[Number(roleBN)] || "Unknown";
      setUserRole(role);

      // Fetch assigned products
      const rawAssigned =
        role === "Logistic Partner"
          ? await contract.getProductsForLogisticPartner(lower)
          : await contract.getProductsForNextOwner(lower);

      // Check inventory status for each product
      const inventoryStatuses = await Promise.all(
        rawAssigned.map((p: ProductDetails) => 
          contract.isProductInInventory(p.id, lower)
        )
      );

      // Update inventory set with fetched statuses
      const newInventorySet = new Set<string>();
      rawAssigned.forEach((p: ProductDetails, index: number) => {
        if (inventoryStatuses[index]) {
          newInventorySet.add(p.id);
        }
      });
      setInventoryProducts(newInventorySet);

      const fmtAssigned = rawAssigned.map((p: ProductDetails) => ({
        ...p,
        nextOwner: p.nextOwner.toLowerCase(),
        logisticPartner: p.logisticPartner.toLowerCase(),
      }));
      setAssignedProducts(fmtAssigned);
      setShipmentStatusUpdates(
        fmtAssigned.reduce((acc, p) => ({ ...acc, [p.id]: p.shipmentStatus }), {})
      );

      // Created
      if (["Supplier", "Manufacturer"].includes(role)) {
        const rawCreated = await contract.getProductsCreatedBy(lower);
        setCreatedProducts(
          rawCreated.map((p: ProductDetails) => ({
            ...p,
            nextOwner: p.nextOwner.toLowerCase(),
            logisticPartner: p.logisticPartner.toLowerCase(),
          }))
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleShipmentChange = (id: string, val: number) =>
    setShipmentStatusUpdates((prev) => ({ ...prev, [id]: val }));

  const updateShipment = async (id: string) => {
    try {
      const contract = getContract();
      if (!contract) return;
      await (await contract.updateShipmentStatus(id, shipmentStatusUpdates[id])).wait();
      fetchProducts();
    } catch {
      alert("Failed to update shipment.");
    }
  };

  const markReceived = async (id: string) => {
    try {
      const contract = getContract();
      if (!contract) return;
      
      const tx1 = await contract.markParcelReceived(id);
      await tx1.wait();

      // Add the product ID to both received and inventory sets
      setReceivedProducts(prev => new Set([...prev, id]));
      setInventoryProducts(prev => new Set([...prev, id]));
      
      alert("Product received and added to inventory successfully!");
      fetchProducts();
    } catch (error) {
      console.error("Error marking product as received:", error);
      alert("Failed to confirm receipt and add to inventory.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-7xl mx-auto p-6">
        <h1 className="text-3xl font-semibold mb-6">My Products</h1>

        <Tabs defaultValue="assigned" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assigned">Assigned</TabsTrigger>
            {["Supplier", "Manufacturer"].includes(userRole) && (
              <TabsTrigger value="created">Created</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="assigned">
            {loading ? (
              <p>Loading…</p>
            ) : assignedProducts.length === 0 ? (
              <p>No products assigned to you.</p>
            ) : (
              assignedProducts.map((p) => (
                <Card key={p.id} className="mb-4">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {p.name}
                      <Badge>{statusLabel(p.shipmentStatus)}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>ID:</strong> {p.id}
                      </div>
                      <div>
                        <strong>Barcode:</strong> {p.barcode}
                      </div>
                      <div>
                        <strong>Next Owner:</strong> {p.nextOwner}
                      </div>
                      <div>
                        <strong>Logistic Partner:</strong> {p.logisticPartner}
                      </div>
                      <div>
                        <strong>Location:</strong> {p.locationEntry.location}
                      </div>
                      <div>
                        <strong>Arrival:</strong> {p.locationEntry.arrivalDate}
                      </div>
                      <div>
                        <strong>Category:</strong> {p.attributes.category}
                      </div>
                      <div>
                        <strong>Variety:</strong> {p.attributes.variety}
                      </div>
                      <div className="col-span-2">
                        <strong>Shipment Status:</strong>{" "}
                        <Badge variant={p.shipmentStatus === 5 ? "success" : "secondary"}>
                          {statusLabel(p.shipmentStatus)}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-6">
                      <ShipmentTracker currentStatus={p.shipmentStatus} />
                    </div>

                    {userRole === "Logistic Partner" && (
                      <div className="mt-4 flex items-center space-x-3">
                        <Select
                          value={String(shipmentStatusUpdates[p.id])}
                          onValueChange={(v) =>
                            handleShipmentChange(p.id, Number(v))
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Not Shipped</SelectItem>
                            <SelectItem value="1">Ready For Shipment</SelectItem>
                            <SelectItem value="2">Picked Up</SelectItem>
                            <SelectItem value="3">Arrived at Sorting Center</SelectItem>
                            <SelectItem value="4">On The Way to Delivery Hub</SelectItem>
                            <SelectItem value="5">Arrived at Delivery Hub</SelectItem>
                            <SelectItem value="6">Out For Delivery</SelectItem>
                            <SelectItem value="7">Delivered</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={() => updateShipment(p.id)}>
                          Update
                        </Button>
                      </div>
                    )}

                    {["Manufacturer", "Retail Store"].includes(userRole) &&
                      p.shipmentStatus === 4 &&
                      p.nextOwner === userAddress && (
                        <Button
                          variant="secondary"
                          className="mt-4"
                          onClick={() => markReceived(p.id)}
                        >
                          Parcel Received
                        </Button>
                      )}

                    {["Manufacturer", "Retail Store"].includes(userRole) &&
                      (p.shipmentStatus === 7) && // Delivered
                      p.nextOwner === userAddress && (
                        <div className="mt-4">
                          {inventoryProducts.has(p.id) ? (
                            <Badge variant="success" className="w-full flex justify-center py-2">
                              Added to Inventory
                            </Badge>
                          ) : !receivedProducts.has(p.id) && (
                            <Button
                              variant="secondary"
                              className="w-full"
                              onClick={() => markReceived(p.id)}
                            >
                              Product Received & Add to Inventory
                            </Button>
                          )}
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="created">
            {loading ? (
              <p>Loading…</p>
            ) : createdProducts.length === 0 ? (
              <p>You haven’t created any products yet.</p>
            ) : (
              createdProducts.map((p) => (
                <Card key={p.id} className="mb-4">
                  <CardHeader>
                    <CardTitle>{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>ID:</strong> {p.id}
                      </div>
                      <div>
                        <strong>Barcode:</strong> {p.barcode}
                      </div>
                      <div>
                        <strong>Next Owner:</strong> {p.nextOwner}
                      </div>
                      <div>
                        <strong>Logistic Partner:</strong> {p.logisticPartner}
                      </div>
                      <div>
                        <strong>Location:</strong> {p.locationEntry.location}
                      </div>
                      <div>
                        <strong>Arrival:</strong> {p.locationEntry.arrivalDate}
                      </div>
                      <div>
                        <strong>Category:</strong> {p.attributes.category}
                      </div>
                      <div>
                        <strong>Variety:</strong> {p.attributes.variety}
                      </div>
                      <div className="col-span-2">
                        <strong>Shipment Status:</strong>{" "}
                        <Badge variant={p.shipmentStatus === 5 ? "success" : "secondary"}>
                          {statusLabel(p.shipmentStatus)}
                        </Badge>
                      </div>
                      <div className="col-span-2">
                        <strong>Proof Doc:</strong>{" "}
                        {getIPFSHash(p.attributes.misc) ? (
                          <a
                            href={`https://ipfs.io/ipfs/${getIPFSHash(
                              p.attributes.misc
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600"
                          >
                            {getIPFSHash(p.attributes.misc)}
                          </a>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <ShipmentTracker currentStatus={p.shipmentStatus} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
