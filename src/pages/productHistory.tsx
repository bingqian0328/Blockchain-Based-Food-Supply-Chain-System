import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../components/navBar";

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
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="mt-24 p-8">
        <h2 className="text-2xl font-bold mb-4">
          Product History for {productId ? productId : "Unknown"}
        </h2>
        {loading ? (
          <p>Loading history...</p>
        ) : historyEvents.length === 0 ? (
          <p>No history events found for this product.</p>
        ) : (
          <div className="space-y-4">
            {historyEvents.map((evt, index) => (
              <div key={index} className="p-4 border rounded">
                <p>
                  <strong>Event Type:</strong> {evt.eventType}
                </p>
                <p>
                  <strong>Details:</strong> {evt.details}
                </p>
                <p>
                  <strong>Timestamp:</strong> {new Date(evt.timestamp * 1000).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
