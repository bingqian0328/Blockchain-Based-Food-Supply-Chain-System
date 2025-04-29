// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Structure {
    enum ShipmentStatus { 
    NotShipped, 
    ReadyForShipment, // New status
    PickedUp, 
    ArrivedAtSortingCenter, 
    OnTheWayToDeliveryHub, 
    ArrivedAtDeliveryHub, 
    OutForDelivery, 
    Delivered 
}

    struct Product {
        string id;
        string barcode;
        string name;
        address creator;        // Add this field
        address currentOwner;
        address nextOwner;
        string[] componentProductIds;
        LocationData locationData;
        ProductAttributes attributes;
        address logisticPartner;    
        ShipmentStatus shipmentStatus;
        uint256 amountDue;         
        bool invoicePaid;          
    }

    struct ProductAttributes {
        string placeOfOrigin;
        string productionDate;
        string expirationDate;
        uint256 unitQuantity;
        string unitQuantityType;
        uint256 batchQuantity;
        string unitPrice;
        string category;
        string variety;
        string misc;
    }

    struct LocationData {
        string[] previous; // Previous locations of the product
        ProductLocationEntry current; // Current location details
    }

    struct ProductLocationEntry {
        string location; // Current location name
        string arrivalDate; // Date of arrival
    }

    enum Role { Supplier, Manufacturer, LogisticPartner, DistributionCenter, RetailStore }

    struct User {
        Role role;
        string gmail;
        string physicalAddress;
        string companyName;
        string businessLicenseHash;
        string phoneNumber;
    }

    struct ProductDetails {
        string id;
        string barcode;
        string name;
        address creator;        // Add this field
        string[] componentProductIds;
        string[] previousLocations;
        ProductAttributes attributes;
        ProductLocationEntry locationEntry;
        address nextOwner;
        address logisticPartner;
        ShipmentStatus shipmentStatus;
        uint256 amountDue;          // New: amount charged to the next owner (in Wei)
        bool invoicePaid;    
    }
}
