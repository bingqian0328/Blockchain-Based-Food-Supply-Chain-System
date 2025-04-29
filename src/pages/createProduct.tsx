import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { uploadToPinata } from "../utils/pinata";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLoadScript, Autocomplete } from "@react-google-maps/api";

const libraries = ["places"] as const;

// Simple type for inventory items (for dropdown)
type InventoryItem = {
  id: string;
  name: string;
};

// Add this type definition at the top with other types
type OtherComponent = {
  name: string;
  quantity: string;
  unitType: string;
};

export default function CreateProduct() {
  const [role, setRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  // Load manufacturer inventory (only for Manufacturer role)
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  // Selected component products from inventory with quantity required
  const [selectedComponents, setSelectedComponents] = useState<
    { id: string; quantity: string }[]
  >([]);
  // Additional free-text input for components like water, sugar, etc.
  const [otherComponents, setOtherComponents] = useState<OtherComponent[]>([]);

  // General product details
  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [variety, setVariety] = useState("");
  const [misc, setMisc] = useState("");

  // Generate a unique product code
  const generateProductCode = () =>
    "PRD-" + Math.floor(100000 + Math.random() * 900000).toString();
  const [productCode] = useState(generateProductCode());

  // Specifications & attributes
  const [placeOfOrigin, setPlaceOfOrigin] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [unitQuantity, setUnitQuantity] = useState("");
  const [unitQuantityType, setUnitQuantityType] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  // Additional fields for chain storage
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState("");
  const [nextOwnerWallet, setNextOwnerWallet] = useState("");
  const [logisticPartnerWallet, setLogisticPartnerWallet] = useState("");
  // NEW: Amount due input (in Wei)
  const [amountDue, setAmountDue] = useState("");

  // File upload state (optional)
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // Add these states after other state declarations
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  // Add the Google Maps script loader
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  // Fetch user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        if (!window.ethereum) {
          alert("MetaMask is not installed!");
          return;
        }
        const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
        const contract = getContract();
        if (contract) {
          const userRoleBN = await contract.getUserRole(address);
          const roleMap = [
            "Supplier",
            "Manufacturer",
            "Logistic Partner",
            "Distribution Center",
            "Retail Store"
          ];
          const resolvedRole = roleMap[Number(userRoleBN)] || "Unknown";
          setRole(resolvedRole);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      } finally {
        setLoadingRole(false);
      }
    };

    fetchUserRole();
  }, []);

  // If the user is a Manufacturer, load their inventory
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (!window.ethereum) return;
        const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
        const userAddress = address.toLowerCase();
        const contract = getContract();
        if (!contract) return;

        // Assume getInventory returns an array of products (each with id and name)
        const inv = await contract.getInventory(userAddress);
        // Map the result to a simpler shape (id and name)
        const simplified = inv.map((p: any) => ({
          id: p.id,
          name: p.name,
        }));
        setInventory(simplified);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    };

    if (role === "Manufacturer") {
      fetchInventory();
    }
  }, [role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  // Handler when a component product is selected from inventory
  const handleAddComponentFromInventory = (id: string) => {
    if (!id) return;
    // Avoid duplicates
    if (!selectedComponents.some((item) => item.id === id)) {
      setSelectedComponents([...selectedComponents, { id, quantity: "" }]);
    }
  };

  // Update quantity for a selected component
  const handleComponentQuantityChange = (id: string, quantity: string) => {
    setSelectedComponents((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  // Remove a selected component if needed
  const handleRemoveComponent = (id: string) => {
    setSelectedComponents(selectedComponents.filter((item) => item.id !== id));
  };

  const handleAddOtherComponent = () => {
    setOtherComponents([...otherComponents, { name: '', quantity: '', unitType: '' }]);
  };

  const handleUpdateOtherComponent = (
    index: number,
    field: keyof OtherComponent,
    value: string
  ) => {
    setOtherComponents(prev => 
      prev.map((comp, i) => 
        i === index ? { ...comp, [field]: value } : comp
      )
    );
  };

  const handleRemoveOtherComponent = (index: number) => {
    setOtherComponents(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateProduct = async () => {
    const contract = getContract();
    if (!contract) return;

    try {
      setLoading(true);

      // Upload file to Pinata if provided and get the IPFS hash.
      let ipfsHash = "";
      if (file) {
        ipfsHash = await uploadToPinata(file);
      }

      // Build the product attributes as expected by the smart contract.
      const attributes = {
        placeOfOrigin,
        productionDate,
        expirationDate,
        unitQuantity: parseInt(unitQuantity) || 0,
        unitQuantityType,
        batchQuantity: parseInt(batchQuantity) || 0,
        unitPrice,
        category: productCategory,
        variety,
        misc: ipfsHash
          ? `${misc} | IPFS: ${ipfsHash} | Other Components: ${JSON.stringify(otherComponents)}`
          : `${misc} | Other Components: ${JSON.stringify(otherComponents)}`
      };

      // For Suppliers, component product IDs must be empty.
      const components = role === "Supplier" ? [] : selectedComponents.map((item) => item.id);
      const componentQuantities = role === "Supplier" ? [] : selectedComponents.map((item) => parseInt(item.quantity) || 0);

      // Call the updated createProduct function on the contract.
      // NOTE: The smart contract expects 11 parameters. The IPFS hash is now included in the attributes.misc field.
      const tx = await contract.createProduct(
        productCode,           // _id
        barcode,               // _barcode
        productName,           // _name
        components,            // _componentProductIds
        componentQuantities,   // _componentQuantities
        attributes,            // ProductAttributes struct (misc includes IPFS hash)
        nextOwnerWallet,       // _nextOwner
        estimatedArrivalDate,  // _arrivalDate
        logisticPartnerWallet, // _logisticPartner
        parseInt(amountDue) || 0,  // _amountDue
        otherComponents.map(comp => 
          `${comp.name}:${comp.quantity}${comp.unitType}`
        ).join(',')  // Format other components as a comma-separated string
      );
      await tx.wait();

      alert("Product created successfully!");
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product.");
    } finally {
      setLoading(false);
    }
  };

  // Add loading and error handlers before the return statement
  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error loading maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading maps...</p>
      </div>
    );
  }

  if (loadingRole) {
    return <div className="min-h-screen flex justify-center items-center">Loading role...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-3xl mx-auto p-6 space-y-8">
        <h1 className="bg-[#161C54] text-3xl font-semibold">Create Product</h1>

        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="product-name" >Product Name</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Enter product name"
              />
            </div>

            {role === "Manufacturer" && (
              <div className="space-y-3">
                <Label>Select Component Products</Label>
                <Select
                  onValueChange={handleAddComponentFromInventory}
                  defaultValue=""
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from inventory" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventory.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedComponents.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Components</Label>
                    {selectedComponents.map((comp) => (
                      <div
                        key={comp.id}
                        className="flex items-center space-x-2"
                      >
                        <Badge variant="secondary">{comp.id}</Badge>
                        <Input
                          type="number"
                          value={comp.quantity}
                          onChange={(e) =>
                            handleComponentQuantityChange(comp.id, e.target.value)
                          }
                          className="w-20"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveComponent(comp.id)}
                          className="text-red-600"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Other Components</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddOtherComponent}
                    >
                      Add Component
                    </Button>
                  </div>
                  
                  {otherComponents.map((comp, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start">
                      <div className="col-span-6">
                        <Input
                          value={comp.name}
                          onChange={(e) => handleUpdateOtherComponent(index, 'name', e.target.value)}
                          placeholder="Component name"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          value={comp.quantity}
                          onChange={(e) => handleUpdateOtherComponent(index, 'quantity', e.target.value)}
                          placeholder="Qty"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          value={comp.unitType}
                          onChange={(e) => handleUpdateOtherComponent(index, 'unitType', e.target.value)}
                          placeholder="Unit type"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOtherComponent(index)}
                          className="text-red-600 px-2"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="barcode">Barcode</Label>
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Enter barcode"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={productCategory}
                onChange={(e) => setProductCategory(e.target.value)}
                placeholder="Enter category"
              />
            </div>
            <div>
              <Label htmlFor="variety">Variety</Label>
              <Input
                id="variety"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="Enter variety"
              />
            </div>
            <div>
              <Label htmlFor="misc">Miscellaneous Details</Label>
              <Textarea
                id="misc"
                value={misc}
                onChange={(e) => setMisc(e.target.value)}
                placeholder="Enter additional details"
              />
            </div>
          </CardContent>
        </Card>

        {/* Specifications & Attributes */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications & Attributes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="origin">Place of Origin</Label>
              <Autocomplete
                onLoad={(auto) => setAutocomplete(auto)}
                onPlaceChanged={() => {
                  if (autocomplete) {
                    const place = autocomplete.getPlace();
                    const formatted = place.formatted_address || "";
                    setPlaceOfOrigin(formatted);
                  }
                }}
              >
                <Input
                  id="origin"
                  value={placeOfOrigin}
                  onChange={(e) => setPlaceOfOrigin(e.target.value)}
                  placeholder="Start typing location..."
                  className="border-gray-300 focus:ring-[#4F55F7] focus:border-transparent"
                />
              </Autocomplete>
            </div>
            <div>
              <Label htmlFor="prod-date">Production Date</Label>
              <Input
                id="prod-date"
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exp-date">Expiration Date</Label>
              <Input
                id="exp-date"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="unit-qty">Unit Quantity</Label>
              <Input
                id="unit-qty"
                value={unitQuantity}
                onChange={(e) => setUnitQuantity(e.target.value)}
                placeholder="Enter unit quantity"
              />
            </div>
            <div>
              <Label htmlFor="unit-type">Unit Quantity Type</Label>
              <Input
                id="unit-type"
                value={unitQuantityType}
                onChange={(e) => setUnitQuantityType(e.target.value)}
                placeholder="e.g., kg, liters"
              />
            </div>
            <div>
              <Label htmlFor="batch-qty">Batch Quantity</Label>
              <Input
                id="batch-qty"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(e.target.value)}
                placeholder="Enter batch quantity"
              />
            </div>
            <div>
              <Label htmlFor="unit-price">Unit Price</Label>
              <Input
                id="unit-price"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="Enter unit price"
              />
            </div>
          </CardContent>
        </Card>

        {/* Arrival, Next Owner, Logistics & Invoice */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping & Invoice</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="arrival-date">Estimated Arrival Date</Label>
              <Input
                id="arrival-date"
                type="date"
                value={estimatedArrivalDate}
                onChange={(e) => setEstimatedArrivalDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="next-owner">Next Owner Wallet Address</Label>
              <Input
                id="next-owner"
                value={nextOwnerWallet}
                onChange={(e) => setNextOwnerWallet(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="logistic-wallet">Logistic Partner Wallet Address</Label>
              <Input
                id="logistic-wallet"
                value={logisticPartnerWallet}
                onChange={(e) => setLogisticPartnerWallet(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div>
              <Label htmlFor="amount-due">Amount Due (Wei)</Label>
              <Input
                id="amount-due"
                value={amountDue}
                onChange={(e) => setAmountDue(e.target.value)}
                placeholder="Enter amount due"
              />
            </div>
          </CardContent>
        </Card>

        {/* Proof of Product */}
        <Card>
          <CardHeader>
            <CardTitle>Proof of Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="proof-file">Upload Document</Label>
            <Input
              id="proof-file"
              type="file"
              onChange={handleFileChange}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={handleCreateProduct}
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Product and Ship"}
        </Button>
      </main>
    </div>
  );
}
