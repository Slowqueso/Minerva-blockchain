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

describe("Minerva Smart Contract", async () => {
  let MinervaContract;
  let deployer;
  let MockV3Aggregator;
  let ethPriceValue;

  const RegisterUser = async (addr) => {
    const response = await MinervaContract.connect(addr).registerUser();
    const userPublicId = await MinervaContract.getUserCount();
    return userPublicId;
  };

  const CreateActivity = async (addr) => {
    const response = await MinervaContract.connect(addr).createActivity(
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
    return await MinervaContract.getActivityCount();
  };

  const AddToWhiteList = async (owner, addr, activityID) => {
    try {
      const response = await MinervaContract.connect(owner).addToWhitelist(
        activityID,
        addr.address
      );
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const JoinActivity = async (addr, activityID) => {
    const { joinPrice } = await MinervaContract.getActivity(activityID);
    const weiAmount = await getWeiAmount(joinPrice);
    const response = await MinervaContract.connect(addr).joinActivity(
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
    const response = await MinervaContract.connect(addr).donateToActivity(
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
    const response = await MinervaContract.connect(
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
    MinervaContract = await ethers.getContract("Minerva", deployer);
    MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
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
      assert.isTrue(await MinervaContract.isUserRegistered(addr2.address));
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
        const response = await MinervaContract.connect(addr2).createActivity(
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
        const response = await MinervaContract.connect(addr3).createActivity(
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
        assert.isTrue(error.message.includes("User is not registered"));
      }
    });
    it("Should revert Transaction as user does not have enough credits for level 2", async () => {
      try {
        const response = await MinervaContract.connect(addr2).createActivity(
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
      assert.equal((await MinervaContract.getActivity(1)).level, 1);
    });
  });

  describe("`addToWhitelist` Test Cases", async () => {
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

    it("Should revert Transaction as user is not the owner of the activity", async () => {
      try {
        const response = await MinervaContract.connect(addr3).addToWhitelist(
          activityID,
          addr3.address
        );
      } catch (error) {
        assert.isTrue(
          error.message.includes("User is not the owner of the activity")
        );
      }
    });

    it("Should add user to whitelist successfully \n", async () => {
      try {
        assert.isTrue(await AddToWhiteList(addr2, addr3, activityID));
      } catch (error) {
        console.log(error);
      }
    });
  });

  describe("`doesAddressHavePermission` test cases", () => {
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
      await AddToWhiteList(addr2, addr3, activityID);
    });

    it("Should return true if user has permission \n", async () => {
      assert.isTrue(await MinervaContract.doesAddressHavePermission());
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
      await AddToWhiteList(addr2, addr3, activityID);
    });

    it(`"joinActivity" reverts with 'You are already a member of this activity'`, async () => {
      const { joinPrice } = await MinervaContract.getActivity(activityID);
      const weiAmount = await getWeiAmount(joinPrice);
      await expect(
        MinervaContract.connect(addr2).joinActivity(
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
      const { joinPrice } = await MinervaContract.getActivity(activityID);
      const weiAmount = await getWeiAmount(joinPrice - 2);
      await expect(
        MinervaContract.connect(addr3).joinActivity(
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
        (await MinervaContract.getActivity(activityID)).members.includes(
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
        MinervaContract.connect(addr2).addTermForActivity(
          AddTermForActivityTestCases[6]._activityID,
          AddTermForActivityTestCases[6]._title,
          AddTermForActivityTestCases[6]._desc
        )
      ).to.be.revertedWith("Activity_NotFound()");
    });

    it("`addTermForActivity` reverts with 'You are not the owner of this activity'", async () => {
      await expect(
        MinervaContract.connect(addr3).addTermForActivity(
          AddTermForActivityTestCases[0]._activityID,
          AddTermForActivityTestCases[0]._title,
          AddTermForActivityTestCases[0]._desc
        )
      ).to.be.revertedWith("User is not the owner of the activity");
    });

    it("`addTermForActivity` adds terms to the activity successfully \n", async () => {
      await MinervaContract.connect(addr2).addTermForActivity(
        AddTermForActivityTestCases[0]._activityID,
        AddTermForActivityTestCases[0]._title,
        AddTermForActivityTestCases[0]._desc
      );
      assert.equal(
        (
          await MinervaContract.getTermsForActivity(
            AddTermForActivityTestCases[0]._activityID
          )
        ).title[0],
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
      await AddToWhiteList(addr2, addr3, activityID);
      await JoinActivity(addr3, activityID);
    });

    it("`donateToActivity` reverts with 'Activity Does not exist'", async () => {
      const weiAmount = await getWeiAmount(
        DonateToActivityTestCases[1].input.donationAmount
      );
      await expect(
        MinervaContract.connect(
          addr3
        ).donateToActivity(
          DonateToActivityTestCases[1].input.activityID,
          DonateToActivityTestCases[1].input.public_ID,
          { value: weiAmount }
        )
      ).to.be.revertedWith("Activity_NotFound()");
    });

    it("`donateToActivity` reverts with 'Donation amount must be greater than 0'", async () => {
      const weiAmount = await getWeiAmount(0);
      await expect(
        MinervaContract.connect(addr3).donateToActivity(
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
            await MinervaContract.getActivity(
              DonateToActivityTestCases[0].input.activityID
            )
          ).donationBalance / 1e16
        ),
        Math.floor(assertedAmount / 1e16)
      );
    });
  });

  describe("`withdrawAllMoney` Test Cases", async () => {
    let owner, addr2, addr3, addr4, weiAmount;
    beforeEach(async () => {
      const [_owner, _addr2, _addr3, _addr4] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
      addr4 = _addr4;
      await RegisterUser(addr2);
      await RegisterUser(addr3);
      const activityID = await CreateActivity(addr2);
      await DonateToActivity(addr3, await getWeiAmount(100));
      weiAmount = await getWeiAmount(
        DonateToActivityTestCases[0].input.donationAmount
      );
    });
    it("`withdrawSelectiveMoney` reverts with 'Activity Does not exist'", async () => {
      await expect(
        MinervaContract.connect(addr2).withdrawSelectiveMoney(
          WithdrawAllMoneyTestCases[1].activityID,
          weiAmount
        )
      ).to.be.revertedWith("Activity_NotFound()");
    });

    it("`withdrawSelectiveMoney` reverts with 'You are not allowed to perform this task!'", async () => {
      await expect(
        MinervaContract.connect(addr3).withdrawSelectiveMoney(
          WithdrawAllMoneyTestCases[2].activityID,
          weiAmount
        )
      ).to.be.revertedWith("You are not the owner");
    });

    it("`withdrawSelectiveMoney` withdraws all the money successfully\n", async () => {
      const {
        donationBalance: initialBalance,
      } = await MinervaContract.getActivity(
        WithdrawAllMoneyTestCases[0].activityID
      );
      const withdrawalAmount = await getWeiAmount(70);
      const response = await MinervaContract.connect(
        addr2
      ).withdrawSelectiveMoney(
        WithdrawAllMoneyTestCases[0].activityID,
        withdrawalAmount
      );
      const activity = await MinervaContract.getActivity(
        WithdrawAllMoneyTestCases[0].activityID
      );
    });
  });

  describe("`withdrawSelectiveMoney` Test Cases", async () => {
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
      await DonateToActivity(addr3, await getWeiAmount(100));
    });
    it("`withdrawAllMoney` reverts with 'Activity Does not exist'", async () => {
      await expect(
        MinervaContract.connect(addr2).withdrawAllMoney(
          WithdrawAllMoneyTestCases[1].activityID
        )
      ).to.be.revertedWith("Activity_NotFound()");
    });

    it("`withdrawAllMoney` reverts with 'You are not allowed to perform this task!'", async () => {
      await expect(
        MinervaContract.connect(addr3).withdrawAllMoney(
          WithdrawAllMoneyTestCases[2].activityID
        )
      ).to.be.revertedWith("You are not the owner");
    });

    it("`withdrawAllMoney` withdraws all the money successfully\n", async () => {
      const response = await MinervaContract.connect(addr2).withdrawAllMoney(
        WithdrawAllMoneyTestCases[0].activityID
      );
      const activity = await MinervaContract.getActivity(
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
      await AddToWhiteList(addr2, addr3, activityID);
      await JoinActivity(addr3, activityID);
    });

    it("`createTask` reverts with 'Activity Does not exist'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[2]._rewardInD);
      await expect(
        MinervaContract.connect(addr2).createTask(
          CreateTaskTestCases[2]._activityID,
          addr3.address,
          CreateTaskTestCases[2]._title,
          CreateTaskTestCases[2]._description,
          CreateTaskTestCases[2]._rewardInD,
          CreateTaskTestCases[2]._dueInDays,
          CreateTaskTestCases[2]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith("Task__ActivityDoesNotExist()");
    });
    it("`createTask` reverts with 'You are not allowed to perform this task!'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[3]._rewardInD);
      await expect(
        MinervaContract.connect(addr4).createTask(
          CreateTaskTestCases[3]._activityID,
          addr3.address,
          CreateTaskTestCases[3]._title,
          CreateTaskTestCases[3]._description,
          CreateTaskTestCases[3]._rewardInD,
          CreateTaskTestCases[3]._dueInDays,
          CreateTaskTestCases[3]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith("Only Activity Owners can create tasks");
    });

    it("`createTask` reverts with 'Assignee must be a member of the Activity'", async () => {
      const weiAmount = await getWeiAmount(CreateTaskTestCases[3]._rewardInD);
      await expect(
        MinervaContract.connect(addr2).createTask(
          CreateTaskTestCases[4]._activityID,
          addr4.address,
          CreateTaskTestCases[4]._title,
          CreateTaskTestCases[4]._description,
          CreateTaskTestCases[4]._rewardInD,
          CreateTaskTestCases[4]._dueInDays,
          CreateTaskTestCases[4]._creditScoreReward,
          { value: weiAmount }
        )
      ).to.be.revertedWith("Task__AssigneeNotMember()");
    });

    it("`createTask` creates a Task successfully\n", async () => {
      await CreateTask(addr2, addr3);
      const task = await MinervaContract.getActivityTasks(
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
      await AddToWhiteList(addr2, addr3, activityID);
      await JoinActivity(addr3, activityID);
      await CreateTask(addr2, addr3);
    });

    it("`completeTask` reverts with 'Activity Does not exist'", async () => {
      await expect(
        MinervaContract.connect(addr3).completeTask(
          CompleteTaskTestCases[1]._activityID,
          CompleteTaskTestCases[1]._taskID
        )
      ).to.be.revertedWith("Task__ActivityDoesNotExist()");
    });

    it("`completeTask` reverts with 'You are not allowed to perform this task!'", async () => {
      await expect(
        MinervaContract.connect(addr4).completeTask(
          CompleteTaskTestCases[2]._activityID,
          CompleteTaskTestCases[2]._taskID
        )
      ).to.be.revertedWith("Only Activity Owners can create tasks");
    });

    it("`completeTask` reverts with 'Task already completed'", async () => {
      await MinervaContract.connect(addr2).completeTask(
        CompleteTaskTestCases[3]._activityID,
        CompleteTaskTestCases[3]._taskID
      );
      await expect(
        MinervaContract.connect(addr2).completeTask(
          CompleteTaskTestCases[3]._activityID,
          CompleteTaskTestCases[3]._taskID
        )
      ).to.be.revertedWith(CompleteTaskTestCases[3].expectedError);
    });

    it("`completeTask` completes the Task successfully\n", async () => {
      await MinervaContract.connect(addr2).completeTask(
        CompleteTaskTestCases[0]._activityID,
        CompleteTaskTestCases[0]._taskID
      );
      const task = await MinervaContract.getActivityTasks(
        CompleteTaskTestCases[0]._activityID
      );
      assert.equal(task[0].completed, true);
    });
  });
});
