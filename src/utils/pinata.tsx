import axios from "axios";

// Pinata API configuration
const PINATA_API_KEY = "490e5f6fc86ad5169410";
const PINATA_API_SECRET = "ef70939ed8d9308c59e0db9864c2ed029d2e317e8cccc5b1fc63e7d4bfb47b81";
const PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzZmNmNTgzYS1kNTkyLTRjY2MtOTlkZi0wODljMmZlMTU4M2UiLCJlbWFpbCI6ImJxbGltMjAwNEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiNDkwZTVmNmZjODZhZDUxNjk0MTAiLCJzY29wZWRLZXlTZWNyZXQiOiJlZjcwOTM5ZWQ4ZDkzMDhjNTllMGRiOTg2NGMyZWQwMjlkMmUzMTdlOGNjY2M1YjFmYzYzZTdkNGJmYjQ3YjgxIiwiZXhwIjoxNzY3NjAwNjkzfQ.-9UrYwvcadwXFZstJ7RIoittdxKqeLhbd8Xbij10Yxg";

/**
 * Upload a file to IPFS via Pinata
 * @param file - The file to upload
 * @returns The IPFS hash of the uploaded file
 */
export const uploadToPinata = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";

    try {
        const response = await axios.post(url, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${PINATA_JWT}`,
            },
        });
        return response.data.IpfsHash; // Return the IPFS hash
    } catch (error) {
        console.error("Error uploading to Pinata:", error);
        throw new Error("Failed to upload file to IPFS.");
    }
};
