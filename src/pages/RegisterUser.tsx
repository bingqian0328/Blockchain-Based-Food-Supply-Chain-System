import { useState } from "react";
import { getContract } from "../contracts/contractConfig";
import Navbar from "../components/Navbar";

export default function RegisterUser() {
    // Define role as a union of the keys in roleEnum
    const [role, setRole] = useState<"Supplier" | "Logistics" | "Merchant" | "Customer" | "">(""); 
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        const contract = getContract();
        if (!contract) return;

        try {
            setLoading(true);

            // Map role names to the corresponding smart contract enums
            const roleEnum = {
                Supplier: 1,
                Logistics: 2,
                Merchant: 3,
                Customer: 4,
            } as const; // Use 'as const' to ensure TypeScript treats this object as immutable

            // Ensure the role is valid
            if (!role || !(role in roleEnum)) {
                alert("Please select a valid role.");
                return;
            }

            // Use the roleEnum mapping to get the corresponding role number
            const tx = await contract.registerUser(roleEnum[role]);
            await tx.wait();

            alert("Registered successfully as " + role);
        } catch (error) {
            console.error("Error registering user:", error);
            alert("Failed to register.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center">
            {/* Reusable Navbar */}
            <Navbar />

            {/* Main content */}
            <div className="mt-24 bg-white p-8 shadow-md rounded-lg w-96">
                <h2 className="text-2xl font-bold text-center mb-6">Register as a User</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Select your role to participate in the supply chain:
                </p>

                <div className="mb-6">
                    <label className="block font-semibold text-gray-700 mb-2">Select Role:</label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as typeof role)} // Use `as` to cast
                        className="w-full border border-gray-300 rounded-lg p-2"
                    >
                        <option value="">Select Role</option>
                        <option value="Supplier">Supplier</option>
                        <option value="Logistics">Logistics</option>
                        <option value="Merchant">Merchant</option>
                        <option value="Customer">Customer</option>
                    </select>
                </div>

                <button
                    onClick={handleRegister}
                    disabled={loading || !role}
                    className="w-full bg-blue-600 text-white font-semibold p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Registering..." : "Register"}
                </button>
            </div>
        </div>
    );
}
