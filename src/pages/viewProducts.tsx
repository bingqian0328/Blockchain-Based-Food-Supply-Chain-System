import { useState, useEffect, useRef } from "react";
import { getContract } from "@/contracts/contractConfig";
import NavBar from "@/components/navBar";
import { Package as PackageIcon, Upload, Camera, MapPin } from "lucide-react";  // Add this import
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
import { uploadToPinata } from "../utils/pinata";
import { Input } from "@/components/ui/input";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

// Define the libraries constant
const libraries = ["places"] as const;

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
  const [logisticsHistory, setLogisticsHistory] = useState<ProductDetails[]>([]);
  const [productHistory, setProductHistory] = useState<ProductDetails[]>([]);
  const [deliveryProofFile, setDeliveryProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [ipfsHash, setIpfsHash] = useState("");
  const [locationUpdates, setLocationUpdates] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [autocompleteInstances, setAutocompleteInstances] = useState<Record<string, google.maps.places.Autocomplete | null>>({});
  
  // Load the Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Fix the getIPFSHash function to properly extract the hash from misc field
  const getIPFSHash = (misc: string) => {
    if (!misc) return "";
    
    // Look for POD_IPFS: first (for proof of delivery)
    const podMarker = "POD_IPFS:";
    const podIdx = misc.indexOf(podMarker);
    if (podIdx !== -1) {
      const start = podIdx + podMarker.length;
      const end = misc.indexOf("|", start);
      return end !== -1 ? misc.substring(start, end).trim() : misc.substring(start).trim();
    }
    
    // Then check for regular IPFS: marker
    const marker = "IPFS:";
    const idx = misc.indexOf(marker);
    if (idx === -1) return "";
    
    const start = idx + marker.length;
    const end = misc.indexOf("|", start);
    return end !== -1 ? misc.substring(start, end).trim() : misc.substring(start).trim();
  };

  // Add this helper function to render the IPFS content
  const renderIPFSContent = (ipfsHash: string) => {
    if (!ipfsHash) return null;
    
    return (
      <div className="mt-4">
        <p className="text-sm font-medium text-[#161C54] mb-2">Proof of Delivery:</p>
        <div className="flex flex-col items-start gap-2">
          <a 
            href={`https://ipfs.io/ipfs/${ipfsHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline break-all"
          >
            {ipfsHash}
          </a>
          <img 
            src={`https://ipfs.io/ipfs/${ipfsHash}`}
            alt="Proof of delivery" 
            className="h-32 object-contain rounded-md border border-gray-200 mt-1 hover:border-[#2D4EA2]"
            onError={(e) => {
              // If image fails to load, show a fallback
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Not+Available';
            }}
          />
        </div>
      </div>
    );
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

      // Get user's inventory first
      const userInventory = await contract.getInventory(lower);
      const inventorySet = new Set(userInventory.map((p: ProductDetails) => p.id));
      setInventoryProducts(inventorySet);

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
      if (role === "Logistic Partner") {
        const rawAssigned = await contract.getProductsForLogisticPartner(lower);
        const formattedProducts = rawAssigned.map((p: ProductDetails) => ({
          ...p,
          nextOwner: p.nextOwner.toLowerCase(),
          logisticPartner: p.logisticPartner.toLowerCase(),
        }));

        // Separate active and delivered products
        const activeProducts = formattedProducts.filter(p => p.shipmentStatus < 7);
        const deliveredProducts = formattedProducts.filter(p => p.shipmentStatus === 7);

        setAssignedProducts(activeProducts);  // Only set non-delivered products
        setLogisticsHistory(deliveredProducts);  // Set delivered products to history
        
        // Only set shipment updates for active products
        setShipmentStatusUpdates(
          activeProducts.reduce((acc, p) => ({ ...acc, [p.id]: p.shipmentStatus }), {})
        );
      } else {
        const rawAssigned = await contract.getProductsForNextOwner(lower);
        
        // Check inventory status for all products at once
        const inventoryChecks = await Promise.all(
          rawAssigned.map(p => contract.isProductInInventory(p.id, lower))
        );

        // Filter active and history products using the results
        const activeProducts = rawAssigned.filter((_, index) => !inventoryChecks[index]);
        const historyProducts = rawAssigned.filter((_, index) => inventoryChecks[index]);

        const fmtAssigned = activeProducts.map((p: ProductDetails) => ({
          ...p,
          nextOwner: p.nextOwner.toLowerCase(),
          logisticPartner: p.logisticPartner.toLowerCase(),
        }));
        
        setAssignedProducts(fmtAssigned);
        setProductHistory(historyProducts);
        setShipmentStatusUpdates(
          fmtAssigned.reduce((acc, p) => ({ ...acc, [p.id]: p.shipmentStatus }), {})
        );
      }

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

      // Filter out products that are in inventory from assigned products
      const activeProducts = rawAssigned.filter(p => 
        !inventoryProducts.has(p.id)
      );
      setAssignedProducts(activeProducts);

      // Get products in inventory for history
      const historyProducts = rawAssigned.filter(p => 
        inventoryProducts.has(p.id)
      );
      setProductHistory(historyProducts);

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

  const handleLocationChange = (id: string, location: string) =>
    setLocationUpdates((prev) => ({ ...prev, [id]: location }));

  const uploadToIPFS = async (file: File): Promise<string> => {
    try {
      setUploadingProof(true);
      
      // Create FormData with the file
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to Pinata or your preferred IPFS service
      // Replace with your actual IPFS upload API endpoint
      const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          // Replace with your actual Pinata API keys
          'pinata_api_key': 'YOUR_PINATA_API_KEY',
          'pinata_secret_api_key': 'YOUR_PINATA_SECRET_KEY',
        },
        body: formData
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error uploading to IPFS');
      }
      
      return data.IpfsHash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    } finally {
      setUploadingProof(false);
    }
  };

  const updateShipment = async (id: string) => {
    try {
      const contract = getContract();
      if (!contract) return;
      
      const newStatus = shipmentStatusUpdates[id];
      let currentLocation = locationUpdates[id] || "Unknown location";
      
      // If we're setting to "Delivered" (status 7), require proof of delivery image
      if (newStatus === 7) {
        if (!deliveryProofFile) {
          alert("Please upload proof of delivery before marking as delivered");
          return;
        }
        
        setUploadingProof(true);
        
        try {
          // Use the imported uploadToPinata function
          const hash = await uploadToPinata(deliveryProofFile);
          setIpfsHash(hash);
          
          console.log("Successfully uploaded to IPFS with hash:", hash);
          
          // For delivered status, check if we have a nextOwner with a registered address
          try {
            const nextOwnerData = await contract.users(assignedProducts.find(p => p.id === id)?.nextOwner || "");
            if (nextOwnerData && nextOwnerData.physicalAddress) {
              currentLocation = nextOwnerData.physicalAddress;
              console.log("Setting delivery location to recipient's address:", currentLocation);
            }
          } catch (error) {
            console.error("Failed to get recipient's address:", error);
          }
          
          await (await contract.updateShipmentStatus(id, newStatus, hash, currentLocation)).wait();
        } catch (error) {
          console.error("Error uploading proof of delivery:", error);
          alert("Failed to upload proof of delivery. Please try again.");
          return;
        } finally {
          setUploadingProof(false);
        }
      } else {
        // For other status updates, require location
        if (!currentLocation || currentLocation === "Unknown location") {
          alert("Please provide the current location of the shipment");
          return;
        }
        
        await (await contract.updateShipmentStatus(id, newStatus, "", currentLocation)).wait();
      }
      
      alert("Shipment status and location updated successfully!");
      setDeliveryProofFile(null);
      setLocationUpdates(prev => ({ ...prev, [id]: "" })); // Clear the location input
      fetchProducts();
    } catch (error) {
      console.error("Error updating shipment:", error);
      alert("Failed to update shipment.");
    }
  };

  const markReceived = async (id: string) => {
    try {
      const contract = getContract();
      if (!contract) return;
      
      const tx1 = await contract.markParcelReceived(id);
      await tx1.wait(); // Wait for transaction to be mined

      // Get the updated inventory status from blockchain
      const isInInventory = await contract.isProductInInventory(id, userAddress);
      
      if (isInInventory) {
        const productToMove = assignedProducts.find(p => p.id === id);
        if (productToMove) {
          setProductHistory(prev => [...prev, productToMove]);
          setAssignedProducts(prev => prev.filter(p => p.id !== id));
          setInventoryProducts(prev => new Set([...prev, id]));
        }
      }
      
      // Refresh the products to get latest blockchain state
      await fetchProducts();
      
      alert("Product received and added to inventory successfully!");
    } catch (error) {
      console.error("Error marking product as received:", error);
      alert("Failed to confirm receipt and add to inventory.");
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            Product <span className="text-[#2D4EA2]">Tracking</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Monitor and manage your supply chain shipments in real-time
          </p>
        </section>

        {/* Tabs Section */}
        <Tabs defaultValue="assigned" className="space-y-8">
          <TabsList className="bg-white/50 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger 
              value="assigned"
              className="px-6 py-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#2D4EA2] data-[state=active]:shadow-sm"
            >
              Assigned
            </TabsTrigger>
            {["Supplier", "Manufacturer"].includes(userRole) && (
              <TabsTrigger 
                value="created"
                className="px-6 py-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#2D4EA2] data-[state=active]:shadow-sm"
              >
                Created
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="history"
              className="px-6 py-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-[#2D4EA2] data-[state=active]:shadow-sm"
            >
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assigned" className="space-y-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : assignedProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                <p className="text-gray-600">No products assigned to you.</p>
              </div>
            ) : (
              assignedProducts.map((p) => (
                <Card 
                  key={p.id} 
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]"
                >
                  <CardHeader className="border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-[#EEF2F6] rounded-lg">
                          <PackageIcon className="w-5 h-5 text-[#2D4EA2]" />
                        </div>
                        <CardTitle className="text-[#161C54] text-xl">
                          {p.name}
                        </CardTitle>
                      </div>
                      <Badge className="bg-[#EEF2F6] text-[#2D4EA2] font-medium px-3 py-1">
                        {statusLabel(p.shipmentStatus)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-6">
                    {/* Product Details Grid */}
                    <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">ID</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.id}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Barcode</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.barcode}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Next Owner</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.nextOwner}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Logistic Partner</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.logisticPartner}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Place of Origin</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.attributes.placeOfOrigin}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Category</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.attributes.category}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Variety</p>
                        <p className="text-sm font-medium text-[#161C54]">{p.attributes.variety}</p>
                      </div>
                    </div>

                    {/* Shipment Tracker */}
                    <div className="mt-8 p-6 rounded-xl">
                      <h3 className="text-[#161C54] font-medium mb-4">Shipment Progress</h3>
                      <ShipmentTracker currentStatus={p.shipmentStatus} />
                      
                      {/* Display IPFS proof of delivery if available */}
                      {p.shipmentStatus === 7 && renderIPFSContent(getIPFSHash(p.attributes.misc))}
                    </div>

                    {/* Add this to your ShipmentTracker component to display current location */}
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#2D4EA2]" />
                        <h3 className="text-[#161C54] font-medium">Current Location</h3>
                      </div>
                      <p className="mt-1.5 text-gray-700">{p.locationEntry.location}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Last updated: {(() => {
                          try {
                            // First check if it's a valid Unix timestamp (number)
                            const timestamp = Number(p.locationEntry.arrivalDate);
                            if (!isNaN(timestamp)) {
                              return new Date(timestamp * 1000).toLocaleString();
                            }
                            // If it's not a number, just display the string as-is
                            return p.locationEntry.arrivalDate || "Unknown";
                          } catch (e) {
                            return "Unknown";
                          }
                        })()}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    {userRole === "Logistic Partner" && p.shipmentStatus < 7 && (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3">
                          <Select
                            value={String(shipmentStatusUpdates[p.id])}
                            onValueChange={(v) => handleShipmentChange(p.id, Number(v))}
                          >
                            <SelectTrigger className="w-48 border-gray-200 hover:border-[#2D4EA2] transition-colors">
                              <SelectValue placeholder="Update Status" />
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
                          
                          {/* Replace regular Input with Google Maps Autocomplete when status is not "Delivered" */}
                          {shipmentStatusUpdates[p.id] !== 7 && isLoaded && (
                            <div className="flex-grow">
                              <Autocomplete
                                onLoad={(auto) => {
                                  setAutocompleteInstances(prev => ({...prev, [p.id]: auto}));
                                }}
                                onPlaceChanged={() => {
                                  const auto = autocompleteInstances[p.id];
                                  if (auto) {
                                    const place = auto.getPlace();
                                    if (place.formatted_address) {
                                      handleLocationChange(p.id, place.formatted_address);
                                    }
                                  }
                                }}
                              >
                                <Input
                                  placeholder="Current Location"
                                  value={locationUpdates[p.id] || ''}
                                  onChange={(e) => handleLocationChange(p.id, e.target.value)}
                                  className="w-full border-gray-200 hover:border-[#2D4EA2] transition-colors"
                                />
                              </Autocomplete>
                            </div>
                          )}
                          
                          {/* Display a loading state if Google Maps hasn't loaded yet */}
                          {shipmentStatusUpdates[p.id] !== 7 && !isLoaded && (
                            <Input
                              placeholder="Loading map data..."
                              disabled
                              className="flex-grow border-gray-200"
                            />
                          )}
                          
                          <Button 
                            onClick={() => updateShipment(p.id)}
                            disabled={shipmentStatusUpdates[p.id] === 7 && !deliveryProofFile}
                            className="bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium px-6"
                          >
                            Update Status
                          </Button>
                        </div>
                        
                        {/* Show proof of delivery upload when trying to mark as delivered */}
                        {shipmentStatusUpdates[p.id] === 7 && (
                          <div className="border border-dashed border-gray-300 rounded-lg p-4 mt-3">
                            <div className="text-sm font-medium text-[#161C54] mb-2">
                              Proof of Delivery Required
                            </div>
                            
                            <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={(e) => setDeliveryProofFile(e.target.files ? e.target.files[0] : null)}
                              className="hidden"
                            />
                            
                            {deliveryProofFile ? (
                              <div className="flex flex-col items-center space-y-2">
                                <img 
                                  src={URL.createObjectURL(deliveryProofFile)} 
                                  alt="Proof of delivery" 
                                  className="h-24 object-cover rounded-md"
                                />
                                <div className="flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeliveryProofFile(null)}
                                    className="text-red-500 border-red-200 hover:bg-red-50"
                                  >
                                    Remove
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-[#2D4EA2] border-[#2D4EA2]/30"
                                  >
                                    Change
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center space-y-3">
                                <div className="flex justify-center gap-3">
                                  <Button
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center space-x-2 border-[#2D4EA2]/30 text-[#2D4EA2]"
                                  >
                                    <Upload size={16} />
                                    <span>Upload Image</span>
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      // Here you would add logic to capture an image from the camera
                                      // For simplicity, we'll just trigger the file input
                                      fileInputRef.current?.click();
                                    }}
                                    className="flex items-center space-x-2 border-[#2D4EA2]/30 text-[#2D4EA2]"
                                  >
                                    <Camera size={16} />
                                    <span>Take Photo</span>
                                  </Button>
                                </div>
                                <p className="text-xs text-gray-500">
                                  Please upload a photo showing the delivered package
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Receive Button */}
                    {["Manufacturer", "Retail Store"].includes(userRole) &&
                      p.shipmentStatus === 7 &&
                      p.nextOwner === userAddress && (
                        <div className="mt-6">
                          {inventoryProducts.has(p.id) ? (
                            <Badge 
                              variant="success" 
                              className="w-full flex justify-center py-2.5 bg-green-50 text-green-700 font-medium"
                            >
                              Added to Inventory
                            </Badge>
                          ) : (
                            <Button
                              onClick={() => markReceived(p.id)}
                              className="w-full bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium py-2.5 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5"
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

          <TabsContent value="created" className="space-y-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : createdProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                <p className="text-gray-600">You haven’t created any products yet.</p>
              </div>
            ) : (
              createdProducts.map((p) => (
                <Card 
                  key={p.id} 
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-[#161C54]">
                      <span>{p.name}</span>
                      <Badge className="bg-[#EEF2F6] text-[#2D4EA2]">
                        {statusLabel(p.shipmentStatus)}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Product Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
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
                        <strong>Place of Origin:</strong> {p.attributes.placeOfOrigin}
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
                        <strong>Product Document:</strong>{" "}
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

                    {/* Shipment Tracker */}
                    <div className="mt-6 p-4 rounded-xl">
                      <ShipmentTracker currentStatus={p.shipmentStatus} />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {userRole === "Logistic Partner" && (
            <TabsContent value="history" className="space-y-8">
              {loading ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Loading...</p>
                </div>
              ) : logisticsHistory.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                  <p className="text-gray-600">No delivery history available.</p>
                </div>
              ) : (
                logisticsHistory.map((p) => (
                  <Card 
                    key={p.id} 
                    className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]"
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-[#161C54]">
                        <span>{p.name}</span>
                        <Badge className="bg-[#EEF2F6] text-[#2D4EA2]">
                          Delivered
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Product Details Grid */}
                      <div className="grid grid-cols-2 gap-4 mb-6">
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
                          <strong>Place of Origin:</strong> {p.attributes.placeOfOrigin}
                        </div>
                        <div>
                          <strong>Delivery Date:</strong> {p.locationEntry.arrivalDate}
                        </div>
                        <div>
                          <strong>Category:</strong> {p.attributes.category}
                        </div>
                        {/* Add IPFS hash display */}
                        <div className="col-span-2">
                          <strong>Proof of Delivery:</strong>{" "}
                          {getIPFSHash(p.attributes.misc) ? (
                            <a
                              href={`https://ipfs.io/ipfs/${getIPFSHash(p.attributes.misc)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-blue-600"
                            >
                              View Proof
                            </a>
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </div>
                      </div>

                      {/* Shipment Tracker */}
                      <div className="mt-6 p-4 rounded-xl">
                        <ShipmentTracker currentStatus={7} />
                        
                        {/* Display IPFS image */}
                        {renderIPFSContent(getIPFSHash(p.attributes.misc))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          )}

          <TabsContent value="history" className="space-y-8">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading...</p>
              </div>
            ) : productHistory.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl shadow-md">
                <p className="text-gray-600">No products in history.</p>
              </div>
            ) : (
              productHistory.map((p) => (
                <Card 
                  key={p.id} 
                  className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-[#161C54]">
                      <span>{p.name}</span>
                      <Badge className="bg-[#EEF2F6] text-[#2D4EA2]">
                        In Inventory
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Product Details Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <strong>ID:</strong> {p.id}
                      </div>
                      <div>
                        <strong>Barcode:</strong> {p.barcode}
                      </div>
                      <div>
                        <strong>Category:</strong> {p.attributes.category}
                      </div>
                      <div>
                        <strong>Variety:</strong> {p.attributes.variety}
                      </div>
                      <div>
                        <strong>Place of Origin:</strong> {p.attributes.placeOfOrigin}
                      </div>
                      <div>
                        <strong>Received Date:</strong> {p.locationEntry.arrivalDate}
                      </div>
                      <div className="col-span-2">
                        <strong>Status:</strong>{" "}
                        <Badge variant="success">
                          Received & In Inventory
                        </Badge>
                      </div>
                      
                      {/* Add proof of delivery section for all users */}
                      <div className="col-span-2">
                        <strong>Proof of Delivery:</strong>{" "}
                        {getIPFSHash(p.attributes.misc) ? (
                          <a
                            href={`https://ipfs.io/ipfs/${getIPFSHash(p.attributes.misc)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-blue-600"
                          >
                            View Proof
                          </a>
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </div>
                      <div className="col-span-2">
                        <strong>Current Location:</strong> {p.locationEntry.location}
                      </div>

                      {/* Add previous locations if available */}
                      {p.previousLocations && p.previousLocations.length > 0 && (
                        <div className="col-span-2">
                          <strong>Previous Locations:</strong>
                          <div className="mt-2 pl-4 border-l-2 border-gray-200">
                            {p.previousLocations.map((loc, i) => (
                              <div key={i} className="mb-2 text-sm text-gray-600">
                                {loc}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Shipment Tracker */}
                    <div className="mt-6 p-4 rounded-xl">
                      <ShipmentTracker currentStatus={7} />
                      
                      {/* Display IPFS image for all users */}
                      {getIPFSHash(p.attributes.misc) && renderIPFSContent(getIPFSHash(p.attributes.misc))}
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
