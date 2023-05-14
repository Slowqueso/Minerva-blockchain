// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "../Registration/Registration.sol";
import "../PriceConvertor/PriceConvertor.sol";
import "../Activity/ActivityContract.sol";

// 3. Interfaces, Libraries, Contracts
error Task_NotOwner();
error Task__ActivityDoesNotExist();
error Task__AssigneeNotMember();

interface TaskInterface {
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

    function createTask(
        uint256 _activityID,
        address _assignee,
        string calldata _title,
        string calldata _description,
        uint _rewardInD,
        uint _dueInDays,
        uint _creditScoreReward,
        address userAddress
    ) external payable;

    function completeTask(
        uint256 _activityID,
        uint256 _taskID,
        address userAddress
    ) external;

    function getActivityTasks(
        uint256 _activityID
    ) external view returns (Task[] calldata);
}

/**
 * @title Minerva Task Contract
 * @author Slowqueso/Lynda Barn/Kartik Ranjan
 * @notice This contract allows Activity owners to create and assign tasks for Activity Members.
 * @dev Data Price Feeds are implemented for ETH / USD
 */
contract MinervaTaskContract {
    UserRegistrationContract private i_UserRegistrationContract;
    MinervaActivityContract private i_ActivityContract;
    address private immutable i_owner;
    uint256 private taxPercentage;

    constructor(
        address _UserRegistrationContractAddress,
        address _ActivityContractAddress
    ) {
        i_UserRegistrationContract = UserRegistrationContract(
            _UserRegistrationContractAddress
        );
        i_ActivityContract = MinervaActivityContract(_ActivityContractAddress);
        i_owner = msg.sender;
        AddressesPermittedToAccess[msg.sender] = true;
    }

    // ------------ Structs ------------
    /**
     * @notice struct for `Tasks`
     */
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

    // ------------ Arrays and Mappings ------------
    mapping(uint256 => Task[]) Tasks;
    mapping(address => bool) public AddressesPermittedToAccess;

    // ------------ Modifiers ------------
    modifier onlyOwner() {
        if (msg.sender != i_owner) revert Task_NotOwner();
        _;
    }

    modifier onlyActivityOwners(uint256 _activityID, address sender) {
        require(
            i_ActivityContract.isActivityOwner(_activityID, sender),
            "Only Activity Owners can create tasks"
        );
        _;
    }

    modifier doesActivityExist(uint256 _activityID) {
        if (!i_ActivityContract.doesActivityExist(_activityID))
            revert Task__ActivityDoesNotExist();
        _;
    }

    modifier onlyPermitted() {
        require(
            AddressesPermittedToAccess[msg.sender],
            "Only permitted addresses can call this function"
        );
        _;
    }

    // Owner Functions
    function setTaxPercentage(uint256 _percent) public onlyOwner {
        taxPercentage = _percent;
    }

    function addPermittedAddress(address permittedAddress) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = true;
    }

    function removePermittedAddress(
        address permittedAddress
    ) external onlyOwner {
        AddressesPermittedToAccess[permittedAddress] = false;
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
        uint _creditScoreReward,
        address userAddress
    )
        external
        payable
        doesActivityExist(_activityID)
        onlyActivityOwners(_activityID, userAddress)
        onlyPermitted
    {
        if (
            i_ActivityContract.getMemberDetails(_assignee).forActivity !=
            _activityID
        ) revert Task__AssigneeNotMember();

        require(
            _creditScoreReward > 0,
            "Reward amount must be greater than zero"
        );

        if (i_ActivityContract.getActivityLevel(_activityID) > 2) {
            require(msg.value > 0, "Reward money must be greater than zero");
        }

        uint dueDate = block.timestamp + (_dueInDays * 1 days);
        Tasks[_activityID].push(
            Task(
                userAddress,
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
    }

    /**
     * @notice - `completeTask` is the function called when the owner assures that the assigned task is completed.
     * @dev - `onlyActivityOwners`, `doesActivityExist`, Events emitted - `TaskCompleted`
     * @param _activityID - Activity ID for the task
     * @param _taskID - Task ID for the
     */
    function completeTask(
        uint256 _activityID,
        uint256 _taskID,
        address userAddress
    )
        public
        doesActivityExist(_activityID)
        onlyActivityOwners(_activityID, userAddress)
        onlyPermitted
    {
        Task[] storage task = Tasks[_activityID];
        Task storage taskToComplete = task[_taskID - 1];
        require(taskToComplete.completed == false, "Task already completed");
        if (block.timestamp > taskToComplete.dueDate) {
            checkTask(taskToComplete);
        }
        i_UserRegistrationContract.addUserCredits(
            taskToComplete.assignee,
            taskToComplete.creditScoreReward
        );
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
    }

    function checkTask(Task storage _task) internal {
        uint256 overdueDays = (block.timestamp - _task.dueDate) / 86400;
        uint256 amountToDeduct = (overdueDays * _task.rewardValue) / 30;
        uint256 creditScoreToDeduct = (overdueDays * _task.creditScoreReward) /
            30;
        _task.rewardValue -= amountToDeduct;
        _task.creditScoreReward -= creditScoreToDeduct;
    }

    function getActivityTasks(
        uint256 _activityID
    ) public view returns (Task[] memory) {
        return Tasks[_activityID];
    }
}
