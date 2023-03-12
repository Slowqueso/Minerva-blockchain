const AddTermForActivityTestCases = [
  {
    _activityID: 1,
    _title: ["Term 1"],
    _desc: ["Description for term 1"],
  },
  {
    _activityID: 1,
    _title: ["Term 1", "Term 2"],
    _desc: ["Description for term 1", "Description for term 2"],
  },
  {
    _activityID: 1,
    _title: ["Term 1", "Term 2", "Term 3"],
    _desc: [
      "Description for term 1",
      "Description for term 2",
      "Description for term 3",
    ],
  },
  {
    _activityID: 4,
    _title: [],
    _desc: [],
    expectedError:
      "Title and description arrays must have at least one element",
  },
  {
    _activityID: 5,
    _title: ["Term 1", "Term 2"],
    _desc: ["Description for term 1"],
    expectedError: "Title and description arrays must have the same length",
  },
  {
    _activityID: 6,
    _title: ["Term 1"],
    _desc: ["Description for term 1", "Description for term 2"],
    expectedError: "Title and description arrays must have the same length",
  },
  {
    _activityID: 7,
    _title: ["Term 1"],
    _desc: ["Description for term 1"],
    expectedError: "Activity Does not exist",
  },
  {
    _activityID: 8,
    _title: ["Term 1"],
    _desc: ["Description for term 1"],
    expectedError: "Sender is not an owner of the activity",
  },
];

module.exports = AddTermForActivityTestCases;
