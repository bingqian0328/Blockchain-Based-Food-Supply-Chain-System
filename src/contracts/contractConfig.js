import { ethers } from "ethers";
import contractAbi from "./ABI/SupplyChain.json";

export const getContract = () => {
    const { ethereum } = window;
    const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

    if (!contractAddress) {
        console.error("Contract address is undefined. Check your .env.local file.");
        return null;
    }

    if (!ethereum) {
        alert("MetaMask is not installed!");
        return null;
    }

    const provider = new ethers.providers.Web3Provider(ethereum);
    const signer = provider.getSigner();

    // Initialize the contract
    const contract = new ethers.Contract(contractAddress, contractAbi, signer);
    return contract;
};
