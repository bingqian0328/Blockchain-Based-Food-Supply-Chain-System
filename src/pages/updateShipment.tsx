import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import { useRouter } from "next/router";
import Navbar from "../Components/navBar";

export default function UpdateShipment() {
    const router = useRouter();
    const { productId } = router.query;

    const [retailerName, setRetailerName] = useState("");
    const [retailerAddress, setRetailerAddress] = useState("");
    const [retailerWallet, setRetailerWallet] = useState("");
    const [logisticPartnerWallet, setLogisticPartnerWallet] = useState("");
    const [loading, setLoading] = useState(false);

    const handleUpdateShipment = async () => {
        const contract = getContract();
        if (!contract) return;

        try {
            setLoading(true);

            if (!productId) {
                alert("Product ID is missing.");
                return;
            }

            // Check if MetaMask is available
            if (!window.ethereum) {
                alert("MetaMask is not installed! Please install it to use this application.");
                return;
            }

            // Get the current wallet address
            const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
            const userRole = await contract.registeredUsers(address);
            console.log("User Role:", userRole.toString());

            // Check if the user is a Supplier
            if (userRole.toString() !== "1") {
                alert("Access denied: You are not a registered Supplier.");
                return;
            }

            // Call the smart contract function
            const tx = await contract.updateShipmentBySupplier(
                productId,
                retailerName,
                retailerWallet,
                logisticPartnerWallet
            );

            await tx.wait();
            alert("Shipment updated successfully!");
            router.push("/viewProducts");
        } catch (error) {
            console.error("Error updating shipment:", error);
            alert("Failed to update shipment.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="flex justify-center items-center pt-20">
                <div className="bg-white shadow-md rounded-lg p-8 w-full max-w-lg">
                    <h2 className="text-2xl font-bold mb-8 text-center">Update Shipment</h2>
                    <p className="text-gray-600 mb-4 text-center">Product ID: {productId}</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Merchant Name:</label>
                            <input
                                type="text"
                                placeholder="Enter merchant name"
                                value={retailerName}
                                onChange={(e) => setRetailerName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Merchant Address:</label>
                            <input
                                type="text"
                                placeholder="Enter merchant address"
                                value={retailerAddress}
                                onChange={(e) => setRetailerAddress(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Merchant Wallet Address:</label>
                            <input
                                type="text"
                                placeholder="Enter merchant wallet address"
                                value={retailerWallet}
                                onChange={(e) => setRetailerWallet(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Logistic Partner Wallet Address:</label>
                            <input
                                type="text"
                                placeholder="Enter logistic partner wallet address"
                                value={logisticPartnerWallet}
                                onChange={(e) => setLogisticPartnerWallet(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleUpdateShipment}
                        disabled={loading}
                        className={`mt-6 w-full py-2 px-4 text-white font-medium rounded ${
                            loading
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-500"
                        }`}
                    >
                        {loading ? "Updating..." : "Update Shipment"}
                    </button>
                </div>
            </div>
        </div>
    );
}
