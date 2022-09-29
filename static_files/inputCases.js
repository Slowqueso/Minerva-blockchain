const { getNumericDate } = require("../utils/dateConverter");

const _joinActivity = {
  fail: [3, "Lynda", parseInt(getNumericDate()), 5],
  fail1: [1, "Slowqueso", parseInt(getNumericDate()), 5],
  fail2: [1, "Lynda", parseInt(getNumericDate()), 5],
};

const _addTermForActivity = {
  case_1: [
    3,
    ["Privacy"],
    [
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
    ],
  ],
  case_2: [
    1,
    ["Privacy", "Privacy", "Privacy", "Privacy", "Privacy"],
    [
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
      "Lorem ipsum dolor sit amet consectetur adipisicing elit. Natus qui quasi blanditiis libero odio fugit facilis aspernatur nemo! Rerum corrupti molestiae omnis illo debitis. Reprehenderit reiciendis eius eaque blanditiis autem.",
    ],
  ],
};

module.exports = {
  _joinActivity,
  _addTermForActivity,
};
