import Link from "next/link";
import { useEffect, useState } from "react";
import { getContract } from "../contracts/contractConfig";

export default function NavBar() {
    const [walletAddress, setWalletAddress] = useState("Loading...");
    const [role, setRole] = useState("Loading...");

    useEffect(() => {
        const fetchWalletAndRole = async () => {
            try {
                // Connect to MetaMask
                if (window.ethereum) {
                    const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
                    setWalletAddress(address);

                    // Fetch user role from the smart contract
                    const contract = getContract();
                    if (contract) {
                        const userRole = await contract.registeredUsers(address);
                        const roleMap = ["None", "Supplier", "Logistics", "Merchant", "Customer"];
                        setRole(roleMap[userRole] || "Unknown");
                    }
                } else {
                    alert("MetaMask is not installed!");
                }
            } catch (error) {
                console.error("Error fetching wallet and role:", error);
                setWalletAddress("Unable to fetch wallet");
                setRole("Unknown");
            }
        };

        fetchWalletAndRole();
    }, []);

    return (
        <header className="w-full bg-gray-800 text-white py-4 px-8 flex justify-between items-center fixed top-0 left-0 z-10">
            <Link href="/">
                <h1 className="text-2xl font-bold cursor-pointer">BlockSupply</h1>
            </Link>
            <div className="text-sm">
                <span>{role}</span> | <span>{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}</span>
            </div>
        </header>
    );
    
}
