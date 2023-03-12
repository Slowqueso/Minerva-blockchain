const JoinActivityTestCases = [
  {
    activityID: 1,
    username: "user1",
    tenureInMonths: 1,
    joinPrice: 1,
    userCredits: 2,
    userETH: 1,
    expectedError: "Not enough ETH",
  },
  {
    activityID: 2,
    username: "user2",
    tenureInMonths: 3,
    joinPrice: 5,
    userCredits: 5,
    userETH: 6,
    expectedError: "Activity Does not exist",
  },
];

module.exports = JoinActivityTestCases;
