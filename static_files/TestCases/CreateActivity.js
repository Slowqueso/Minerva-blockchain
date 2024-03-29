const CreateActivityTestCases = [
  {
    id: "63e7febbc7e3b1769c515467",
    username: "user1",
    title: "Activity 1",
    desc: "This is activity 1",
    totalTimeInMonths: 3,
    price: 4,
    level: 1,
    maxMembers: 5,
    waitingPeriodInMonths: 1,
    credits: 10,
    maxJoiningPrice: 2,
    expectedError: undefined,
  },
  {
    id: "63e7febbc7e3b1769c515467",
    username: "user2",
    title: "Activity 2",
    desc: "This is activity 2",
    totalTimeInMonths: 6,
    price: 5,
    level: 2,
    maxMembers: 10,
    waitingPeriodInMonths: 3,
    credits: 3,
    maxJoiningPrice: 4,
    expectedError: "Not Enough Credits for creating the activity!",
  },
  {
    id: "63e7febbc7e3b1769c515467",
    username: "user3",
    title: "Activity 3",
    desc: "This is activity 3",
    totalTimeInMonths: 12,
    price: 10,
    level: 1,
    maxMembers: 20,
    waitingPeriodInMonths: 6,
    credits: 20,
    maxJoiningPrice: 8,
    expectedError: "ETH limit crossed",
  },
];

module.exports = CreateActivityTestCases;
