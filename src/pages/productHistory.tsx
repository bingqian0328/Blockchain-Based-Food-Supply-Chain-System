import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, Clock, FileText } from "lucide-react";

// Define the type for history events
type HistoryEvent = {
  eventType: string;
  details: string;
  timestamp: number;
};

export default function ProductHistory() {
  const router = useRouter();
  const { productId } = router.query; // Get the productId from URL query parameter
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return; // Wait for the productId to be available
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
            // Convert the timestamp (assumed to be a BigNumber) to a number.
            timestamp: evt.args && evt.args.timestamp ? evt.args.timestamp.toNumber() : 0,
          };
        });

        setHistoryEvents(history);
      } catch (error) {
        console.error("Error fetching product history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
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
                          {evt.details}
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
          </div>
        )}
      </main>
    </div>
  );
}
