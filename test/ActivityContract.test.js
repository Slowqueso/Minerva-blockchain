const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../hardhat-helper-config");
const { convertUsdToETH } = require("../utils/usdConverter");
const ethPrice = require("eth-price");
const CreateActivityTestCases = require("../static_files/TestCases/CreateActivity.js");
const JoinActivityTestCases = require("../static_files/TestCases/JoinActivity.js");
const AddTermForActivityTestCases = require("../static_files/TestCases/AddTermForActivity.js");
const DonateToActivityTestCases = require("../static_files/TestCases/DonateToActivity.js");
const WithdrawAllMoneyTestCases = require("../static_files/TestCases/WithDrawAllMoney");
const CreateTaskTestCases = require("../static_files/TestCases/CreateTask.js");
const CompleteTaskTestCases = require("../static_files/TestCases/CompleteTask.js");

describe("ActivityContract", async () => {
  let ActivityContract;
  let deployer;
  let MockV3Aggregator;
  let ethPriceValue;

  const RegisterUser = async (addr) => {
    const response = await ActivityContract.connect(addr).registerUser();
    const userPublicId = await ActivityContract.getUserCount();
    return userPublicId;
  };

  const CreateActivity = async (addr) => {
    const response = await ActivityContract.connect(addr).createActivity(
      CreateActivityTestCases[0].id,
      CreateActivityTestCases[0].username,
      CreateActivityTestCases[0].title,
      CreateActivityTestCases[0].desc,
      CreateActivityTestCases[0].totalTimeInMonths,
      CreateActivityTestCases[0].price,
      CreateActivityTestCases[0].level,
      CreateActivityTestCases[0].maxMembers,
      CreateActivityTestCases[0].waitingPeriodInMonths
    );
    return await ActivityContract.getActivityCount();
  };

  const JoinActivity = async (addr, activityID) => {
    const { joinPrice } = await ActivityContract.getActivity(activityID);
    const weiAmount = await getWeiAmount(joinPrice);
    const response = await ActivityContract.connect(addr).joinActivity(
      activityID,
      JoinActivityTestCases[0].username,
      JoinActivityTestCases[0].tenureInMonths,
      {
        value: weiAmount,
      }
    );
    return response;
  };

  const DonateToActivity = async (addr, amount) => {
    const response = await ActivityContract.connect(addr).donateToActivity(
      DonateToActivityTestCases[0].input.activityID,
      DonateToActivityTestCases[0].input.public_ID,
      {
        value: amount,
      }
    );
    return response;
  };

  const CreateTask = async (addr1, addr2) => {
    const weiAmount = await getWeiAmount(CreateTaskTestCases[0]._rewardInD);
    const response = await ActivityContract.connect(
      addr1
    ).createTask(
      CreateTaskTestCases[0]._activityID,
      addr2.address,
      CreateTaskTestCases[0]._title,
      CreateTaskTestCases[0]._description,
      CreateTaskTestCases[0]._rewardInD,
      CreateTaskTestCases[0]._dueInDays,
      CreateTaskTestCases[0]._creditScoreReward,
      { value: weiAmount }
    );

    return response;
  };

  const getWeiAmount = async (usdValue) => {
    ethPriceValue = await ethPrice("usd");
    const ethValue = convertUsdToETH(usdValue, ethPriceValue);
    const weiAmount = ethers.utils.parseEther(ethValue.toString());
    return weiAmount;
  };

  beforeEach(async () => {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    ActivityContract = await ethers.getContract("ActivityContract", deployer);
    MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("`Constructor` Test", async () => {
    it("Sets ETH / USD address correctly \n", async () => {
      const response = await ActivityContract.getPriceFeed();
      assert.equal(response, MockV3Aggregator.address);
    });
  });

  describe("`registerUser` Test Cases", async () => {
    let owner, addr2, addr3;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
    });
    it("Should register a user successfully", async () => {
      const response = await RegisterUser(addr2);
      assert.isTrue((await ActivityContract.getUserCredits(addr2.address))[1]);
    });
    it("Should revert Transaction as user is already registered \n", async () => {
      try {
        const response = await RegisterUser(addr2);
        const response2 = await RegisterUser(addr2);
      } catch (error) {
        assert.isTrue(error.message.includes("User already registered"));
      }
    });
  });
  describe("`createActivity` Test Cases", async () => {
    let owner, addr2, addr3;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      const response = await RegisterUser(addr2);
    });
    it("Revert Transaction if price is higher than level limit", async () => {
      try {
        const response = await ActivityContract.connect(addr2).createActivity(
          CreateActivityTestCases[2].id,
          CreateActivityTestCases[2].username,
          CreateActivityTestCases[2].title,
          CreateActivityTestCases[2].desc,
          CreateActivityTestCases[2].totalTimeInMonths,
          CreateActivityTestCases[2].price,
          CreateActivityTestCases[2].level,
          CreateActivityTestCases[2].maxMembers,
          CreateActivityTestCases[2].waitingPeriodInMonths
        );
      } catch (error) {
        assert.isTrue(error.message.includes("ETH limit crossed"));
      }
    });

    it("Should revert Transaction as user is not registered", async () => {
      try {
        const response = await ActivityContract.connect(addr3).createActivity(
          CreateActivityTestCases[0].id,
          CreateActivityTestCases[0].username,
          CreateActivityTestCases[0].title,
          CreateActivityTestCases[0].desc,
          CreateActivityTestCases[0].totalTimeInMonths,
          CreateActivityTestCases[0].price,
          CreateActivityTestCases[0].level,
          CreateActivityTestCases[0].maxMembers,
          CreateActivityTestCases[0].waitingPeriodInMonths
        );
      } catch (error) {
        assert.isTrue(
          error.message.includes(
            "You are not a registered user, please register first!"
          )
        );
      }
    });
    it("Should revert Transaction as user does not have enough credits for level 2", async () => {
      try {
        const response = await ActivityContract.connect(addr2).createActivity(
          CreateActivityTestCases[1].id,
          CreateActivityTestCases[1].username,
          CreateActivityTestCases[1].title,
          CreateActivityTestCases[1].desc,
          CreateActivityTestCases[1].totalTimeInMonths,
          CreateActivityTestCases[1].price,
          CreateActivityTestCases[1].level,
          CreateActivityTestCases[1].maxMembers,
          CreateActivityTestCases[1].waitingPeriodInMonths
        );
      } catch (error) {
        assert.isTrue(
          error.message.includes(CreateActivityTestCases[1].expectedError)
        );
      }
    });
    it("Should create a new activity successfully \n", async () => {
      CreateActivity(addr2);
      assert.equal((await ActivityContract.getActivity(1)).level, 1);
    });
  });

  describe("`joinActivity` Test Cases", async () => {
    let owner, addr2, addr3, addr4, activityID;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      activityID = await CreateActivity(addr2);
    });

    it("`joinActivity` reverts with 'Activity Does not exist'", async () => {
      const { joinPrice } = await ActivityContract.getActivity(activityID);
      const weiAmount = await getWeiAmount(joinPrice);
      await expect(
        ActivityContract.connect(addr3).joinActivity(
          activityID + 1,
          JoinActivityTestCases[1].username,
          JoinActivityTestCases[1].tenureInMonths,
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("Activity Does not exist");
    });

    it(`"joinActivity" reverts with 'You are already a member of this activity'`, async () => {
      const { joinPrice } = await ActivityContract.getActivity(activityID);
      const weiAmount = await getWeiAmount(joinPrice);
      await expect(
        ActivityContract.connect(addr2).joinActivity(
          activityID,
          JoinActivityTestCases[0].username,
          JoinActivityTestCases[0].tenureInMonths,
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("You are already a member of this activity");
    });

    it("`joinActivity` reverts with 'Not enough ETH'", async () => {
      const { joinPrice } = await ActivityContract.getActivity(activityID);
      const weiAmount = await getWeiAmount(joinPrice - 2);
      await expect(
        ActivityContract.connect(addr3).joinActivity(
          activityID,
          JoinActivityTestCases[1].username,
          JoinActivityTestCases[1].tenureInMonths,
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("Not enough ETH");
    });

    it("`joinActivity` allows user to join Activity successfully \n", async () => {
      await JoinActivity(addr3, activityID);
      assert.isTrue(
        (await ActivityContract.getActivity(activityID)).members.includes(
          addr3.address
        )
      );
    });
  });

  describe("`addTermForActivity` Test Cases", async () => {
    let owner, addr2, addr3;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      await CreateActivity(addr2);
    });

    it("`addTermForActivity` reverts with 'Activity Does not exist'", async () => {
      await expect(
        ActivityContract.connect(addr2).addTermForActivity(
          AddTermForActivityTestCases[6]._activityID,
          AddTermForActivityTestCases[6]._title,
          AddTermForActivityTestCases[6]._desc
        )
      ).to.be.revertedWith(AddTermForActivityTestCases[6].expectedError);
    });

    it("`addTermForActivity` reverts with 'You are not the owner of this activity'", async () => {
      await expect(
        ActivityContract.connect(addr3).addTermForActivity(
          AddTermForActivityTestCases[0]._activityID,
          AddTermForActivityTestCases[0]._title,
          AddTermForActivityTestCases[0]._desc
        )
      ).to.be.revertedWith("You are not allowed to perform this task!");
    });

    it("`addTermForActivity` adds terms to the activity successfully \n", async () => {
      await ActivityContract.connect(addr2).addTermForActivity(
        AddTermForActivityTestCases[0]._activityID,
        AddTermForActivityTestCases[0]._title,
        AddTermForActivityTestCases[0]._desc
      );
      assert.equal(
        (
          await ActivityContract.getTermsForActivity(
            AddTermForActivityTestCases[0]._activityID
          )
        )[0].title[0],
        AddTermForActivityTestCases[0]._title[0]
      );
    });
  });

  describe("`donateToActivity` Test Cases", async () => {
    let owner, addr2, addr3, addr4;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      const activityID = await CreateActivity(addr2);
      await JoinActivity(addr3, activityID);
    });

    it("`donateToActivity` reverts with 'Activity Does not exist'", async () => {
      const weiAmount = await getWeiAmount(
        DonateToActivityTestCases[1].input.donationAmount
      );
      await expect(
        ActivityContract.connect(
          addr3
        ).donateToActivity(
          DonateToActivityTestCases[1].input.activityID,
          DonateToActivityTestCases[1].input.public_ID,
          { value: weiAmount }
        )
      ).to.be.revertedWith(DonateToActivityTestCases[1].expectedError);
    });

    it("`donateToActivity` reverts with 'Donation amount must be greater than 0'", async () => {
      const weiAmount = await getWeiAmount(0);
      await expect(
        ActivityContract.connect(addr3).donateToActivity(
          DonateToActivityTestCases[2].input.activityID,
          DonateToActivityTestCases[2].input.public_ID,
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith(DonateToActivityTestCases[2].expectedError);
    });

    it("`donateToActivity` donates the amount successfully to the Activity\n", async () => {
      const weiAmount = await getWeiAmount(
        DonateToActivityTestCases[0].input.donationAmount
      );
      const assertedAmount = await getWeiAmount(
        DonateToActivityTestCases[0].input.donationAmount -
          DonateToActivityTestCases[0].input.donationAmount * 0.25
      );
      const response = await DonateToActivity(addr3, weiAmount);

      assert.equal(
        Math.floor(
          (
            await ActivityContract.getActivity(
              DonateToActivityTestCases[0].input.activityID
            )
          ).donationBalance / 1e16
        ),
        Math.floor(assertedAmount / 1e16)
      );
    });
  });

  describe("`withdrawAllMoney` Test Cases", async () => {
    let owner, addr2, addr3, addr4;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      const activityID = await CreateActivity(addr2);
      await JoinActivity(addr3, activityID);
      await DonateToActivity(addr3, await getWeiAmount(100));
    });
    it("`withdrawAllMoney` reverts with 'Activity Does not exist'", async () => {
      await expect(
        ActivityContract.connect(addr2).withdrawAllMoney(
          WithdrawAllMoneyTestCases[1].activityID
        )
      ).to.be.revertedWith(WithdrawAllMoneyTestCases[1].expectedError);
    });

    it("`withdrawAllMoney` reverts with 'You are not allowed to perform this task!'", async () => {
      await expect(
        ActivityContract.connect(addr3).withdrawAllMoney(
          WithdrawAllMoneyTestCases[2].activityID
        )
      ).to.be.revertedWith(WithdrawAllMoneyTestCases[2].expectedError);
    });

    it("`withdrawAllMoney` withdraws all the money successfully\n", async () => {
      const response = await ActivityContract.connect(addr2).withdrawAllMoney(
        WithdrawAllMoneyTestCases[0].activityID
      );
      const activity = await ActivityContract.getActivity(
        WithdrawAllMoneyTestCases[0].activityID
      );
      assert.equal(activity.donationBalance, 0);
    });
  });

  describe("`createTask` Test Cases", async () => {
    let owner, addr2, addr3, addr4;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      const activityID = await CreateActivity(addr2);
      await JoinActivity(addr3, activityID);
    });

    it("`createTask` reverts with 'Activity Does not exist'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[2]._rewardInD);
      await expect(
        ActivityContract.connect(addr2).createTask(
          CreateTaskTestCases[2]._activityID,
          addr3.address,
          CreateTaskTestCases[2]._title,
          CreateTaskTestCases[2]._description,
          CreateTaskTestCases[2]._rewardInD,
          CreateTaskTestCases[2]._dueInDays,
          CreateTaskTestCases[2]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith(CreateTaskTestCases[2].expectedError);
    });
    it("`createTask` reverts with 'You are not allowed to perform this task!'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[3]._rewardInD);
      await expect(
        ActivityContract.connect(addr4).createTask(
          CreateTaskTestCases[3]._activityID,
          addr3.address,
          CreateTaskTestCases[3]._title,
          CreateTaskTestCases[3]._description,
          CreateTaskTestCases[3]._rewardInD,
          CreateTaskTestCases[3]._dueInDays,
          CreateTaskTestCases[3]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith(CreateTaskTestCases[3].expectedError);
    });

    it("`createTask` reverts with 'Assignee must be a member of the Activity'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[3]._rewardInD);
      await expect(
        ActivityContract.connect(addr2).createTask(
          CreateTaskTestCases[4]._activityID,
          addr4.address,
          CreateTaskTestCases[4]._title,
          CreateTaskTestCases[4]._description,
          CreateTaskTestCases[4]._rewardInD,
          CreateTaskTestCases[4]._dueInDays,
          CreateTaskTestCases[4]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith(CreateTaskTestCases[4].expectedError);
    });

    it("`createTask` creates a Task successfully\n", async () => {
      await CreateTask(addr2, addr3);
      const task = await ActivityContract.getActivityTasks(
        CreateTaskTestCases[0]._activityID
      );
      assert.equal(task[0].title, CreateTaskTestCases[0]._title);
    });
  });

  describe("`completeTask` Test Cases", async () => {
    let owner, addr2, addr3, addr4;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      const activityID = await CreateActivity(addr2);
      await JoinActivity(addr3, activityID);
      await CreateTask(addr2, addr3);
    });

    it("`completeTask` reverts with 'Activity Does not exist'", async () => {
      await expect(
        ActivityContract.connect(addr3).completeTask(
          CompleteTaskTestCases[1]._activityID,
          CompleteTaskTestCases[1]._taskID
        )
      ).to.be.revertedWith(CompleteTaskTestCases[1].expectedError);
    });

    it("`completeTask` reverts with 'You are not allowed to perform this task!'", async () => {
      await expect(
        ActivityContract.connect(addr4).completeTask(
          CompleteTaskTestCases[2]._activityID,
          CompleteTaskTestCases[2]._taskID
        )
      ).to.be.revertedWith(CompleteTaskTestCases[2].expectedError);
    });

    it("`completeTask` reverts with 'Task already completed'", async () => {
      await ActivityContract.connect(addr2).completeTask(
        CompleteTaskTestCases[3]._activityID,
        CompleteTaskTestCases[3]._taskID
      );
      await expect(
        ActivityContract.connect(addr2).completeTask(
          CompleteTaskTestCases[3]._activityID,
          CompleteTaskTestCases[3]._taskID
        )
      ).to.be.revertedWith(CompleteTaskTestCases[3].expectedError);
    });

    it("`completeTask` completes the Task successfully\n", async () => {
      await ActivityContract.connect(addr2).completeTask(
        CompleteTaskTestCases[0]._activityID,
        CompleteTaskTestCases[0]._taskID
      );
      const task = await ActivityContract.getActivityTasks(
        CompleteTaskTestCases[0]._activityID
      );
      assert.equal(task[0].completed, true);
    });
  });
});
