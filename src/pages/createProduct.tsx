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
import { 
  Package as PackageIcon, 
  ClipboardList as ClipboardListIcon,
  Truck as TruckIcon,
  FileText as DocumentIcon 
} from "lucide-react";

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

  // First, update the state to handle "Other" category
  const [otherCategory, setOtherCategory] = useState("");

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

  // Add these new state variables after your other state declarations
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finalityTime, setFinalityTime] = useState<number | null>(null);
  const [showFinalityResult, setShowFinalityResult] = useState(false);

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
      setShowFinalityResult(false);
      
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
  
      // Store transaction hash in localStorage for reference
      const storeTransactionHash = (hash: string) => {
        localStorage.setItem("lastTxHash", hash);
      };

      // Start the timer right before MetaMask prompt appears
      const start = Date.now();
      setStartTime(start);
      console.log("Transaction started at:", new Date(start).toISOString());
  
      // Call the updated createProduct function on the contract.
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
      
      console.log("Transaction sent to blockchain at:", new Date().toISOString());
      console.log("Transaction hash:", tx.hash);
      storeTransactionHash(tx.hash); // Store the hash
      
      // Wait for the transaction to be mined
      await tx.wait();
      
      // Stop the timer
      const end = Date.now();
      const timeTaken = end - start;
      setFinalityTime(timeTaken);
      console.log("Transaction confirmed at:", new Date(end).toISOString());
      console.log("Finality time:", timeTaken, "ms");
      
      // Show the result
      setShowFinalityResult(true);
      
      alert(`Product created successfully!`);
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Failed to create product.");
      setStartTime(null);
      setFinalityTime(null);
    } finally {
      setLoading(false);
    }
  };

  // First, modify the useEffect hook to calculate amount due when unit price or unit quantity changes
  useEffect(() => {
    // Convert unit price from ETH to Gwei (1 ETH = 10^9 Gwei)
    const priceInGwei = parseFloat(unitPrice) * Math.pow(10, 9);
    const quantity = parseFloat(unitQuantity) || 0;
    const totalAmount = priceInGwei * quantity;
    
    // Update amount due if both values are valid numbers
    if (!isNaN(totalAmount)) {
      setAmountDue(totalAmount.toString());
    }
  }, [unitPrice, unitQuantity]);

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
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            Create <span className="text-[#2D4EA2]">Product</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Add new products to the blockchain-powered supply chain
          </p>
        </section>

        <div className="max-w-3xl mx-auto space-y-8">
          {/* General Card */}
          <Card className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                  <PackageIcon className="w-5 h-5 text-[#2D4EA2]" />
                </div>
                <CardTitle className="text-xl text-[#161C54]">General Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Product Name */}
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Product Name</Label>
                <Input
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>

              {/* Component Products (Manufacturer Only) */}
              {role === "Manufacturer" && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[#161C54] font-medium">Select Component Products</Label>
                    <Select onValueChange={handleAddComponentFromInventory} defaultValue="">
                      <SelectTrigger className="border-gray-200 hover:border-[#2D4EA2] transition-colors">
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
                  </div>

                  {/* Selected Components */}
                  {selectedComponents.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[#161C54] font-medium">Selected Components</Label>
                      <div className="space-y-2">
                        {selectedComponents.map((comp) => (
                          <div
                            key={comp.id}
                            className="flex items-center gap-3 p-3 bg-[#EEF2F6] rounded-lg"
                          >
                            <Badge className="bg-white text-[#2D4EA2] font-medium">
                              {comp.id}
                            </Badge>
                            <Input
                              type="number"
                              value={comp.quantity}
                              onChange={(e) => handleComponentQuantityChange(comp.id, e.target.value)}
                              className="w-24 border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveComponent(comp.id)}
                              className="ml-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Components */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-[#161C54] font-medium">Other Components</Label>
                      <Button
                        onClick={handleAddOtherComponent}
                        className="bg-white border-2 border-[#2D4EA2] text-[#2D4EA2] hover:bg-[#EEF2F6]"
                      >
                        Add Component
                      </Button>
                    </div>
                    
                    {otherComponents.map((comp, index) => (
                      <div key={index} className="grid grid-cols-12 gap-3 items-start bg-[#EEF2F6] p-3 rounded-lg">
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

              {/* Other General Fields */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[#161C54] font-medium">Barcode</Label>
                  <Input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Enter barcode"
                    className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#161C54] font-medium">Category</Label>
                  <Select
                    value={productCategory}
                    onValueChange={(value) => {
                      setProductCategory(value);
                      if (value !== "other") {
                        setOtherCategory("");
                      }
                    }}
                  >
                    <SelectTrigger className="border-gray-200 hover:border-[#2D4EA2] transition-colors">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fruit">Fruit</SelectItem>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="beverages">Beverages</SelectItem>
                      <SelectItem value="vegetables">Vegetables</SelectItem>
                      <SelectItem value="meat">Meat</SelectItem>
                      <SelectItem value="seafood">Seafood</SelectItem>
                      <SelectItem value="dairy">Dairy Foods</SelectItem>
                      <SelectItem value="grains">Grains, Beans and Nuts</SelectItem>
                      <SelectItem value="sauce">Sauce / Dressing</SelectItem>
                      <SelectItem value="other">Other (please specify)</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Show input field for "Other" category */}
                  {productCategory === "other" && (
                    <div className="mt-2">
                      <Input
                        value={otherCategory}
                        onChange={(e) => {
                          setOtherCategory(e.target.value);
                          setProductCategory(`other: ${e.target.value}`);
                        }}
                        placeholder="Please specify category"
                        className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[#161C54] font-medium">Variety</Label>
                  <Input
                    value={variety}
                    onChange={(e) => setVariety(e.target.value)}
                    placeholder="Enter variety"
                    className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-[#161C54] font-medium">Miscellaneous Details</Label>
                  <Textarea
                    value={misc}
                    onChange={(e) => setMisc(e.target.value)}
                    placeholder="Enter additional details"
                    className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Specifications & Attributes */}
          <Card className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                  <ClipboardListIcon className="w-5 h-5 text-[#2D4EA2]" />
                </div>
                <CardTitle className="text-xl text-[#161C54]">Specifications & Attributes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Place of Origin</Label>
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
                    value={placeOfOrigin}
                    onChange={(e) => setPlaceOfOrigin(e.target.value)}
                    placeholder="Start typing location..."
                    className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                  />
                </Autocomplete>
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Production Date</Label>
                <Input
                  type="date"
                  value={productionDate}
                  onChange={(e) => setProductionDate(e.target.value)}
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Expiration Date</Label>
                <Input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Unit Quantity</Label>
                <Input
                  value={unitQuantity}
                  onChange={(e) => setUnitQuantity(e.target.value)}
                  placeholder="Enter unit quantity"
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Unit Quantity Type</Label>
                <Select
                  value={unitQuantityType}
                  onValueChange={setUnitQuantityType}
                >
                  <SelectTrigger className="border-gray-200 hover:border-[#2D4EA2] transition-colors">
                    <SelectValue placeholder="Select unit type" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Weight Units */}
                    <SelectItem value="kg">Kilogram (kg)</SelectItem>
                    <SelectItem value="g">Gram (g)</SelectItem>
                    <SelectItem value="mg">Milligram (mg)</SelectItem>
                    <SelectItem value="lb">Pound (lb)</SelectItem>
                    <SelectItem value="oz">Ounce (oz)</SelectItem>
                    
                    {/* Volume Units */}
                    <SelectItem value="l">Liter (L)</SelectItem>
                    <SelectItem value="ml">Milliliter (mL)</SelectItem>
                    <SelectItem value="gal">Gallon (gal)</SelectItem>
                    <SelectItem value="fl_oz">Fluid Ounce (fl oz)</SelectItem>
                    
                    {/* Count Units */}
                    <SelectItem value="pcs">Pieces (pcs)</SelectItem>
                    <SelectItem value="units">Units</SelectItem>
                    <SelectItem value="dozen">Dozen</SelectItem>
                    <SelectItem value="box">Box</SelectItem>
                    <SelectItem value="pack">Pack</SelectItem>
                    <SelectItem value="case">Case</SelectItem>
                    <SelectItem value="carton">Carton</SelectItem>
                    
                    {/* Area Units */}
                    <SelectItem value="m2">Square Meter (m²)</SelectItem>
                    <SelectItem value="ft2">Square Feet (ft²)</SelectItem>
                    
                    {/* Length Units */}
                    <SelectItem value="m">Meter (m)</SelectItem>
                    <SelectItem value="cm">Centimeter (cm)</SelectItem>
                    <SelectItem value="ft">Feet (ft)</SelectItem>
                    <SelectItem value="in">Inch (in)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Batch Quantity</Label>
                <Input
                  value={batchQuantity}
                  onChange={(e) => setBatchQuantity(e.target.value)}
                  placeholder="Enter batch quantity"
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Unit Price</Label>
                <Input
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="Enter unit price"
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Arrival, Next Owner, Logistics & Invoice */}
          <Card className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                  <TruckIcon className="w-5 h-5 text-[#2D4EA2]" />
                </div>
                <CardTitle className="text-xl text-[#161C54]">Shipping & Invoice</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Estimated Arrival Date</Label>
                <Input
                  type="date"
                  value={estimatedArrivalDate}
                  onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Next Owner Wallet Address</Label>
                <Input
                  value={nextOwnerWallet}
                  onChange={(e) => setNextOwnerWallet(e.target.value)}
                  placeholder="0x..."
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Logistic Partner Wallet Address</Label>
                <Input
                  value={logisticPartnerWallet}
                  onChange={(e) => setLogisticPartnerWallet(e.target.value)}
                  placeholder="0x..."
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Amount Due (Gwei)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={amountDue}
                    readOnly
                    className="border-gray-200 bg-gray-50 cursor-not-allowed"
                  />
                  <div className="text-sm text-gray-500">
                    {unitQuantity && unitPrice ? (
                      <span>
                        Calculated: {unitQuantity} × {unitPrice} ETH = {amountDue} Gwei
                      </span>
                    ) : (
                      <span>
                        Auto-calculated from quantity and price
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Proof of Product */}
          <Card className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-[#2D4EA2]">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                  <DocumentIcon className="w-5 h-5 text-[#2D4EA2]" />
                </div>
                <CardTitle className="text-xl text-[#161C54]">Proof of Product</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label className="text-[#161C54] font-medium">Upload Document</Label>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  className="border-gray-200 focus:ring-[#2D4EA2] focus:border-[#2D4EA2]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Finality Time Result */}
          {showFinalityResult && finalityTime !== null && (
            <Card className="bg-white rounded-2xl shadow-md border-2 border-green-500 mt-4">
              <CardContent className="pt-6 pb-6">
                <div className="text-center">
                  <h3 className="text-lg font-bold text-green-600 mb-2">Transaction Confirmed!</h3>
                  <div className="flex items-center justify-center space-x-2">
                    <svg 
                      className="w-6 h-6 text-green-500" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span className="text-gray-600">Finality Time:</span>
                    <span className="text-xl font-mono text-[#2D4EA2] font-bold">
                      {(finalityTime / 1000).toFixed(2)}s
                    </span>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-500">
                    <p>Transaction hash: {localStorage.getItem("lastTxHash") || "N/A"}</p>
                    <p className="mt-1">
                      Measuring time from MetaMask confirmation to blockchain confirmation
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleCreateProduct}
            disabled={loading}
            className="w-full bg-[#2D4EA2] hover:bg-[#263F82] text-white font-medium py-3 rounded-lg transition-all duration-300 transform hover:-translate-y-0.5"
          >
            <span className="flex items-center justify-center">
              {loading ? "Creating..." : (
                <>
                  Create Product and Ship
                  <svg 
                    className="ml-2 w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M14 5l7 7m0 0l-7 7m7-7H3" 
                    />
                  </svg>
                </>
              )}
            </span>
          </Button>
        </div>
      </main>
    </div>
  );
}
