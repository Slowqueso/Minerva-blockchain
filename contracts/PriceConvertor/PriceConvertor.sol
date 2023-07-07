// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

library PriceConvertorLibrary {
    function getPrice(
        address _priceFeedAddress
    ) internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            _priceFeedAddress
        );
        (, int256 answer, , , ) = priceFeed.latestRoundData();
        return uint256(answer * 10000000000);
    }

    function getConversionRate(
        uint256 ethAmount,
        address _priceFeedAddress
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(_priceFeedAddress);
        uint256 ethAmountInUsd = (ethPrice * ethAmount);
        return ethAmountInUsd / 1e36;
    }
}
