// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title Minerva Activity Contract
 * @author Slowqueso/Lynda Barn/Kartik Ranjan
 * @notice This contract allows users to create a MOU or Agreement between Activity hosts and Activity Members.
 * @dev Data Price Feeds are implemented for ETH / USD
 */
contract ActivityContract {
    // Type Declarations
    /**
     * @notice Global Variables for owner, price feed and logical minimum USD for making contract prices.
     */
    uint256[] internal maxJoiningPrice = [5, 10, 30, 50, 100];
    uint256[] internal minCredForActivity = [100, 300, 1000, 1500, 2000];
    AggregatorV3Interface private s_priceFeed;
    address private immutable i_owner;
    uint256 private s_lastUpdated;
    uint256 private s_upkeepCounter;
    uint256 private s_userCounter = 0;
    uint256 private s_activityCounter = 0;
    uint256 private s_ownerFunds = 0;

    // Custom Type Variables
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
        CLOSED,
        FAILED
    }

    constructor(address v3Address) {
        s_priceFeed = AggregatorV3Interface(v3Address);
        i_owner = msg.sender;
        s_lastUpdated = block.timestamp;
    }

    /**
     * @notice struct for `Activities`
     */
    struct Activity {
        string id;
        address payable owner;
        string title;
        string desc;
        uint256 joinPrice;
        uint256 level;
        ActivityStatus status;
        uint256 dateOfCreation;
        uint256 totalTimeInMonths;
        uint256 maxMembers;
        address payable[] members;
        uint256 _waitUntil;
        uint256 donationReceived;
        uint256 donationBalance;
    }

    /**
     * @notice struct for Activity Members
     * @dev `dateOfJoin` is in a DDMMYY format.
     */
    struct Member {
        string username;
        uint256 tenureInMonths;
        uint256 dateOfJoin;
        uint256 forActivity;
        uint256 timeJoined;
    }

    /**
     * @notice struct for each Terms and Conditions for Activities
     */
    struct Term {
        string[] title;
        string[] desc;
        uint256 id;
    }

    /*
     * @notice struct for the Funders/Donors for an activity
     */
    struct Funder {
        address sender;
        uint256 userPublicID;
        uint256 donationAmount;
    }

    struct Task {
        address creator;
        address assignee;
        string title;
        string description;
        uint rewardInD;
        uint dueDate;
        uint creditScoreReward;
        bool completed;
        uint256 assignedDate;
        uint256 rewardValue;
    }

    // Arrays and Mappings
    mapping(address => uint256) UserIdToCredits;
    mapping(address => bool) UserRegistration;
    mapping(uint256 => Activity) Activities;
    mapping(uint256 => Task[]) Tasks;
    mapping(address => Member) Members;
    mapping(uint256 => Term[]) Terms;
    mapping(uint256 => Funder[]) Funders;
    uint256[] activitiesForUpkeep;

    /**
     * @notice This Array gets resetted to default i.e [] after every alteration
     * @dev strictly use for storing arrays into structs.
     */
    address payable[] memberAddress;

    // Security modifiers
    /**
     * @dev to allow only Activity owners to execute the function
     */
    modifier onlyActivityOwners(uint256 _id) {
        require(
            msg.sender == Activities[_id].owner,
            "You are not allowed to perform this task!"
        );
        _;
    }

    /**
     * @dev Checks activity status and Member requirements
     */
    modifier isActivityJoinable(uint256 _id) {
        require(
            Activities[_id].status == ActivityStatus.OPEN &&
                Activities[_id].members.length <= Activities[_id].maxMembers,
            "Activity is not looking for members right now!"
        );
        _;
    }

    /**
     * @dev To allow functions to be executed only by Contract owner - Minerva
     */
    modifier onlyOwner() {
        require(msg.sender == i_owner);
        _;
    }

    /**
     * @dev To check existence of an activity
     */
    modifier doesActivityExist(uint256 _id) {
        require(Activities[_id].level > 0, "Activity Does not exist");
        _;
    }

    /**
     * @dev to check if the sender is a member of the activity
     */
    modifier isMemberOfActivity(uint256 _id) {
        bool isNotMember = true;
        for (uint256 i = 0; i < Activities[_id].members.length; i++) {
            if (Activities[_id].members[i] == payable(msg.sender)) {
                isNotMember = false;
            }
        }
        require(isNotMember, "You are already a member of this activity");
        _;
    }

    /**
     *
     * @dev to check if the sender is a registered user
     */
    modifier isRegisteredUser() {
        require(
            UserRegistration[msg.sender],
            "You are not a registered user, please register first!"
        );
        _;
    }

    //Events
    event UserRegistered(address _userAddress, uint256 _id, uint256 _timestamp);

    event ActivityCreated(
        address _owner,
        uint256 _id,
        string _title,
        uint256 _totalTimeInMonths,
        uint256 _level,
        uint256 dateOfCreation
    );
    event MemberJoined(
        uint256 _activityId,
        address _memberAddress,
        uint256 _dateOfJoin,
        uint256 _tenureInMonths
    );

    event TermAdded(Term[] terms);

    event DonationMade(
        address _sender,
        uint256 _activityID,
        uint256 _userPublicID,
        uint256 _donationAmount,
        uint256 _timeStamp,
        uint256 _totalDonationReceived
    );

    event MoneyWithdrawn(
        uint256 _activityID,
        uint256 _amount,
        uint256 _timeStamp
    );

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

    // Owner Functions
    /**
     * @notice Function to add funds to the contract
     * @dev Only the owner of the contract can execute this function
     */
    function addFundsToContract() public payable onlyOwner {
        s_ownerFunds += msg.value;
    }

    // Register User
    /**
     * @notice Function for registering a user
     * @dev emits Event - `UserRegistered`
     */

    function registerUser() public {
        require(!UserRegistration[msg.sender], "User already registered");
        s_userCounter++;
        UserIdToCredits[msg.sender] += 100;
        UserRegistration[msg.sender] = true;
        emit UserRegistered(msg.sender, s_userCounter, block.timestamp);
    }

    // Create Activity
    /**
     * @notice Function for creating an Activity
     * @dev emits Event - `ActivityCreated`
     */
    function createActivity(
        string memory _id,
        string memory _username,
        string memory _title,
        string memory _desc,
        uint256 _totalTimeInMonths,
        uint256 _price,
        uint256 _level,
        uint256 _maxMembers,
        uint256 _waitingPeriodInMonths
    ) public payable isRegisteredUser {
        require(_price <= maxJoiningPrice[_level - 1], "ETH limit crossed");
        require(
            UserIdToCredits[msg.sender] >= minCredForActivity[_level - 1],
            "Not Enough Credits for creating the activity!"
        );
        uint256 dateOfCreation = block.timestamp;
        s_activityCounter++;
        uint256 id = s_activityCounter;
        memberAddress.push(payable(msg.sender));
        uint256 _waitUntil = block.timestamp +
            (_waitingPeriodInMonths * 30 days);
        Activity memory activity = Activity(
            _id,
            payable(msg.sender),
            _title,
            _desc,
            _price,
            _level,
            ActivityStatus.OPEN,
            block.timestamp,
            _totalTimeInMonths,
            _maxMembers,
            memberAddress,
            _waitUntil,
            0,
            0
        );
        Members[msg.sender] = Member(
            _username,
            _totalTimeInMonths,
            dateOfCreation,
            id,
            block.timestamp
        );
        Activities[id] = activity;
        emit ActivityCreated(
            msg.sender,
            id,
            _title,
            _totalTimeInMonths,
            _level,
            dateOfCreation
        );
        delete memberAddress;
    }

    // Join Activity
    /**
     * @dev Modifiers used - `isActivityJoinable`, `doesActivityExist`, `isMemberOfActivity`. Events emitted - `MemberJoined`.
     * @notice Function for external users (in terms of Activity) to participate in the Activity.
     */
    function joinActivity(
        uint256 _activityID,
        string memory _username,
        uint256 _tenureInMonths
    )
        public
        payable
        doesActivityExist(_activityID)
        isActivityJoinable(_activityID)
        isMemberOfActivity(_activityID)
        isRegisteredUser
    {
        uint256 _dateOfJoin = block.timestamp;
        Activity storage activity = Activities[_activityID];
        require(
            (activity.joinPrice - 1) < getConversionRate(msg.value) &&
                getConversionRate(msg.value) <= (activity.joinPrice + 1),
            "Not enough ETH"
        );
        Members[msg.sender] = Member(
            _username,
            _tenureInMonths,
            _dateOfJoin,
            _activityID,
            block.timestamp
        );
        activity.members.push(payable(msg.sender));
        (bool sent, ) = activity.owner.call{value: msg.value}("");
        emit MemberJoined(
            _activityID,
            msg.sender,
            _dateOfJoin,
            _tenureInMonths
        );
        require(sent, "Failed to send ETH");
    }

    /**
     * @dev Modifiers - `onlyActivityOwners`, `doesActivityExist`, Events emitted - `TermAdded`
     * @notice Method to allow activity owners to add terms and conditions to their Activities
     */
    function addTermForActivity(
        uint256 _activityID,
        string[] memory _title,
        string[] memory _desc
    ) public doesActivityExist(_activityID) onlyActivityOwners(_activityID) {
        Term[] storage term = Terms[_activityID];
        term.push(Term(_title, _desc, _activityID));
        emit TermAdded(term);
    }

    // Tasks
    function retrieveTaxAmountForTask(
        uint256 _amount
    ) internal pure returns (uint256) {
        uint256 taxAmount = (_amount * 20) / 100;
        return taxAmount;
    }

    /**
     * @dev Modifiers - `onlyActivityOwners`, `doesActivityExist`, Events emitted - `TaskCreated`
     * @notice Method to allow activity owners to create tasks for their Activities
     */
    function createTask(
        uint256 _activityID,
        address _assignee,
        string memory _title,
        string memory _description,
        uint _rewardInD,
        uint _dueInDays,
        uint _creditScoreReward
    )
        public
        payable
        doesActivityExist(_activityID)
        onlyActivityOwners(_activityID)
    {
        require(
            UserRegistration[_assignee],
            "Assignee must be a registered user"
        );
        require(
            _creditScoreReward > 0,
            "Reward amount must be greater than zero"
        );
        Activity memory activity = Activities[_activityID];
        if (activity.level > 2) {
            require(msg.value > 0, "Reward money must be greater than zero");
        }
        if (activity.status == ActivityStatus.OPEN) {
            activity.status = ActivityStatus.IN_PROGRESS;
        }
        Task[] storage task = Tasks[_activityID];
        uint dueDate = block.timestamp + (_dueInDays * 1 days);
        task.push(
            Task(
                msg.sender,
                _assignee,
                _title,
                _description,
                _rewardInD,
                dueDate,
                _creditScoreReward,
                false,
                block.timestamp,
                msg.value
            )
        );
        emit TaskCreated(
            msg.sender,
            _assignee,
            _description,
            _rewardInD,
            dueDate,
            _creditScoreReward,
            block.timestamp
        );
    }

    /**
     * @notice - `completeTask` is the function called when the owner assures that the assigned task is completed.
     * @dev - `onlyActivityOwners`, `doesActivityExist`, Events emitted - `TaskCompleted`
     * @param _activityID -
     * @param _taskID -
     */
    function completeTask(
        uint256 _activityID,
        uint256 _taskID
    ) public onlyActivityOwners(_activityID) {
        Task[] storage task = Tasks[_activityID];
        Task storage taskToComplete = task[_taskID + 1];
        require(taskToComplete.completed == false, "Task already completed");
        if (block.timestamp > taskToComplete.dueDate) {
            checkTask(taskToComplete);
        }
        uint256 taxAmount = retrieveTaxAmountForTask(
            taskToComplete.rewardValue
        );
        uint256 amountToPay = taskToComplete.rewardValue - taxAmount;
        (bool taxPaid, ) = payable(i_owner).call{value: taxAmount}("");
        (bool sent, ) = payable(taskToComplete.assignee).call{
            value: amountToPay
        }("");
        taskToComplete.completed = true;
        require(sent && taxPaid, "Failed to send ETH");
        emit TaskCompleted(
            msg.sender,
            taskToComplete.assignee,
            _taskID,
            _activityID,
            block.timestamp,
            true,
            taskToComplete.rewardValue
        );
    }

    function checkTask(Task storage _task) internal {
        uint256 overdueDays = (block.timestamp - _task.dueDate) / 86400;
        uint256 amountToDeduct = (overdueDays * _task.rewardValue) / 30;
        uint256 creditScoreToDeduct = (overdueDays * _task.creditScoreReward) /
            30;
        _task.rewardValue -= amountToDeduct;
        _task.creditScoreReward -= creditScoreToDeduct;
    }

    // Donations
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
        uint256 _userPublicID
    ) public payable isRegisteredUser doesActivityExist(_activityID) {
        require(msg.value > 0, "Donation amount must be greater than 0");
        Activity storage activity = Activities[_activityID];
        uint256 actualAmount = retrieveDonatedAmount(msg.value);
        uint256 taxAmount = msg.value - actualAmount;
        activity.donationReceived += msg.value;
        activity.donationBalance += actualAmount;
        Funder[] storage funder = Funders[_activityID];
        funder.push(Funder(msg.sender, _userPublicID, msg.value));
        (bool sent, ) = payable(i_owner).call{value: taxAmount}("");
        UserIdToCredits[msg.sender] += (getConversionRate(actualAmount) * 10);
        require(sent, "Failed to send ETH");
        emit DonationMade(
            msg.sender,
            _activityID,
            _userPublicID,
            msg.value,
            block.timestamp,
            activity.donationReceived
        );
    }

    /**
     * @dev Modifiers - `doesActivityExist`, `onlyActivityOwners`. Events emitted - `MoneyWithdrawn`
     * @notice Function to allow Activity owners to withdraw all the money from their Activity
     */

    function withdrawAllMoney(
        uint256 _activityID
    )
        public
        payable
        doesActivityExist(_activityID)
        onlyActivityOwners(_activityID)
    {
        Activity storage activity = Activities[_activityID];
        require(activity.donationBalance > 0, "Insufficient funds");
        (bool sent, ) = payable(msg.sender).call{
            value: activity.donationBalance
        }("Money Withdrawn");
        activity.donationBalance -= activity.donationBalance;
        require(sent, "Failed to send ETH");
    }

    // /**
    //  * @dev Modifiers - `doesActivityExist`, `onlyActivityOwners`. Events emitted - `MoneyWithdrawn`
    //  * @notice Function to allow Activity owners to withdraw selective amount of money from their Activity
    //  */

    // function withdrawSelectiveMoney(
    //     uint256 _activityID,
    //     uint256 _amount
    // ) public doesActivityExist(_activityID) onlyActivityOwners(_activityID) {
    //     Activity storage activity = Activities[_activityID];
    //     require(activity.donationBalance >= _amount, "Insufficient funds");
    //     (bool sent, ) = payable(msg.sender).call{value: _amount}("");
    //     activity.donationBalance -= _amount;
    //     require(sent, "Failed to send ETH");
    // }

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

    function getPrice() internal view returns (uint256) {
        (, int256 answer, , , ) = s_priceFeed.latestRoundData();
        return uint256(answer * 10000000000);
    }

    function getConversionRate(
        uint256 ethAmount
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice();
        uint256 ethAmountInUsd = (ethPrice * ethAmount);
        return ethAmountInUsd / 1e36;
    }

    function getActivityCount() public view returns (uint256) {
        return s_activityCounter;
    }

    function getActivity(
        uint256 activityID
    ) public view returns (Activity memory) {
        Activity memory returnActivity = Activities[activityID];
        return (returnActivity);
    }

    function getOwner() public view onlyOwner returns (address) {
        return (i_owner);
    }

    function getMemberDetails(
        address _memberAddress
    ) public view returns (Member memory) {
        Member memory member = Members[_memberAddress];
        return (member);
    }

    function getTermsForActivity(
        uint256 _activityID
    ) public view returns (Term[] memory) {
        return Terms[_activityID];
    }

    function getUpkeepCounterValue() public view returns (uint256) {
        return (s_upkeepCounter);
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }

    function getActivityFunders(
        uint256 _activityID
    ) public view returns (Funder[] memory) {
        return Funders[_activityID];
    }

    function getUserCredits(
        address _userAddress
    ) public view returns (uint256, bool) {
        return (UserIdToCredits[_userAddress], UserRegistration[_userAddress]);
    }

    function getActivityTasks(
        uint256 _activityID
    ) public view returns (Task[] memory) {
        return Tasks[_activityID];
    }

    function getUserCount() public view returns (uint256) {
        return s_userCounter;
    }
}
