// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../Registration/Registration.sol";
import "../PriceConvertor/PriceConvertor.sol";

// 3. Interfaces, Libraries, Contracts
error Activity_NotOwner();
error Activity_NotWhiteListed();
error Activity_NotFound();

interface ActivityInterface {
    enum ActivityStatus {
        OPEN,
        IN_PROGRESS,
        CLOSED
    }
    struct Activity {
        uint256 id;
        address payable owner;
        string title;
        uint256 joinPrice;
        uint256 level;
        ActivityStatus status;
        uint256 dateOfCreation;
        uint256 maxMembers;
        address payable[] members;
        uint256 _waitUntil;
        uint256 donationReceived;
        uint256 donationBalance;
    }

    struct Member {
        string _id;
        uint256 dateOfJoin;
        uint256 forActivity;
        uint256 timeJoined;
        bool isEngaged;
    }

    struct Terms {
        string[] title;
        string[] desc;
    }

    function createActivity(
        uint256 _id,
        string calldata _username,
        string calldata _title,
        uint256 _price,
        uint256 _level,
        uint256 _maxMembers,
        uint256 _waitingPeriodInMonths,
        address userAddress
    ) external;

    function addToWhitelist(
        uint256 _activityID,
        address _memberAddress,
        address userAddress
    ) external;

    function joinActivity(
        uint256 _activityID,
        string calldata _username,
        address userAddress
    ) external payable;

    function leaveActivity(
        address _memberAddress,
        uint256 _activityID,
        address userAddress
    ) external;

    function addTermForActivity(
        uint256 _activityID,
        string[] calldata _title,
        string[] calldata _desc,
        address userAddress
    ) external;

    function getActivityCount() external view returns (uint256);

    function getActivity(
        uint256 activityID
    ) external view returns (Activity memory);

    function getDonationBalance(
        uint256 _activityID
    ) external view returns (uint256 balance);

    function getMemberDetails(
        address _memberAddress
    ) external view returns (Member memory);

    function getTermsForActivity(
        uint256 _activityID
    ) external view returns (Terms memory);
}

/**
 * @title Minerva Activity Contract
 * @author Slowqueso/Lynda Barn/Kartik Ranjan
 * @notice This contract allows users to create a MOU or Agreement between Activity hosts and Activity Members.
 * @dev Data Price Feeds are implemented for ETH / USD
 */
contract MinervaActivityContract {
    using PriceConvertorLibrary for uint256;
    UserRegistrationContract private i_UserRegistrationContract;
    address private immutable i_owner;
    uint256 private s_lastUpdated;

    // ------------ Pre Defined Activity Levels ------------
    /**
     * @dev 4 States of Activity.
     * `OPEN `- The activity allows members to join
     * `IN_PROGRESS` - Checks for how long the progress is
     * `CLOSED` - Activity does not accept anymore members
     * `FAILED` - Activity deleted
     */
    enum ActivityStatus {
        OPEN,
        IN_PROGRESS,
        CLOSED
    }

    uint256[] internal maxJoiningPrice = [5, 10, 30, 50, 100];
    uint256[] internal minCredForActivity = [100, 300, 1000, 1500, 2000];
    mapping(uint256 => uint256) internal levelToMaxTasks;
    mapping(address => bool) public AddressesPermittedToAccess;

    constructor(address _UserRegistrationContractAddress) {
        i_UserRegistrationContract = UserRegistrationContract(
            _UserRegistrationContractAddress
        );
        i_owner = msg.sender;
        s_lastUpdated = block.timestamp;
        AddressesPermittedToAccess[msg.sender] = true;
    }

    // ------------ Global Counters ------------
    uint256 private s_activityCounter = 0;
    uint256 private s_ownerFunds = 0;
    uint256 private s_upkeepCounter;

    // ------------ Structs ------------
    /**
     * @notice struct for `Activities`
     */
    struct Activity {
        uint256 id;
        address payable owner;
        string title;
        uint256 joinPrice;
        uint256 level;
        ActivityStatus status;
        uint256 dateOfCreation;
        uint256 maxMembers;
        address payable[] members;
        uint256 _waitUntil;
        uint256 donationReceived;
        uint256 donationBalance;
    }

    /**
     * @notice struct for Activity Members
     * @dev `dateOfJoin` is in unix timestamp (block.timestamp).
     */
    struct Member {
        string _id;
        uint256 dateOfJoin;
        uint256 forActivity;
        uint256 timeJoined;
        bool isEngaged;
    }

    /**
     * @notice struct for each Terms and Conditions for Activities
     */
    struct Terms {
        string[] title;
        string[] desc;
    }

    // ------------ Arrays and Mappings ------------
    mapping(uint256 => Activity) Activities;
    mapping(uint256 => address[]) ActivityIdToWhiteListedUsers;
    mapping(address => Member) Members;
    mapping(uint256 => Terms) ActivityIdToTerms;
    uint256[] activitiesForUpkeep;

    /**
     * @notice This Array gets resetted to default i.e [] after every alteration
     * @dev strictly use for storing arrays into structs.
     */
    address payable[] memberAddress;

    // ------------ Modifiers ------------
    /**
     * @dev To allow functions to be executed only by Contract owner - Minerva
     */
    modifier onlyOwner() {
        if (msg.sender != i_owner) revert Activity_NotOwner();
        _;
    }

    // ------------ Functional Public Modifiers ------------
    function doesActivityExist(uint256 _id) public view returns (bool) {
        return Activities[_id].level > 0;
    }

    function isActivityOwner(
        uint256 _id,
        address sender
    ) public view returns (bool) {
        return Activities[_id].owner == sender;
    }

    /**
     * @dev to check if the sender is a member of the activity
     */
    modifier isMemberOfActivity(uint256 _id, address sender) {
        bool isNotMember = true;
        for (uint256 i = 0; i < Activities[_id].members.length; i++) {
            if (Activities[_id].members[i] == payable(sender)) {
                isNotMember = false;
            }
        }
        require(isNotMember, "You are already a member of this activity");
        _;
    }

    /**
     * @dev Checks if the user is registered
     */
    modifier isRegisteredUser(address sender) {
        require(
            i_UserRegistrationContract.isUserRegistered(sender),
            "User is not registered"
        );
        _;
    }

    /**
     * @dev Checks if user is whitelisted for activity
     */
    modifier isUserWhitelisted(uint256 _activityID, address sender) {
        bool isWhitelisted = false;
        for (
            uint256 i = 0;
            i < ActivityIdToWhiteListedUsers[_activityID].length;
            i++
        ) {
            if (ActivityIdToWhiteListedUsers[_activityID][i] == sender) {
                isWhitelisted = true;
            }
        }
        if (!isWhitelisted) revert Activity_NotWhiteListed();
        _;
    }

    /**
     * @dev Only allows function to be called by permitted addresses
     */
    modifier onlyPermitted() {
        require(
            AddressesPermittedToAccess[msg.sender],
            "Only permitted addresses can call this function"
        );
        _;
    }

    // ------------ Owner Functions ------------
    /**
     * @notice Function to add funds to the contract
     * @dev Only the owner of the contract can execute this function
     */
    function addFundsToContract() public payable onlyOwner {
        s_ownerFunds += msg.value;
    }

    function addPermittedAddress(address permittedAddress) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = true;
    }

    function removePermittedAddress(
        address permittedAddress
    ) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = false;
    }

    /**
     * @notice Function to withdraw funds from the contract
     * @dev Only the owner of the contract can execute this function
     */
    function withdrawFundsFromContract(uint256 _amount) public onlyOwner {
        require(_amount <= s_ownerFunds, "Not enough funds in the contract");
        s_ownerFunds -= _amount;
        payable(msg.sender).transfer(_amount);
    }

    // ------------ Activity Methods ------------
    // Create Activity
    /**
     * @notice Function for creating an Activity
     * @dev emits Event - `ActivityCreated`
     */
    function createActivity(
        uint256 _id,
        string memory _username,
        string memory _title,
        uint256 _price,
        uint256 _level,
        uint256 _maxMembers,
        uint256 _waitingPeriodInMonths,
        address userAddress
    ) external isRegisteredUser(userAddress) onlyPermitted {
        require(_price <= maxJoiningPrice[_level - 1], "ETH limit crossed");
        require(
            i_UserRegistrationContract.getUserCredits(userAddress) >=
                minCredForActivity[_level - 1],
            "Not Enough Credits for creating the activity!"
        );
        uint256 dateOfCreation = block.timestamp;
        s_activityCounter++;
        uint256 id = s_activityCounter;
        memberAddress.push(payable(userAddress));
        uint256 _waitUntil = block.timestamp +
            (_waitingPeriodInMonths * 30 days);
        Activity memory activity = Activity(
            _id,
            payable(userAddress),
            _title,
            _price,
            _level,
            ActivityStatus.OPEN,
            block.timestamp,
            _maxMembers,
            memberAddress,
            _waitUntil,
            0,
            0
        );
        Members[userAddress] = Member(
            _username,
            dateOfCreation,
            id,
            block.timestamp,
            true
        );
        Activities[id] = activity;
        delete memberAddress;
    }

    // Add Terms and Conditions
    /**
     * @dev Modifiers - `onlyActivityOwners`, `doesActivityExist`, Events emitted - `TermAdded`
     * @notice Method to allow activity owners to add terms and conditions to their Activities
     */
    function addTermForActivity(
        uint256 _activityID,
        string[] memory _title,
        string[] memory _desc,
        address userAddress
    ) external onlyPermitted isRegisteredUser(userAddress) {
        if (!doesActivityExist(_activityID)) revert Activity_NotFound();
        require(
            isActivityOwner(_activityID, userAddress),
            "User is not the owner of the activity"
        );
        Terms memory terms = Terms(_title, _desc);
        ActivityIdToTerms[_activityID] = terms;
    }

    // Add to whitelist
    /**
     * @notice Function for adding a user to the whitelist of an Activity
     * @dev emits Event - `MemberWhiteListed`
     */
    function addToWhitelist(
        uint256 _activityID,
        address _memberAddress,
        address userAddress
    ) external onlyPermitted {
        require(
            isActivityOwner(_activityID, userAddress),
            "User is not the owner of the activity"
        );
        ActivityIdToWhiteListedUsers[_activityID].push(_memberAddress);
    }

    // Join Activity
    /**
     * @dev Modifiers used - `isActivityJoinable`, `doesActivityExist`, `isMemberOfActivity`. Events emitted - `MemberJoined`.
     * @notice Function for external users (in terms of Activity) to participate in the Activity.
     */
    function joinActivity(
        uint256 _activityID,
        string memory _username,
        address userAddress
    )
        external
        payable
        isRegisteredUser(userAddress)
        isMemberOfActivity(_activityID, userAddress)
        isUserWhitelisted(_activityID, userAddress)
        onlyPermitted
    {
        require(
            Members[userAddress].isEngaged == false,
            "Already Engaged in activity"
        );
        if (!doesActivityExist(_activityID)) revert Activity_NotFound();
        uint256 _dateOfJoin = block.timestamp;
        Activity storage activity = Activities[_activityID];
        require(
            (activity.joinPrice - 1) < msg.value.getConversionRate() &&
                msg.value.getConversionRate() <= (activity.joinPrice + 1),
            "Not enough ETH"
        );
        Members[userAddress] = Member(
            _username,
            _dateOfJoin,
            _activityID,
            block.timestamp,
            true
        );
        activity.members.push(payable(userAddress));
        if (activity.status == ActivityStatus.OPEN) {
            activity.status = ActivityStatus.IN_PROGRESS;
        }
        (bool sent, ) = activity.owner.call{value: msg.value}("");
        require(sent, "Failed to send ETH");
    }

    // Leave Activity
    /**
     * @dev Modifiers used - `isActivityOwner`, `doesActivityExist`. Events emitted - `MemberLeft`.
     * @notice Function for external users (in terms of Activity) to leave the Activity.
     */
    function leaveActivity(
        address _memberAddress,
        uint256 _activityID,
        address userAddress
    ) external onlyPermitted {
        if (!doesActivityExist(_activityID)) revert Activity_NotFound();
        require(isActivityOwner(_activityID, userAddress));
        Members[_memberAddress].isEngaged = false;
        Members[_memberAddress].forActivity = 0;
    }

    /**
     * @notice - Function for receiving money from donations
     */
    function receiveDonationForActivity(
        uint256 _activityID,
        uint256 _donationReceived,
        uint256 _donationBalance
    ) external {
        Activities[_activityID].donationReceived += _donationReceived;
        Activities[_activityID].donationBalance += _donationBalance;
    }

    /**
     * @notice - Function for withdrawing Donation money from Activity
     */
    function withdrawDonationMoneyFromActivity(
        uint256 _activityID,
        uint256 _amount
    ) external {
        Activities[_activityID].donationBalance -= _amount;
    }

    // @Chainlink Keepers
    /**
     * @dev This function checks if any of the activities need an Upkeep
     * Going to be called inside `performUpkeep` to check for Activities that are expired.
     */
    function checkUpkeep() internal returns (bool upkeepNeeded) {
        bool activitiesAdded = false;
        bool hasBalance = address(this).balance > 0;
        Activity memory activity;
        if (s_activityCounter > 0) {
            for (uint256 i = 1; i < s_activityCounter + 1; i++) {
                activity = Activities[i];
                if (activity.status == ActivityStatus.OPEN) {
                    if ((block.timestamp >= activity._waitUntil)) {
                        if ((activity.members.length <= 1)) {
                            activitiesForUpkeep.push(i);
                            activitiesAdded = true;
                        }
                    }
                }
            }
        } else {
            return upkeepNeeded = false;
        }

        s_lastUpdated = block.timestamp;
        upkeepNeeded = (activitiesAdded && hasBalance);
    }

    /**
     * @dev `performUpkeep` is called by the Time-based Chainlink Keepers called on `1 0,12 * * *`
     */
    function performUpkeep() external {
        bool upkeepNeeded = checkUpkeep();
        require(upkeepNeeded, "Upkeep not needed");
        Activity storage activity;
        for (uint i = 0; i < activitiesForUpkeep.length; i++) {
            uint256 id = activitiesForUpkeep[i];
            activity = Activities[id];
            activity.status = ActivityStatus.CLOSED;
        }
        delete activitiesForUpkeep;
        s_lastUpdated = block.timestamp;
        s_upkeepCounter++;
    }

    // ------------ Getters ------------
    /**
     * @notice Function to get the owner of Activity
     */
    function getOwner() public view onlyOwner returns (address) {
        return (i_owner);
    }

    /**
     * @notice Function to get the details of an Activity
     */
    function getActivityCount() external view returns (uint256) {
        return s_activityCounter;
    }

    function getActivity(
        uint256 activityID
    ) external view returns (Activity memory) {
        Activity memory returnActivity = Activities[activityID];
        return (returnActivity);
    }

    function getTermsForActivity(
        uint256 _activityID
    ) external view returns (Terms memory) {
        return ActivityIdToTerms[_activityID];
    }

    /**
     * @notice - To get the donation balance of the activity
     */
    function getDonationBalance(
        uint256 _activityID
    ) external view returns (uint256) {
        return Activities[_activityID].donationBalance;
    }

    function getActivityLevel(
        uint256 _activityID
    ) external view returns (uint256) {
        Activity memory activity = Activities[_activityID];
        return activity.level;
    }

    /**
     * @notice Function to get the details of a Member
     */
    function getMemberDetails(
        address _memberAddress
    ) external view returns (Member memory) {
        Member memory member = Members[_memberAddress];
        return (member);
    }

    function getDonationBalanceForActivity(
        uint256 _activityID
    ) external view returns (uint256) {
        Activity memory activity = Activities[_activityID];
        return activity.donationBalance;
    }
}
