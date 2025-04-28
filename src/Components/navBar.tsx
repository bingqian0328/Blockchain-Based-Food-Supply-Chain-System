import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { getContract } from "../contracts/contractConfig";

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
    { name: "Home", href: "/" },
    { name: "Create", href: "/createProduct" },
    { name: "View",  href: "/viewProducts" },
    { name: "Pay Due", href: "/payAmountDue" },
  ];

  return (
    <header className="fixed top-0 left-0 w-full bg-[#161C54] z-50">
      <div className="flex items-center h-16 px-4 w-full">
        {/* 1) Logo, no width constraints */}
        <div className="flex-none">
          <Link
            href="/"
            className="text-white font-bold text-2xl hover:opacity-80"
          >
            FoodSecure
          </Link>
        </div>

        {/* 2) Centered nav, takes all remaining space */}
        <nav className="flex flex-1 justify-center space-x-2">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  (isActive
                    ? "bg-white text-[#161C54]"
                    : "text-white hover:bg-[#2a3171]") +
                  " px-4 py-2 rounded-full text-sm font-medium transition"
                }
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* 3) User info pinned to right */}
        <div className="flex-none flex items-center space-x-4 text-sm text-gray-200">
          <span>{role}</span>
          <span>
            {walletAddress.length > 10
              ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
              : walletAddress}
          </span>
        </div>
      </div>
    </header>
  );
}
