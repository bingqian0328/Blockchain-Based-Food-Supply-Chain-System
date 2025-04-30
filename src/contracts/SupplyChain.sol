// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Structure.sol";
import "./StringUtils.sol";

contract SupplyChain is Structure {
    using StringUtils for uint;
    using StringUtils for string;

    mapping(address => User) public users;
    mapping(string => Product) public products;
    string[] public allProductIds; // For iteration

    // Inventory mapping for final delivered products (if needed)
    mapping(address => string[]) public inventory;

    // EVENTS
    event UserRegistered(
        address indexed userAddress,
        Role role,
        string gmail,
        string physicalAddress
    );
    event ProductCreated(
        string indexed productId,
        address indexed creator
    );
    event InvoicePaid(
        string indexed productId,
        address indexed payer,
        uint256 amountPaid,
        address recipient // Add this parameter to track who received the payment
    );
    event ShipmentStatusUpdated(
        string indexed productId,
        uint8 newStatus,
        uint256 timestamp
    );
    event ParcelReceivedEvent(
        string indexed productId,
        address receiver,
        uint256 timestamp
    );
    // This event is used as a generic history log for the product.
    event ProductHistoryRecorded(
        string indexed productId,
        string eventType,
        string details,
        uint256 timestamp
    );

    /**
     * @dev Internal helper to construct a ProductDetails structure from a Product.
     */
    function _buildProductDetails(Product storage p) internal view returns (ProductDetails memory) {
        return ProductDetails({
            id: p.id,
            barcode: p.barcode,
            name: p.name,
            creator: p.creator,      // Add this
            componentProductIds: p.componentProductIds,
            previousLocations: p.locationData.previous,
            attributes: p.attributes,
            locationEntry: p.locationData.current,
            nextOwner: p.nextOwner,
            logisticPartner: p.logisticPartner,
            shipmentStatus: p.shipmentStatus,
            invoicePaid: p.invoicePaid,
            amountDue: p.amountDue
        });
    }

    /**
     * @dev Register a user's role in the supply chain system along with extra details.
     */
    function registerRole(
        Role _role,
        string memory _gmail,
        string memory _physicalAddress,
        string memory _companyName,                                                            
        string memory _businessLicenseHash,
        string memory _phoneNumber
    ) public {
        require(bytes(users[msg.sender].gmail).length == 0, "User already registered");
        users[msg.sender] = User({
            role: _role,
            gmail: _gmail,
            physicalAddress: _physicalAddress,
            companyName: _companyName,
            businessLicenseHash: _businessLicenseHash,
            phoneNumber: _phoneNumber
        });
        emit UserRegistered(msg.sender, _role, _gmail, _physicalAddress);
        // (Optional) You can record a history event here
    }

    /**
     * @dev Create a product on-chain.
     */
    function createProduct(
        string memory _id,
        string memory _barcode,
        string memory _name,
        string[] memory _componentProductIds,
        uint256[] memory _componentQuantities,  // NEW parameter
        ProductAttributes memory _attributes,
        address _nextOwner,
        string memory _arrivalDate,
        address _logisticPartner,
        uint256 _amountDue,
        string memory _otherComponents         // NEW parameter
    ) public {
        require(bytes(users[msg.sender].gmail).length > 0, "User not registered");
        require(
            users[msg.sender].role == Role.Supplier || users[msg.sender].role == Role.Manufacturer,
            "Only supplier or manufacturer can create"
        );
        if (users[msg.sender].role == Role.Supplier) {
            require(_componentProductIds.length == 0, "Supplier cannot have component products");
        }
        // For Manufacturers: ensure the provided arrays match in length and update component inventory using product attributes.
        if (users[msg.sender].role == Role.Manufacturer) {
            require(_componentProductIds.length == _componentQuantities.length, "Component IDs and quantities length mismatch");
            
            // Create a new array to store component IDs
            string[] memory componentIds = new string[](_componentProductIds.length);
            
            for (uint256 i = 0; i < _componentProductIds.length; i++) {
                require(
                    products[_componentProductIds[i]].attributes.unitQuantity >= _componentQuantities[i],
                    "Not enough inventory for component"
                );
                // Deduct from unitQuantity
                products[_componentProductIds[i]].attributes.unitQuantity -= _componentQuantities[i];
                
                // Store the component ID
                componentIds[i] = _componentProductIds[i];
                
                // Record component usage in history
                emit ProductHistoryRecorded(
                    _id,
                    "ComponentUsed",
                    string(abi.encodePacked(
                        "Used component ", 
                        _componentProductIds[i], 
                        " (", 
                        _componentQuantities[i].uint2str(),  // Changed from toString() to uint2str()
                        " units)"
                    )),
                    block.timestamp
                );
            }

            // Store component IDs in the product struct
            products[_id].componentProductIds = componentIds;
        }
        // Append additional components info to misc field.
        string memory finalMisc = _attributes.misc;
        if (bytes(_otherComponents).length > 0) {
            finalMisc = string(abi.encodePacked(finalMisc, " | Other Components: ", _otherComponents));
        }
        // Create and store the product
        products[_id] = Product({
            id: _id,
            barcode: _barcode,
            name: _name,
            creator: msg.sender,     // Add this
            currentOwner: msg.sender,
            nextOwner: _nextOwner,
        // For Supplier, force empty list; for Manufacturer, use provided list.
        componentProductIds: (users[msg.sender].role == Role.Supplier ? new string[](0) : _componentProductIds),
                locationData: LocationData({
                    previous: new string[](0),
                    current: ProductLocationEntry({
                        location: users[msg.sender].physicalAddress,
                        arrivalDate: _arrivalDate
                    })
        }),
        attributes: ProductAttributes({
            placeOfOrigin: _attributes.placeOfOrigin,
            productionDate: _attributes.productionDate,
            expirationDate: _attributes.expirationDate,
            unitQuantity: _attributes.unitQuantity,
            unitQuantityType: _attributes.unitQuantityType,
            batchQuantity: _attributes.batchQuantity,
            unitPrice: _attributes.unitPrice,
            category: _attributes.category,
            variety: _attributes.variety,
            misc: finalMisc
        }),
        logisticPartner: _logisticPartner,
        shipmentStatus: ShipmentStatus.NotShipped,
        amountDue: _amountDue,       // NEW: amount charged to the next owner
        invoicePaid: false           // NEW: invoice not yet paid
    });

        allProductIds.push(_id);
        emit ProductCreated(_id, msg.sender);
        // Record history event for creation.
        emit ProductHistoryRecorded(_id, "ProductCreated", "Product created by supplier/manufacturer", block.timestamp);
    }

    /**
     * @dev Allows the next owner to pay the invoice for a product.
     * Payment is sent directly to the product creator, not the current owner.
     */
    function payAmountDue(string memory _productId) public payable {
        Product storage p = products[_productId];
        require(msg.sender == p.nextOwner, "Only the designated next owner can pay");
        require(!p.invoicePaid, "Invoice already paid");
        require(msg.value >= p.amountDue, "Insufficient payment");

        p.invoicePaid = true;
        p.shipmentStatus = ShipmentStatus.ReadyForShipment; // Automatically update status
        
        // Transfer funds to the product creator instead of current owner
        payable(p.creator).transfer(p.amountDue);
        
        if (msg.value > p.amountDue) {
            payable(msg.sender).transfer(msg.value - p.amountDue);
        }
        
        // Update the event to show payment was made to creator
        emit InvoicePaid(_productId, msg.sender, p.amountDue, p.creator);
        
        emit ShipmentStatusUpdated(_productId, uint8(p.shipmentStatus), block.timestamp);
        emit ProductHistoryRecorded(_productId, "InvoicePaid", "Invoice paid by next owner", block.timestamp);
    }

    function getUserRole(address _user) public view returns (Role) {
        require(bytes(users[_user].gmail).length > 0, "User not registered");
        return users[_user].role;
    }

    /**
     * @dev Returns an array of ProductDetails for which _owner is the nextOwner.
     */
    function getProductsForNextOwner(address _owner) public view returns (ProductDetails[] memory) {
        uint count = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            if (products[allProductIds[i]].nextOwner == _owner) {
                count++;
            }
        }
        ProductDetails[] memory result = new ProductDetails[](count);
        uint index = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            string memory pId = allProductIds[i];
            if (products[pId].nextOwner == _owner) {
                result[index] = _buildProductDetails(products[pId]);
                index++;
            }
        }
        return result;
    }

    /**
     * @dev Returns an array of ProductDetails for which _lp is the logisticPartner.
     */
    function getProductsForLogisticPartner(address _lp) public view returns (ProductDetails[] memory) {
        uint count = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            if (products[allProductIds[i]].logisticPartner == _lp) {
                count++;
            }
        }
        ProductDetails[] memory result = new ProductDetails[](count);
        uint index = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            string memory pId = allProductIds[i];
            if (products[pId].logisticPartner == _lp) {
                result[index] = _buildProductDetails(products[pId]);
                index++;
            }
        }
        return result;
    }

    /**
     * @dev Returns an array of ProductDetails for which _creator is the creator.
     * Changed to use creator field instead of currentOwner.
     */
    function getProductsCreatedBy(address _creator) public view returns (ProductDetails[] memory) {
        uint count = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            if (products[allProductIds[i]].creator == _creator) {  // Changed from currentOwner to creator
                count++;
            }
        }
        
        ProductDetails[] memory result = new ProductDetails[](count);
        uint index = 0;
        for (uint i = 0; i < allProductIds.length; i++) {
            string memory pId = allProductIds[i];
            if (products[pId].creator == _creator) {  // Changed from currentOwner to creator
                result[index] = _buildProductDetails(products[pId]);
                index++;
            }
        }
        return result;
    }

    /**
     * @dev Allows the logistic partner to update a product's shipment status and location.
     * When setting status to Delivered, automatically sets location to recipient's address.
     */
    function updateShipmentStatus(
        string memory _productId, 
        ShipmentStatus _newStatus, 
        string memory _deliveryProofIPFS,
        string memory _currentLocation // New parameter
    ) public {
        Product storage p = products[_productId];
        require(msg.sender == p.logisticPartner, "Only assigned logistic partner can update");
        require(p.invoicePaid, "Invoice not paid");

        // Enforce shipment progress flow
        require(
            uint8(_newStatus) == uint8(p.shipmentStatus) + 1,
            "Invalid shipment status progression"
        );
        
        // Store the old location in previous locations array
        p.locationData.previous.push(p.locationData.current.location);
        
        // Update location based on shipment status
        if (_newStatus == ShipmentStatus.Delivered) {
            // For delivered status, set location to recipient's address
            p.locationData.current.location = users[p.nextOwner].physicalAddress;
        } else {
            // For other statuses, use the provided location
            p.locationData.current.location = _currentLocation;
        }
        
        // Update arrival date
        p.locationData.current.arrivalDate = getCurrentDate(); // You need to implement this helper function
        
        // If setting to Delivered, require proof of delivery
        if (_newStatus == ShipmentStatus.Delivered) {
            require(bytes(_deliveryProofIPFS).length > 0, "Proof of delivery required");
            
            // Store the proof of delivery in the misc field
            p.attributes.misc = string(abi.encodePacked(
                p.attributes.misc,
                " | POD_IPFS: ",
                _deliveryProofIPFS
            ));
        }

        p.shipmentStatus = _newStatus;
        emit ShipmentStatusUpdated(_productId, uint8(_newStatus), block.timestamp);
        
        // Add delivery proof info to the history event if it's provided
        string memory details = string(abi.encodePacked(
            "Shipment status updated to ", 
            uint(_newStatus).uint2str(),
            " at location: ",
            p.locationData.current.location
        ));
        
        if (_newStatus == ShipmentStatus.Delivered) {
            details = string(abi.encodePacked(details, " with proof of delivery"));
        }
        
        emit ProductHistoryRecorded(
            _productId,
            "ShipmentStatusUpdated",
            details,
            block.timestamp
        );
        
        // Add a specific location update event
        emit ProductHistoryRecorded(
            _productId,
            "LocationUpdated",
            string(abi.encodePacked("Location updated to: ", p.locationData.current.location)),
            block.timestamp
        );
    }

    // Helper function to get current date as a string
    function getCurrentDate() internal view returns (string memory) {
        // This is a simplified version that returns timestamp
        // In a production environment, you might want to format this properly
        return uint256(block.timestamp).uint2str();
    }

    /**
     * @dev Allows the designated nextOwner to mark a product as received.
     * Modified to preserve creator information while transferring ownership.
     */
    function markParcelReceived(string memory _productId) public {
        Product storage p = products[_productId];
        require(msg.sender == p.nextOwner, "Only the designated next owner can receive");
        require(p.shipmentStatus == ShipmentStatus.Delivered, "Product has not been delivered yet");
        
        // Store the creator before updating ownership
        address creator = p.creator;
        
        // Update ownership and status
        p.currentOwner = msg.sender;
        inventory[msg.sender].push(_productId);
        
        // Preserve creator field
        p.creator = creator;
        
        emit ParcelReceivedEvent(_productId, msg.sender, block.timestamp);
        emit ProductHistoryRecorded(_productId, "ParcelReceived", "Product received by next owner", block.timestamp);
    }

    /**
     * @dev Returns an array of ProductDetails representing the inventory for a user.
     */
    function getInventory(address _user) public view returns (ProductDetails[] memory) {
        string[] storage productIds = inventory[_user];
        ProductDetails[] memory result = new ProductDetails[](productIds.length);
        for (uint i = 0; i < productIds.length; i++) {
            result[i] = _buildProductDetails(products[productIds[i]]);
        }
        return result;
    }

    /**
        * @dev Checks if a product is in a user's inventory.
        * @param _productId The ID of the product to check
        * @param _user The address of the user whose inventory to check
        * @return bool True if the product is in the user's inventory
        */
        function isProductInInventory(string memory _productId, address _user) public view returns (bool) {
            string[] storage userInventory = inventory[_user];
            for (uint i = 0; i < userInventory.length; i++) {
                if (userInventory[i].equals(_productId)) { // Use the equals function from StringUtils
                    return true;
                }
            }
            return false;
        }

    /**
     * @dev Allows the retail store (currentOwner) to update the inventory by marking a quantity as sold.
     * This reduces the product's available stock (attributes.batchQuantity) by the sold quantity.
     * @param _productId The ID of the product.
     * @param _soldQuantity The quantity that has been sold.
     */
    function updateSoldOut(string memory _productId, uint256 _soldQuantity) public {
        Product storage p = products[_productId];
        // Only the retail store (currentOwner) can update inventory
        require(msg.sender == p.currentOwner, "Only the retail store merchant can update inventory");
        require(p.attributes.unitQuantity >= _soldQuantity, "Sold quantity exceeds available stock");
        // Deduct from unitQuantity instead of batchQuantity
        p.attributes.unitQuantity -= _soldQuantity;
        
        // Add a history record for the stock update
        emit ProductHistoryRecorded(
            _productId,
            "QuantityUpdated",
            string(abi.encodePacked("Sold ", _soldQuantity.uint2str(), " units")),  // Changed from toString() to uint2str()
            block.timestamp
        );
    }
}
