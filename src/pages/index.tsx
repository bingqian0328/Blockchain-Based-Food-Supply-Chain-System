import Link from "next/link";
import { useEffect, useState } from "react";
import { getContract } from "../contracts/contractConfig";
import NavBar from "../Components/navBar";

export default function Home() {
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
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-0">
            {/* Reusable Navbar */}
            <NavBar />


            {/* Main content section */}
            <div className="mt-24 grid grid-cols-2 gap-8">
                {/* Register Button */}
                <Link href="/RegisterUser">
                    <div className="bg-white shadow-md p-8 flex flex-col items-center rounded-lg cursor-pointer hover:shadow-lg">
                        <div className="text-4xl text-blue-600 mb-4">👤</div>
                        <p className="text-lg font-semibold">Register</p>
                    </div>
                </Link>

                {/* Create Button */}
                <Link href="/createProduct">
                    <div className="bg-white shadow-md p-8 flex flex-col items-center rounded-lg cursor-pointer hover:shadow-lg">
                        <div className="text-4xl text-blue-600 mb-4">➕</div>
                        <p className="text-lg font-semibold">Create</p>
                    </div>
                </Link>

                {/* View Button */}
                <Link href="/viewProducts">
                    <div className="bg-white shadow-md p-8 flex flex-col items-center rounded-lg cursor-pointer hover:shadow-lg">
                        <div className="text-4xl text-blue-600 mb-4">📋</div>
                        <p className="text-lg font-semibold">View</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
