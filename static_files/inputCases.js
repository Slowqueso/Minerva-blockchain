const { getNumericDate } = require("../utils/dateConverter");

const _joinActivity = {
  fail: [3, "Lynda", parseInt(getNumericDate()), 5],
  pass: [1, "Lynda", parseInt(getNumericDate()), 3],
};

module.exports = {
  _joinActivity,
};
