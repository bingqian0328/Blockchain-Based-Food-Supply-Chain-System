import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type ShipmentTrackerProps = {
  currentStatus: number;
};

export default function ShipmentTracker({ currentStatus }: ShipmentTrackerProps) {
  const steps = [
    { status: 0, label: "Not Shipped" },
    { status: 1, label: "Ready For Shipment" },
    { status: 2, label: "Picked Up" },
    { status: 3, label: "Sorting Center" },
    { status: 4, label: "To Delivery Hub" },
    { status: 5, label: "At Delivery Hub" },
    { status: 6, label: "Out For Delivery" },
    { status: 7, label: "Delivered" },
  ];

  const progressValue = (currentStatus / (steps.length - 1)) * 100;

  return (
    <div className="w-full py-6">
      <div className="relative">
        {/* Progress bar behind the circles */}
        <div className="absolute top-4 left-0 w-full">
          <div className="h-[2px] w-[calc(100%-2rem)] ml-8 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>

        {/* Step indicators and labels */}
        <div className="flex justify-between mb-2 relative">
          {steps.map((step) => (
            <div
              key={step.status}
              className={cn(
                "flex flex-col items-center",
                step.status <= currentStatus ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 bg-background",
                  step.status <= currentStatus 
                    ? "border-primary bg-primary text-primary-foreground" 
                    : "border-muted-foreground/30"
                )}
              >
                {step.status <= currentStatus ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm">{step.status + 1}</span>
                )}
              </div>
              <span 
                className={cn(
                  "text-xs font-medium mt-2 text-center max-w-[80px]",
                  step.status <= currentStatus 
                    ? "text-foreground" 
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}