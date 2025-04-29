// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library StringUtils {
    // Converts a uint to its decimal string representation.
    function uint2str(uint _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i % 10));
            bstr[k] = bytes1(temp);
            _i /= 10;
        }
        str = string(bstr);
    }

      function equals(string memory a, string memory b) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}
