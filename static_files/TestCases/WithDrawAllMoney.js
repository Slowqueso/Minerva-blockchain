const WithdrawAllMoneyTestCases = [
  {
    activityID: 1,
  },
  {
    activityID: 2,
    expectedError: "Activity Does not exist",
  },
  {
    activityID: 1,
    expectedError: "You are not allowed to perform this task!",
  },
];

module.exports = WithdrawAllMoneyTestCases;
