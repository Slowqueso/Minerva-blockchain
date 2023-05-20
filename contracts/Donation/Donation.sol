// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../Activity/ActivityContract.sol";
import "../Registration/Registration.sol";
import "../PriceConvertor/PriceConvertor.sol";

// Interfaces, Libraries, Contracts
interface IDonationContract {
    struct Funder {
        address sender;
        uint256 userPublicID;
        uint256 donationAmount;
    }

    function donateToActivity(
        uint256 _activityID,
        uint256 _userPublicID,
        address userAddress
    ) external payable;

    function withdrawSelectiveMoney(
        uint256 _activityID,
        uint256 _amount,
        address userAddress
    ) external;

    function withdrawAllMoney(
        uint256 _activityID,
        address userAddress
    ) external;

    function getActivityFunders(
        uint256 _activityID
    ) external view returns (Funder[] calldata);

    function doesAddressHavePermission() external view returns (bool);
}

contract MinervaDonationContract {
    using PriceConvertorLibrary for uint256;
    address private immutable i_owner;
    MinervaActivityContract private i_MinervaActivityContract;
    UserRegistrationContract private i_UserRegistrationContract;
    mapping(address => bool) public AddressesPermittedToAccess;

    constructor(address _MinervaActivityContract, address _UserRegistration) {
        i_MinervaActivityContract = MinervaActivityContract(
            _MinervaActivityContract
        );
        i_UserRegistrationContract = UserRegistrationContract(
            _UserRegistration
        );
        i_owner = msg.sender;
        AddressesPermittedToAccess[msg.sender] = true;
    }

    // ------------ Modifiers ------------
    modifier onlyOwner() {
        require(msg.sender == i_owner, "Only owner can call this function");
        _;
    }
    /**
     * @notice - This modifier checks if the user is registered
     */
    modifier isRegisteredUser(address sender) {
        require(
            i_UserRegistrationContract.isUserRegistered(sender),
            "User is not registered"
        );
        _;
    }

    modifier onlyPermitted() {
        require(
            AddressesPermittedToAccess[msg.sender],
            "Only permitted addresses can call this function"
        );
        _;
    }

    /*
     * @notice struct for the Funders/Donors for an activity
     */
    struct Funder {
        address sender;
        uint256 userPublicID;
        uint256 donationAmount;
    }

    mapping(uint256 => Funder[]) Funders;

    /**
     * @notice - This event is emitted when a donation is made to an activity
     */
    event DonationMade(
        address _sender,
        uint256 _activityID,
        uint256 _userPublicID,
        uint256 _donationAmount,
        uint256 _timeStamp,
        uint256 _totalDonationReceived
    );

    // ------------ Owner Function ------------
    function addPermittedAddress(address permittedAddress) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = true;
    }

    function removePermittedAddress(
        address permittedAddress
    ) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = false;
    }

    // ------------ Donation Methods ------------
    /**
     * @notice Function to cut taxes off the donation amount
     *
     */
    function retrieveDonatedAmount(
        uint256 _amount
    ) internal pure returns (uint256) {
        uint256 amount;
        require(_amount > 0, "Invalid Amount");
        amount = _amount - ((_amount * 25) / 100);
        return amount;
    }

    /**
     * @dev Modifiers - `isRegisteredUser`, `doesActivityExist`. Events emitted - `DonationMade`
     * @notice Function to allow users to donate to an Activity
     */
    function donateToActivity(
        uint256 _activityID,
        uint256 _userPublicID,
        address userAddress
    ) external payable isRegisteredUser(userAddress) onlyPermitted {
        if (!i_MinervaActivityContract.doesActivityExist(_activityID))
            revert Activity_NotFound();
        require(msg.value > 0, "Donation amount must be greater than 0");
        uint256 actualAmount = retrieveDonatedAmount(msg.value);
        uint256 taxAmount = msg.value - actualAmount;
        i_MinervaActivityContract.receiveDonationForActivity(
            _activityID,
            msg.value,
            actualAmount
        );
        Funders[_activityID].push(
            Funder(userAddress, _userPublicID, msg.value)
        );
        (bool sent, ) = payable(i_owner).call{value: taxAmount}("");
        uint256 credits = actualAmount.getConversionRate() * 10;
        i_UserRegistrationContract.addUserCredits(userAddress, credits);
        require(sent, "Failed to send ETH");
    }

    /**
     * @dev Modifiers - `doesActivityExist`, `onlyActivityOwners`. Events emitted - `MoneyWithdrawn`
     * @notice Function to allow Activity owners to withdraw selective amount of money from their Activity
     */
    function withdrawSelectiveMoney(
        uint256 _activityID,
        uint256 _amount,
        address userAddress
    ) external onlyPermitted {
        if (!i_MinervaActivityContract.doesActivityExist(_activityID))
            revert Activity_NotFound();
        require(
            i_MinervaActivityContract.isActivityOwner(_activityID, userAddress),
            "You are not the owner"
        );
        require(
            i_MinervaActivityContract.getDonationBalanceForActivity(
                _activityID
            ) >= _amount,
            "Insufficient funds"
        );
        (bool sent, ) = payable(userAddress).call{value: _amount}("");
        i_MinervaActivityContract.withdrawDonationMoneyFromActivity(
            _activityID,
            _amount
        );
        require(sent, "Failed to send ETH");
    }

    /**
     * @dev Modifiers - `doesActivityExist`, `onlyActivityOwners`. Events emitted - `MoneyWithdrawn`
     * @notice Function to allow Activity owners to withdraw all the money from their Activity
     */
    function withdrawAllMoney(
        uint256 _activityID,
        address userAddress
    ) public onlyPermitted {
        if (!i_MinervaActivityContract.doesActivityExist(_activityID))
            revert Activity_NotFound();
        require(
            i_MinervaActivityContract.isActivityOwner(_activityID, userAddress),
            "You are not the owner"
        );
        require(
            i_MinervaActivityContract.getDonationBalanceForActivity(
                _activityID
            ) > 0,
            "Insufficient funds"
        );
        uint256 amount = i_MinervaActivityContract
            .getDonationBalanceForActivity(_activityID);
        (bool sent, ) = payable(userAddress).call{value: amount}(
            "Money Withdrawn"
        );
        i_MinervaActivityContract.withdrawDonationMoneyFromActivity(
            _activityID,
            amount
        );
        require(sent, "Failed to send ETH");
    }

    /**
     * @notice Function to get the details of a Funder
     */
    function getActivityFunders(
        uint256 _activityID
    ) external view returns (Funder[] memory) {
        return Funders[_activityID];
    }

    function doesAddressHavePermission() external view returns (bool) {
        return AddressesPermittedToAccess[msg.sender];
    }
}
