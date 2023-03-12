export default RetrieveTaxAmountForTaskTestCases = [
  {
    input: 1000,
    expectedOutput: 200,
  },
  {
    input: 500,
    expectedOutput: 100,
  },
  {
    input: 750.5,
    expectedOutput: 150.1,
  },
  {
    input: 0,
    expectedOutput: 0,
  },
];
