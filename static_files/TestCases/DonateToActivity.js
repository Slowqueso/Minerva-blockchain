const DonateToActivityTestCases = [
  {
    input: {
      activityID: 1,
      donationAmount: 100,
      public_ID: 2,
    },
  },
  {
    input: {
      activityID: 2,
      donationAmount: 100,
      public_ID: 2,
    },
    expectedError: "Activity Does not exist",
  },
  {
    input: {
      activityID: 1,
      donationAmount: 0,
      public_ID: 2,
    },
    expectedError: "Donation amount must be greater than 0",
  },
];

module.exports = DonateToActivityTestCases;
