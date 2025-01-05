interface Window {
    ethereum?: {
        request: (args: { method: string; params?: Array<any> }) => Promise<any>;
    };
}
