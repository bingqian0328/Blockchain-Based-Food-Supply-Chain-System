import { useState, useEffect } from "react";
import { getContract } from "../contracts/contractConfig";
import { ethers } from "ethers";
import Link from "next/link";
import Navbar from "../Components/navBar";

type Product = {
    uid: string;
    productName: string;
    productCode: string;
    productPrice: string;
    productCategory: string;
    supplierName: string;
    supplierDetails: string;
    status: string;
    ipfsHash: string; // Added IPFS hash
};

export default function ViewProducts() {
    const [products, setProducts] = useState<Product[]>([]);
    const [role, setRole] = useState(""); // User role
    const [walletAddress, setWalletAddress] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchUserRole = async () => {
        const contract = getContract();
        if (!contract) return;

        try {
            if (!window.ethereum) {
                alert("MetaMask is not installed! Please install MetaMask to use this application.");
                return;
            }

            const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
            setWalletAddress(address);

            const userRole = await contract.registeredUsers(address);

            // Map role enum to string
            const roleMap = ["None", "Supplier", "Logistics", "Merchant", "Customer"];
            setRole(roleMap[userRole]);
        } catch (error) {
            console.error("Error fetching user role:", error);
        }
    };

    const fetchProductsForRole = async () => {
        const contract = getContract();
        if (!contract) return;

        try {
            setLoading(true);

            let fetchedProducts: Product[] = [];

            if (role === "Supplier") {
                const productIds = await contract.getProductsByCreator(walletAddress);
                for (const id of productIds) {
                    const product = await contract.products(id);
                    fetchedProducts.push(mapProduct(product));
                }
            } else if (role === "Logistics" || role === "Merchant") {
                const products = await contract.getProductsForUser();
                for (const product of products) {
                    fetchedProducts.push(mapProduct(product));
                }
            }

            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Error fetching products for role:", error);
        } finally {
            setLoading(false);
        }
    };

    const mapProduct = (product: any): Product => {
        return {
            uid: product.uid.toString(),
            productName: product.productdet.productName,
            productCode: product.productdet.productCode.toString(),
            productPrice: ethers.utils.formatEther(product.productdet.productPrice),
            productCategory: product.productdet.productCategory,
            supplierName: product.manufacturer.supplierName,
            supplierDetails: product.manufacturer.supplierDetails,
            status: product.productdet.status,
            ipfsHash: product.ipfsHash || "N/A", // IPFS hash display
        };
    };

    const handleUpdateShipment = async (productId: string, updateFunction: string) => {
        const contract = getContract();
        if (!contract) return;

        try {
            setLoading(true);

            let tx;
            if (updateFunction === "logistics") {
                tx = await contract.updateShipmentByLogistics(productId);
            } else if (updateFunction === "merchant") {
                tx = await contract.updateShipmentByMerchant(productId);
            }

            await tx.wait();
            alert("Shipment status updated successfully!");
            fetchProductsForRole(); // Refresh product list
        } catch (error) {
            console.error("Error updating shipment:", error);
            alert("Failed to update shipment.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserRole();
    }, []);

    useEffect(() => {
        if (role) fetchProductsForRole();
    }, [role]);

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />

            <div className="mt-0 p-8">
                <h2 className="text-2xl font-bold text-center mb-8">View Products</h2>
                {loading ? (
                    <p className="text-center text-gray-600">Loading products...</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <div
                                key={product.uid}
                                className="bg-white shadow-md rounded-lg p-6 border border-gray-200"
                            >
                                <p>
                                    <strong>Product ID:</strong> {product.uid}
                                </p>
                                <p>
                                    <strong>Name:</strong> {product.productName}
                                </p>
                                <p>
                                    <strong>Manufactured Date:</strong> {product.productCode}
                                </p>
                                <p>
                                    <strong>Price:</strong> {product.productPrice} ETH
                                </p>
                                <p>
                                    <strong>Category:</strong> {product.productCategory}
                                </p>
                                <p>
                                    <strong>Status:</strong> {product.status}
                                </p>
                                <p>
                                    <strong>IPFS Hash:</strong>{" "}
                                    <a
                                        href={`https://amaranth-leading-dormouse-215.mypinata.cloud/ipfs/${product.ipfsHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline"
                                    >
                                        {product.ipfsHash}
                                    </a>
                                </p>

                                {/* Supplier Role: Redirect to updateShipment.tsx if "Manufactured" */}
                                {role === "Supplier" && product.status === "Manufactured" && (
                                    <Link href={`/updateShipment?productId=${product.uid}`}>
                                        <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                                            Update Shipment
                                        </button>
                                    </Link>
                                )}

                                {/* Logistics Role: Button to mark as "Shipped to Merchant" */}
                                {role === "Logistics" && product.status === "Shipped Out by Supplier" && (
                                    <button
                                        onClick={() => handleUpdateShipment(product.uid, "logistics")}
                                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        {loading ? "Updating..." : "Mark as Shipped to Merchant"}
                                    </button>
                                )}

                                {/* Merchant Role: Button to mark as "Received" */}
                                {role === "Merchant" && product.status === "Shipped Out to Merchant" && (
                                    <button
                                        onClick={() => handleUpdateShipment(product.uid, "merchant")}
                                        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                    >
                                        {loading ? "Updating..." : "Mark as Received"}
                                    </button>
                                )}

                                {/* Merchant Role: Disable if not "Shipped to Merchant" */}
                                {role === "Merchant" && product.status !== "Shipped Out to Merchant" && (
                                    <p className="mt-4 text-gray-600">Shipment not ready for update.</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
