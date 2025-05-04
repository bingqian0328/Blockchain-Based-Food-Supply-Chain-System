import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, Clock, FileText, Package, ChevronDown, Info, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import QRCode from "react-qr-code";
import Link from "next/link";

// Define the type for history events
type HistoryEvent = {
  eventType: string;
  details: string;
  timestamp: number;
};

// Update the ProductComponents type
type ProductComponents = {
  componentIds: string[];
  componentNames: string[];  // Add this line
  componentQuantities: string[];
  otherComponents: string;
};

// Add this status mapping function at the top of the component
const getStatusLabel = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    "0": "Not Shipped",
    "1": "Ready For Shipment",
    "2": "Picked Up",
    "3": "Sorting Center",
    "4": "To Delivery Hub",
    "5": "At Delivery Hub",
    "6": "Out For Delivery",
    "7": "Delivered"
  };

  // Extract the number from "Shipment status updated to X"
  const statusNumber = status.match(/\d+/)?.[0];
  if (statusNumber && statusMap[statusNumber]) {
    return `Shipment status updated to ${statusMap[statusNumber]}`;
  }
  return status;
};

// Add this helper function at the top of the file
const parseComponentDetails = (details: string) => {
  const matches = details.match(/Used component (.*?) \((\d+) units\)/);
  if (matches) {
    return {
      id: matches[1],
      quantity: matches[2]
    };
  }
  return null;
};

// Add this helper function to extract IPFS hash from misc data
const getDeliveryProofIPFS = (misc: string) => {
  const marker = "POD_IPFS:";
  const idx = misc.indexOf(marker);
  if (idx === -1) return "";
  return misc.substring(idx + marker.length).split("|")[0].trim();
};

export default function ProductHistory() {
  const router = useRouter();
  const { productId } = router.query;
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ProductComponents | null>(null);
  const [productDetails, setProductDetails] = useState<any>(null);
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null);
  const [showAllDetails, setShowAllDetails] = useState(false);

  // Update the fetchHistory function to handle component events
  const fetchHistory = async () => {
    try {
      const contract = getContract();
      if (!contract) return;

      const filter = contract.filters.ProductHistoryRecorded(productId);
      const events = await contract.queryFilter(filter);
      
      // Track components used
      const usedComponents: { id: string; quantity: string }[] = [];
      
      // Filter out ComponentUsed events from the timeline
      const history: HistoryEvent[] = events
        .filter((evt: any) => evt.args.eventType !== "ComponentUsed")
        .map((evt: any) => {
          return {
            eventType: evt.args.eventType,
            details: evt.args.details,
            timestamp: evt.args.timestamp.toNumber(),
          };
        });

      // Collect component data from ComponentUsed events
      events.forEach((evt: any) => {
        if (evt.args.eventType === "ComponentUsed") {
          const componentDetails = parseComponentDetails(evt.args.details);
          if (componentDetails) {
            usedComponents.push(componentDetails);
          }
        }
      });

      setHistoryEvents(history);

      // If we found component usage events, fetch their details
      if (usedComponents.length > 0) {
        const componentDetails = await Promise.all(
          usedComponents.map(async (comp) => {
            const product = await contract.products(comp.id);
            return {
              id: comp.id,
              name: product.name,
              quantity: comp.quantity
            };
          })
        );

        setComponents({
          componentIds: componentDetails.map(c => c.id),
          componentNames: componentDetails.map(c => c.name),
          componentQuantities: componentDetails.map(c => c.quantity),
          otherComponents: ""  // This will be set separately if needed
        });
      }
    } catch (error) {
      console.error("Error fetching product history:", error);
    }
  };

  // Update the fetchProductComponents function
  const fetchProductComponents = async (productId: string) => {
    try {
      const contract = getContract();
      if (!contract) return;

      // Get the product details
      const product = await contract.products(productId);
      console.log("Raw product data:", product);
      
      // Store the full product
      setProductDetails(product);

      if (!product) {
        console.log("No product found");
        return;
      }

      // Access componentProductIds array directly from the struct
      const componentIds = product.componentProductIds || [];
      console.log("Component IDs:", componentIds);

      // Only proceed if we have component IDs
      if (componentIds && componentIds.length > 0) {
        // Fetch component quantities
        const componentQuantities = product.componentQuantities || [];
        console.log("Component Quantities:", componentQuantities);

        // Fetch names for each component by querying the products mapping
        const componentNames = await Promise.all(
          componentIds.map(async (id: string) => {
            try {
              const componentProduct = await contract.products(id);
              console.log(`Component ${id} data:`, componentProduct);
              return componentProduct.name;
            } catch (error) {
              console.error(`Error fetching component ${id}:`, error);
              return 'Unknown Product';
            }
          })
        );

        // Parse other components from misc field
        const otherComponentsStr = product.attributes.misc || '';
        const otherComponentsMatch = otherComponentsStr.match(/Other Components: (.*?)($|\|)/);
        const otherComponents = otherComponentsMatch ? otherComponentsMatch[1] : "";

        console.log("Parsed component data:", {
          componentIds,
          componentNames,
          componentQuantities,
          otherComponents
        });

        setComponents({
          componentIds,
          componentNames,
          componentQuantities: componentQuantities.map((q: any) => q.toString()),
          otherComponents
        });
      } else {
        console.log("No components found for this product");
        // Set empty state but keep otherComponents if they exist
        const otherComponentsStr = product.attributes.misc || '';
        const otherComponentsMatch = otherComponentsStr.match(/Other Components: (.*?)($|\|)/);
        const otherComponents = otherComponentsMatch ? otherComponentsMatch[1] : "";

        setComponents({
          componentIds: [],
          componentNames: [],
          componentQuantities: [],
          otherComponents
        });
      }

    } catch (error) {
      console.error("Error fetching product components:", error);
    }
  };

  // Single useEffect handling both fetches
  useEffect(() => {
    if (!productId) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchHistory(),
          fetchProductComponents(productId as string)
        ]);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productId]);

  return (
    <div className="min-h-screen bg-[#EEF2F6]">
      <NavBar />
      <main className="pt-24 pb-12 max-w-7xl mx-auto px-4">
        {/* Hero Section */}
        <section className="mb-16 text-center">
          <h1 className="text-4xl font-bold text-[#161C54] mb-4">
            Product <span className="text-[#2D4EA2]">History</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Track the complete journey of product {productId}
          </p>
        </section>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading history...</p>
          </div>
        ) : historyEvents.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-md">
            <p className="text-gray-600">No history events found for this product.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Complete Product Details Section */}
            {productDetails && (
              <Card className="bg-white rounded-2xl shadow-md border-2 border-transparent">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                      <Info className="w-6 h-6 text-[#2D4EA2]" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-[#161C54]">
                        Product Details
                      </CardTitle>
                      <p className="text-gray-500 mt-1">Complete information about this product</p>
                    </div>
                    <button 
                      onClick={() => setShowAllDetails(!showAllDetails)}
                      className="ml-auto text-[#2D4EA2] flex items-center gap-1"
                    >
                      {showAllDetails ? 'Hide' : 'Show'} Details
                      <ChevronDown className={`w-4 h-4 transition-transform ${showAllDetails ? 'transform rotate-180' : ''}`} />
                    </button>
                  </div>
                </CardHeader>

                {showAllDetails && (
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-gray-500">Product ID</p>
                            <p className="text-sm font-medium">{productDetails.id}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Barcode</p>
                            <p className="text-sm font-medium">{productDetails.barcode}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="text-sm font-medium">{productDetails.name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Category</p>
                            <p className="text-sm font-medium">{productDetails.attributes.category}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Variety</p>
                            <p className="text-sm font-medium">{productDetails.attributes.variety}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Place of Origin</p>
                            <p className="text-sm font-medium">{productDetails.attributes.placeOfOrigin}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Product Details</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm text-gray-500">Production Date</p>
                            <p className="text-sm font-medium">{productDetails.attributes.productionDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Expiration Date</p>
                            <p className="text-sm font-medium">{productDetails.attributes.expirationDate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Unit Quantity</p>
                            <p className="text-sm font-medium">{productDetails.attributes.unitQuantity.toString()} {productDetails.attributes.unitQuantityType}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Batch Quantity</p>
                            <p className="text-sm font-medium">{productDetails.attributes.batchQuantity.toString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Unit Price in ETH</p>
                            <p className="text-sm font-medium">{productDetails.attributes.unitPrice} ETH</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Current Location</p>
                            <p className="text-sm font-medium">
                              {productDetails.locationData?.current?.location || 'No location data available'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Arrival Date</p>
                            <p className="text-sm font-medium">
                              {new Date(Number(productDetails.locationData?.current?.arrivalDate || 0) * 1000).toLocaleDateString() || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="md:col-span-2 space-y-4">
                        <h3 className="font-medium text-[#161C54]">Supply Chain Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <p className="text-sm text-gray-500">Creator Address</p>
                            <p className="text-sm font-medium truncate">{productDetails.creator}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Next Owner</p>
                            <p className="text-sm font-medium truncate">{productDetails.nextOwner}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Logistic Partner</p>
                            <p className="text-sm font-medium truncate">{productDetails.logisticPartner}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Shipment Status</p>
                            <Badge className="bg-[#2D4EA2]">
                              {getStatusLabel(`Shipment status updated to ${productDetails.shipmentStatus}`)}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Invoice Status</p>
                            <Badge className={productDetails.invoicePaid ? "bg-green-500" : "bg-amber-500"}>
                              {productDetails.invoicePaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Amount Due</p>
                            <p className="text-sm font-medium">{productDetails.amountDue.toString()} Gwei</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Event Timeline Card */}
            <Card className="bg-white rounded-2xl shadow-md border-2 border-transparent">
              <CardHeader className="border-b border-gray-100">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                    <History className="w-6 h-6 text-[#2D4EA2]" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl text-[#161C54]">
                      Product Event Timeline
                    </CardTitle>
                    <p className="text-gray-500 mt-1">Product ID: {productId}</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-8">
                <div className="space-y-6">
                  {historyEvents.map((evt, index) => (
                    <div 
                      key={index} 
                      className="flex gap-6 pb-6 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex flex-col items-center">
                        <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                          {evt.eventType.includes('Location') ? (
                            <Clock className="w-5 h-5 text-[#2D4EA2]" />
                          ) : (
                            <FileText className="w-5 h-5 text-[#2D4EA2]" />
                          )}
                        </div>
                        <div className="flex-1 w-px bg-gray-200 my-2" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-medium text-[#161C54]">
                          {evt.eventType}
                        </p>
                        <p className="text-gray-600 mt-1">
                          {evt.eventType.includes('ShipmentStatusUpdated') 
                            ? getStatusLabel(evt.details)
                            : evt.details
                          }
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(evt.timestamp * 1000).toLocaleString()}
                        </p>
                        {evt.eventType === "ShipmentStatusUpdated" && evt.details.includes("with proof of delivery") && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-[#2D4EA2]">Proof of Delivery:</p>
                            <a 
                              href={`https://ipfs.io/ipfs/${getDeliveryProofIPFS(productDetails?.attributes?.misc || '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 block"
                            >
                              <img 
                                src={`https://ipfs.io/ipfs/${getDeliveryProofIPFS(productDetails?.attributes?.misc || '')}`}
                                alt="Proof of delivery" 
                                className="h-24 object-cover rounded-md border border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Image+Not+Available';
                                }}
                              />
                            </a>
                            <p className="text-xs text-gray-500 mt-1">
                              IPFS: {getDeliveryProofIPFS(productDetails?.attributes?.misc || '')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Components Card */}
            {components && (components.componentIds.length > 0 || components.otherComponents) && (
              <Card className="bg-white rounded-2xl shadow-md border-2 border-transparent">
                <CardHeader className="border-b border-gray-100">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-white rounded-lg border-2 border-[#2D4EA2]">
                      <Package className="w-6 h-6 text-[#2D4EA2]" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-[#161C54]">
                        Product Components
                      </CardTitle>
                      <p className="text-gray-500 mt-1">Components used in manufacturing</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-8">
                  <div className="space-y-6">
                    {/* Blockchain-registered components */}
                    {components.componentIds.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Blockchain-Registered Components</h3>
                        <div className="grid gap-4">
                          {components.componentIds.map((id, index) => (
                            <div
                              key={id}
                              className="bg-[#EEF2F6] rounded-lg overflow-hidden"
                            >
                              <div 
                                className="flex items-center justify-between p-4 cursor-pointer"
                                onClick={() => setExpandedComponent(expandedComponent === id ? null : id)}
                              >
                                <div className="flex items-center space-x-3">
                                  <Package className="w-5 h-5 text-[#2D4EA2]" />
                                  <div>
                                    <span className="font-medium text-[#161C54]">
                                      {components.componentNames[index]}
                                    </span>
                                    <span className="text-sm text-gray-500 block">
                                      ID: {id}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge className="bg-white text-[#2D4EA2]">
                                    Quantity: {components.componentQuantities[index]}
                                  </Badge>
                                  <ChevronDown 
                                    className={`w-5 h-5 text-gray-500 transition-transform ${expandedComponent === id ? 'transform rotate-180' : ''}`} 
                                  />
                                </div>
                              </div>
                              
                              {expandedComponent === id && (
                                <div className="p-4 pt-0 border-t border-gray-100">
                                  <div className="flex flex-col md:flex-row items-center gap-6 mt-4">
                                    <div className="p-3 bg-white rounded-lg">
                                      <QRCode 
                                        value={`${window.location.origin}/productHistory?productId=${id}`}
                                        size={150}
                                      />
                                    </div>
                                    <div className="flex flex-col justify-center">
                                      <h4 className="font-medium text-[#161C54] mb-2">Component History</h4>
                                      <p className="text-sm text-gray-600 mb-4">
                                        Scan the QR code or click the button below to view the complete history of this component.
                                      </p>
                                      <Link 
                                        href={`/productHistory?productId=${id}`}
                                        passHref
                                      >
                                        <button className="flex items-center space-x-2 text-[#2D4EA2] font-medium">
                                          <span>View Component History</span>
                                          <ExternalLink className="w-4 h-4" />
                                        </button>
                                      </Link>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manually entered components - Enhanced display */}
                    {components.otherComponents && (
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Other Components</h3>
                        <div className="p-4 bg-[#EEF2F6] rounded-lg">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {components.otherComponents
                              .split(',')
                              .filter(comp => comp.trim().length > 0)
                              .map((comp, index) => {
                                // Parse component format: name:quantity unitType
                                const parts = comp.split(':');
                                const name = parts[0]?.trim() || 'Unknown';
                                const quantityPart = parts[1]?.trim() || '';
                                
                                // Try to separate quantity and unit type
                                const match = quantityPart.match(/(\d+)([a-zA-Z]+)/);
                                const quantity = match ? match[1] : quantityPart;
                                const unitType = match ? match[2] : '';
                                
                                return (
                                  <div 
                                    key={index}
                                    className="p-3 bg-white rounded-lg shadow-sm border border-gray-100"
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div className="p-1.5 bg-[#EEF2F6] rounded-md">
                                        <Package className="w-4 h-4 text-[#2D4EA2]" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-[#161C54]">{name}</p>
                                        {quantity && (
                                          <p className="text-sm text-gray-600">
                                            Quantity: {quantity} {unitType}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
