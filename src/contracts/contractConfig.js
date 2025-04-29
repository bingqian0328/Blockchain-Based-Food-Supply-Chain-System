import { ethers } from "ethers";
import contractAbi from "./ABI/SupplyChain.json";

export const getContract = () => {
    const { ethereum } = window;
    const contractAddress = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

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
