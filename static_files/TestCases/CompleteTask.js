const CompleteTaskTestCases = [
  {
    _activityID: 1,
    _taskID: 1,
  },
  {
    _activityID: 2,
    _taskID: 1,
    expectedError: "Activity Does not exist",
  },
  {
    _activityID: 1,
    _taskID: 1,
    expectedError: "You are not allowed to perform this task!",
  },
  {
    _activityID: 1,
    _taskID: 1,
    expectedError: "Task already completed",
  },
];

module.exports = CompleteTaskTestCases;
