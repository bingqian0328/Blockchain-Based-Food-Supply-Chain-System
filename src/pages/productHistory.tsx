import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, Clock, FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge"; // Adjust the path if necessary

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

export default function ProductHistory() {
  const router = useRouter();
  const { productId } = router.query;
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<ProductComponents | null>(null);

  // Move fetchHistory outside of useEffect
  const fetchHistory = async () => {
    try {
      const contract = getContract();
      if (!contract) return;

      // Create a filter for the ProductHistoryRecorded event for a given productId
      const filter = contract.filters.ProductHistoryRecorded(productId);
      
      // Query past events using the filter
      const events = await contract.queryFilter(filter);
      
      // Map events to a simpler shape
      const history: HistoryEvent[] = events.map((evt: any) => {
        return {
          eventType: evt.args && evt.args.eventType ? evt.args.eventType : "",
          details: evt.args && evt.args.details ? evt.args.details : "",
          timestamp: evt.args && evt.args.timestamp ? evt.args.timestamp.toNumber() : 0,
        };
      });

      setHistoryEvents(history);
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
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* New Components Card */}
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
                    {components.componentIds.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Product Components</h3>
                        <div className="grid gap-4">
                          {components.componentIds.map((id, index) => (
                            <div
                              key={id}
                              className="flex items-center justify-between p-4 bg-[#EEF2F6] rounded-lg"
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
                              <Badge className="bg-white text-[#2D4EA2]">
                                Quantity: {components.componentQuantities[index]}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {components.otherComponents && (
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#161C54]">Other Components</h3>
                        <div className="p-4 bg-[#EEF2F6] rounded-lg">
                          <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                            {components.otherComponents.split(',').map((comp, index) => (
                              <div key={index} className="py-1">
                                {comp}
                              </div>
                            ))}
                          </pre>
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
