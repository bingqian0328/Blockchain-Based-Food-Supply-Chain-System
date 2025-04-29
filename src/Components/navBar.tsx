import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getContract } from "../contracts/contractConfig";
import {
  LayoutGrid,
  PackageSearch,
  ClipboardList,
  QrCode,
  BoxesIcon,
  Wallet
} from "lucide-react";

export default function NavBar() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("Loading...");
  const [role, setRole] = useState("Loading...");

  useEffect(() => {
    const fetchWalletAndRole = async () => {
      if (!window.ethereum) return alert("MetaMask is not installed!");
      try {
        const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWalletAddress(address);
        const contract = getContract();
        if (contract) {
          const userData = await contract.users(address);
          if (!userData?.gmail) {
            setRole("Not Registered");
          } else {
            const userRole = await contract.getUserRole(address);
            const idx = parseInt(userRole.toString(), 10);
            const map = ["Supplier","Manufacturer","Logistic Partner","Distribution Center","Retail Store"];
            setRole(map[idx] || "Unknown");
          }
        }
      } catch (e) {
        console.error(e);
        setWalletAddress("Error");
        setRole("Unknown");
      }
    };
    fetchWalletAndRole();
  }, []);

  const navItems = [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: LayoutGrid // Dashboard grid layout icon
    },
    { 
      name: "Create", 
      href: "/createProduct", 
      icon: PackageSearch // Better icon for product creation/search
    },
    { 
      name: "View Shipment", 
      href: "/viewProducts", 
      icon: ClipboardList // List view for shipments
    },
    { 
      name: "Scan and Track", 
      href: "/decodeQR", 
      icon: QrCode // QR code scanner icon
    },
    { 
      name: "Inventory", 
      href: "/Inventory", 
      icon: BoxesIcon // Multiple boxes for inventory
    },
    { 
      name: "Pay", 
      href: "/payAmountDue", 
      icon: Wallet // Wallet for payments
    }
  ];

  return (
    <header className="fixed top-0 left-0 w-full bg-[#EEF2F6] border-b border-slate-200/80 backdrop-blur-sm z-50">
      {/* Logo Section */}
      <div className="absolute inset-y-0 left-0 flex items-center">
        <Link href="/" className="flex items-center space-x-2 pl-4 md:pl-6">
          <div className="w-8 h-8 bg-[#2D4EA2] rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-medium">FS</span>
          </div>
          <span className="text-[#2D4EA2] font-medium text-lg">FoodSecure</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="h-16 flex items-center justify-center">
        <div className="hidden md:flex items-center gap-1 bg-white/50 backdrop-blur-sm px-2 py-1.5 rounded-xl">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200 
                  ${isActive 
                    ? "bg-white text-[#2D4EA2] shadow-sm" 
                    : "text-slate-600 hover:text-[#2D4EA2] hover:bg-white/50"
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-[#2D4EA2]" : "text-slate-500"}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User info */}
      <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-4">
        <div className="flex items-center space-x-1 bg-white px-3 py-1.5 rounded-lg"> {/* Changed background */}
          <div className="w-2 h-2 bg-emerald-400 rounded-full" />
          <span className="text-sm font-medium text-slate-600">{role}</span>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-lg"> {/* Changed background */}
          <span className="text-sm font-medium text-slate-600">
            {walletAddress.length > 10
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : walletAddress}
          </span>
        </div>
      </div>
    </header>
  );
}
