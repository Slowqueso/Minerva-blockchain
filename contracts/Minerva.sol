// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Activity/ActivityContract.sol";
import "./Task/Task.sol";
import "./Registration/Registration.sol";
import "./Donation/Donation.sol";

contract Minerva {
    UserRegistrationContract private i_UserRegistrationContract;
    ActivityInterface private i_MinervaActivityContract;
    TaskInterface private i_MinervaTaskContract;
    IDonationContract private i_MinervaDonationContract;

    constructor(
        address _UserRegistrationContract,
        address _MinervaActivityContract,
        address _MinervaTaskContract,
        address _MinervaDonationContract
    ) {
        i_UserRegistrationContract = UserRegistrationContract(
            _UserRegistrationContract
        );
        i_MinervaActivityContract = ActivityInterface(_MinervaActivityContract);
        i_MinervaTaskContract = TaskInterface(_MinervaTaskContract);
        i_MinervaDonationContract = IDonationContract(_MinervaDonationContract);
    }

    /**
     * @notice - Registration Interface
     * @dev - [Note]: This interface is used for the following functions:
     *  - registerUser()
     * - getUserCredits()
     * - isUserRegistered()
     * - addUserCredits()
     */
    function registerUser() public {
        i_UserRegistrationContract.registerUser(msg.sender);
    }

    function getUserCredits(address userAddress) public view returns (uint256) {
        return i_UserRegistrationContract.getUserCredits(userAddress);
    }

    function isUserRegistered(address userAddress) public view returns (bool) {
        return i_UserRegistrationContract.isUserRegistered(userAddress);
    }

    function addUserCredits(uint256 credits) public {
        i_UserRegistrationContract.addUserCredits(msg.sender, credits);
    }

    function getUserCount() public view returns (uint256) {
        return i_UserRegistrationContract.getUserCount();
    }

    /**
     * @notice - Activity Interface
     * @dev - [Note]: This interface is used for the following functions:
     * - createActivity()
     * - joinActivity()
     * - leaveActivity()
     * - addTermForActivity()
     */
    // ------------ Events ------------
    event ActivityCreated(
        address _owner,
        uint256 _id,
        string _title,
        string _desc,
        uint256 _totalTimeInMonths,
        uint256 _level,
        uint256 dateOfCreation
    );

    event MemberWhiteListed(uint256 _activityId, address _memberAddress);

    event MemberJoined(
        uint256 _activityId,
        address _memberAddress,
        uint256 _dateOfJoin,
        uint256 _tenureInMonths
    );

    event TermCreated(uint256 _activityId, string[] _title, string[] _desc);

    event MemberLeft(
        uint256 _activityId,
        address _memberAddress,
        uint256 _dateOfLeave
    );

    /**
     * @notice Creates a new activity and stores it in the MinervaActivityContract.
     * @param _id The unique identifier for the activity.
     * @param _username The username of the creator of the activity.
     * @param _title The title of the activity.
     * @param _desc The description of the activity.
     * @param _totalTimeInMonths The total time (in months) for which the activity will be active.
     * @param _price The price (in wei) for joining the activity.
     * @param _level The required level to join the activity.
     * @param _maxMembers The maximum number of members that can join the activity.
     * @param _waitingPeriodInMonths The waiting period (in months) before the activity can be joined.
     */
    function createActivity(
        uint256 _id,
        string memory _username,
        string memory _title,
        string memory _desc,
        uint256 _totalTimeInMonths,
        uint256 _price,
        uint256 _level,
        uint256 _maxMembers,
        uint256 _waitingPeriodInMonths
    ) public {
        i_MinervaActivityContract.createActivity(
            _id,
            _username,
            _title,
            _price,
            _level,
            _maxMembers,
            _waitingPeriodInMonths,
            msg.sender
        );
        emit ActivityCreated(
            msg.sender,
            _id,
            _title,
            _desc,
            _totalTimeInMonths,
            _level,
            block.timestamp
        );
    }

    /**
     * @notice Adds a member's address to the whitelist for a given activity.
     * @param _activityID The unique identifier for the activity.
     * @param _memberAddress The address of the member to be added to the whitelist.
     */
    function addToWhitelist(
        uint256 _activityID,
        address _memberAddress
    ) public {
        i_MinervaActivityContract.addToWhitelist(
            _activityID,
            _memberAddress,
            msg.sender
        );
        emit MemberWhiteListed(_activityID, _memberAddress);
    }

    /**
     * @notice Allows a member to join an activity by paying the required fee and providing their details.
     * @param _activityID The unique identifier for the activity.
     * @param _username The username of the member joining the activity.
     * @param _tenureInMonths The tenure (in months) for which the member will be a part of the activity.
     */
    function joinActivity(
        uint256 _activityID,
        string memory _username,
        uint256 _tenureInMonths
    ) public payable {
        i_MinervaActivityContract.joinActivity{value: msg.value}(
            _activityID,
            _username,
            msg.sender
        );
        emit MemberJoined(
            _activityID,
            msg.sender,
            block.timestamp,
            _tenureInMonths
        );
    }

    /**
     * @notice Allows a member to leave an activity.
     * @param _memberAddress The address of the member leaving the activity.
     * @param _activityID The unique identifier for the activity.
     */
    function leaveActivity(address _memberAddress, uint256 _activityID) public {
        i_MinervaActivityContract.leaveActivity(
            _memberAddress,
            _activityID,
            msg.sender
        );
        emit MemberLeft(_activityID, _memberAddress, block.timestamp);
    }

    /**
     * @notice Adds a new term to an existing activity.
     * @dev Calls the `addTermForActivity` function on the `i_MinervaActivityContract` interface.
     * Emits a `TermCreated` event upon successful creation of the new term.
     * @param _activityID The ID of the activity to which the new term will be added.
     * @param _title An array of strings representing the title of the new term.
     * @param _desc An array of strings representing the description of the new term.
     */
    function addTermForActivity(
        uint256 _activityID,
        string[] memory _title,
        string[] memory _desc
    ) public {
        i_MinervaActivityContract.addTermForActivity(
            _activityID,
            _title,
            _desc,
            msg.sender
        );
        emit TermCreated(_activityID, _title, _desc);
    }

    // Activity - Getter functions
    function getActivityCount() public view returns (uint256) {
        return i_MinervaActivityContract.getActivityCount();
    }

    function getActivity(
        uint256 _activityID
    ) public view returns (ActivityInterface.Activity memory) {
        return i_MinervaActivityContract.getActivity(_activityID);
    }

    function getMemberDetails(
        address _memberAddress
    ) public view returns (ActivityInterface.Member memory) {
        return i_MinervaActivityContract.getMemberDetails(_memberAddress);
    }

    function getTermsForActivity(
        uint256 _activityID
    ) public view returns (ActivityInterface.Terms memory) {
        return i_MinervaActivityContract.getTermsForActivity(_activityID);
    }

    /**
     * @notice - Donation Interface
     * @dev - [Note]: This interface is used for the following functions:
     * - donateToActivity()
     * - withdrawSelectiveMoney()
     * - withdrawAllMoney()
     */
    event DonationMade(
        address _sender,
        uint256 _activityID,
        uint256 _userPublicID,
        uint256 _donationAmount,
        uint256 _timeStamp
    );

    event MoneyWithdrawn(
        address _sender,
        uint256 _activityID,
        uint256 _amount,
        uint256 _timeStamp
    );

    /**
     * @notice Allows a user to donate funds to a specified activity.
     * @dev Calls the `donateToActivity` function on the `i_MinervaDonationContract` interface.
     * Emits a `DonationMade` event upon successful completion of the donation.
     * @param _activityID The ID of the activity to which the donation is being made.
     * @param _userPublicID The public ID of the user making the donation.
     */
    function donateToActivity(
        uint256 _activityID,
        uint256 _userPublicID
    ) public payable {
        i_MinervaDonationContract.donateToActivity{value: msg.value}(
            _activityID,
            _userPublicID,
            msg.sender
        );
        emit DonationMade(
            msg.sender,
            _activityID,
            _userPublicID,
            msg.value,
            block.timestamp
        );
    }

    /**
     * @notice Allows an activity owner to withdraw a specified amount of funds from an activity.
     * @dev Calls the `withdrawSelectiveMoney` function on the `i_MinervaDonationContract` interface.
     * Emits a `MoneyWithdrawn` event upon successful completion of the withdrawal.
     * @param _activityID The ID of the activity from which the funds will be withdrawn.
     * @param _amount The amount of funds to be withdrawn.
     */
    function withdrawSelectiveMoney(
        uint256 _activityID,
        uint256 _amount
    ) public {
        i_MinervaDonationContract.withdrawSelectiveMoney(
            _activityID,
            _amount,
            msg.sender
        );
        emit MoneyWithdrawn(msg.sender, _activityID, _amount, block.timestamp);
    }

    /**
     * @notice Allows the owner of an activity to withdraw all the funds collected by the activity
     * @param _activityID The ID of the activity whose funds need to be withdrawn
     */
    function withdrawAllMoney(uint256 _activityID) public {
        i_MinervaDonationContract.withdrawAllMoney(_activityID, msg.sender);
        emit MoneyWithdrawn(
            msg.sender,
            _activityID,
            i_MinervaActivityContract.getDonationBalance(_activityID),
            block.timestamp
        );
    }

    function getFunders(
        uint256 _activityID
    ) public view returns (IDonationContract.Funder[] memory) {
        return i_MinervaDonationContract.getActivityFunders(_activityID);
    }

    function doesAddressHavePermission() public view returns (bool) {
        return i_MinervaDonationContract.doesAddressHavePermission();
    }

    /**
     * @notice - Task Interface
     */
    // ------------ Events ------------
    event TaskCreated(
        address _creator,
        address _assignee,
        string _description,
        uint _rewardInD,
        uint _dueDate,
        uint _creditScoreReward,
        uint256 _timeStamp
    );

    event TaskCompleted(
        address _creator,
        address _assignee,
        uint256 _taskID,
        uint256 _activityID,
        uint256 _completionTime,
        bool _completed,
        uint256 _rewardValue
    );

    /**
     * @dev Creates a task for the given activity and assigns it to the specified user.
     * @param _activityID ID of the activity to which the task belongs.
     * @param _assignee Address of the user to whom the task is assigned.
     * @param _title Title of the task.
     * @param _description Description of the task.
     * @param _rewardInD Reward in USD for completing the task.
     * @param _dueDate Unix timestamp indicating the deadline for completing the task.
     * @param _creditScoreReward Credit score reward for completing the task.
     */
    function createTask(
        uint256 _activityID,
        address _assignee,
        string memory _title,
        string memory _description,
        uint _rewardInD,
        uint _dueDate,
        uint _creditScoreReward
    ) public payable {
        i_MinervaTaskContract.createTask{value: msg.value}(
            _activityID,
            _assignee,
            _title,
            _description,
            _rewardInD,
            _dueDate,
            _creditScoreReward,
            msg.sender
        );
        emit TaskCreated(
            msg.sender,
            _assignee,
            _description,
            _rewardInD,
            _dueDate,
            _creditScoreReward,
            block.timestamp
        );
    }

    /**
     * @notice Marks a task as complete for a given activity
     * @param _activityID The ID of the activity the task belongs to
     * @param _taskID The ID of the task to be marked as complete
     */
    function completeTask(uint256 _activityID, uint256 _taskID) public {
        i_MinervaTaskContract.completeTask(_activityID, _taskID, msg.sender);
        emit TaskCompleted(
            msg.sender,
            i_MinervaTaskContract
            .getActivityTasks(_activityID)[_taskID - 1].assignee,
            _taskID,
            _activityID,
            block.timestamp,
            true,
            i_MinervaTaskContract
            .getActivityTasks(_activityID)[_taskID - 1].rewardValue
        );
    }

    function getActivityTasks(
        uint256 _activityID
    ) public view returns (TaskInterface.Task[] memory) {
        return i_MinervaTaskContract.getActivityTasks(_activityID);
    }
}
