import { useState } from "react";
import { getContract } from "../contracts/contractConfig";
import { ethers } from "ethers";
import CryptoJS from "crypto-js";
import Navbar from "../Components/Navbar";
import { uploadToPinata } from "../utils/pinata"; // Pinata integration utility

export default function CreateProduct() {
    const [productName, setProductName] = useState("");
    const [productCode, setProductCode] = useState("");
    const [productPrice, setProductPrice] = useState("");
    const [productCategory, setProductCategory] = useState("");
    const [supplierName, setSupplierName] = useState("");
    const [supplierDetails, setSupplierDetails] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleCreateProduct = async () => {
        const contract = getContract();
        if (!contract) return;

        try {
            setLoading(true);

            // Upload file to IPFS via Pinata and get the hash
            let ipfsHash = "";
            if (file) {
                ipfsHash = await uploadToPinata(file);
            }

            // Generate SHA-256 hash using product details
            const hashData = `${productName}-${productCode}-${productCategory}-${supplierName}`;
            const hash = CryptoJS.SHA256(hashData).toString(CryptoJS.enc.Hex);

            // Send the transaction to create a new product
            console.log("IPFS Hash:", ipfsHash);
            const tx = await contract.createProduct(
                productName,
                parseInt(productCode),
                ethers.utils.parseEther(productPrice),
                productCategory,
                supplierName,
                supplierDetails,
                ipfsHash // Pass IPFS hash to the smart contract
            );
            await tx.wait();

            alert("Product created successfully!");
        } catch (error) {
            console.error("Error during product creation:", error);
            alert("Failed to create product.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="flex flex-col items-center pt-16 mt-8">
                <h1 className="text-3xl font-bold mb-6">Create Product</h1>
                <div className="bg-white p-8 shadow-md rounded-lg w-96">
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Product Name:</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={productName}
                            onChange={(e) => setProductName(e.target.value)}
                            placeholder="Enter product name"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Product Code:</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={productCode}
                            onChange={(e) => setProductCode(e.target.value)}
                            placeholder="Enter product code"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Product Price (ETH):</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={productPrice}
                            onChange={(e) => setProductPrice(e.target.value)}
                            placeholder="Enter product price in ETH"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Product Category:</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={productCategory}
                            onChange={(e) => setProductCategory(e.target.value)}
                            placeholder="Enter product category"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Supplier Name:</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Enter supplier name"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block font-semibold text-gray-700">Supplier Details:</label>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            value={supplierDetails}
                            onChange={(e) => setSupplierDetails(e.target.value)}
                            placeholder="Enter supplier details"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block font-semibold text-gray-700">Attach Document:</label>
                        <input
                            type="file"
                            className="w-full border border-gray-300 rounded-lg p-2 mt-1"
                            onChange={handleFileChange}
                        />
                    </div>
                    <button
                        onClick={handleCreateProduct}
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-semibold p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create"}
                    </button>
                </div>
            </div>
        </div>
    );
}
