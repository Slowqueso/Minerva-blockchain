const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../hardhat-helper-config");
const {
  _joinActivity,
  _addTermForActivity,
} = require("../static_files/inputCases");
const { convertUsdToETH } = require("../utils/usdConverter");
const BigNumber = require("bignumber.js");
const ethPrice = require("eth-price");
const { getNumericDate } = require("../utils/dateConverter");

describe("ActivityContract", async () => {
  let ActivityContract;
  let deployer;
  let MockV3Aggregator;
  let ethPriceValue;
  beforeEach(async () => {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    ActivityContract = await ethers.getContract("ActivityContract", deployer);
    MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("Constructor", async () => {
    it("Sets ETH / USD address correctly \n", async () => {
      const response = await ActivityContract.getPriceFeed();
      assert.equal(response, MockV3Aggregator.address);
    });
  });

  describe("`createActivity` Test Cases", async () => {
    it("Revert Transaction if price is higher than level limit", async () => {
      try {
        const response = await ActivityContract.createActivity(
          "Slowqueso", // _username
          "Minerva", // _title
          "Minerva is a cryptocurrency application", // _desc
          5, // _totalTimeInMonths
          5, // _price
          1, // _level
          5, // _maxMembers
          290822, // dateOfCreation
          1 //_waitingPeriodInMonths
        );
        console.log(response);
      } catch (error) {
        // console.error(error);
        assert.isTrue(error.message.includes("ETH limit crossed"));
      }
    });

    it("Should Create an Activity Successully \n", async () => {
      try {
        const response = await ActivityContract.createActivity(
          "Slowqueso", // _username
          "Minerva", // _title
          "Minerva is a cryptocurrency application", // _desc
          5, // _totalTimeInMonths
          5, // _price
          3, // _level
          5, // _maxMembers
          290822, // dateOfCreation
          1 //_waitingPeriodInMonths
        );
        assert.equal(response.confirmations, 1);
      } catch (error) {
        console.error(error);
      }
    });
  });

  describe("`joinActivity` Test Cases", async () => {
    let owner, addr2, addr3;
    beforeEach(async () => {
      await ActivityContract.createActivity(
        "Slowqueso", // _username
        "Minerva", // _title
        "Minerva is a cryptocurrency application", // _desc
        5, // _totalTimeInMonths
        3, // _price
        1, // _level
        5, // _maxMembers
        290822, // dateOfCreation
        1 //_waitingPeriodInMonths
      );
      const [_owner, _addr2, _addr3] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
    });

    it("`doesActivityExist` reverts with 'Activity Does not Exist`", async () => {
      ethPriceValue = await ethPrice("usd");
      const ethValue = convertUsdToETH(3, ethPriceValue);
      const weiAmount = ethers.utils.parseEther(ethValue.toString());
      await expect(
        ActivityContract.joinActivity(
          _joinActivity.fail[0],
          _joinActivity.fail[1],
          _joinActivity.fail[2],
          _joinActivity.fail[3],
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("Activity Does not exist");
    });

    it("`joinActivity` reverts with 'You are already a member of this activity'", async () => {
      ethPriceValue = await ethPrice("usd");
      const ethValue = convertUsdToETH(3, ethPriceValue);
      const weiAmount = ethers.utils.parseEther(ethValue.toString());
      await expect(
        ActivityContract.joinActivity(
          _joinActivity.fail1[0],
          _joinActivity.fail1[1],
          _joinActivity.fail1[2],
          _joinActivity.fail1[3],
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("You are already a member of this activity");
    });

    it("`joinActivity` reverts with 'Send required ETH'", async () => {
      ethPriceValue = await ethPrice("usd");
      const ethValue = convertUsdToETH(4, ethPriceValue); // Sends higher value than 3 ETH
      const weiAmount = ethers.utils.parseEther(ethValue.toString());
      await expect(
        ActivityContract.connect(addr2).joinActivity(
          _joinActivity.fail2[0],
          _joinActivity.fail2[1],
          _joinActivity.fail2[2],
          _joinActivity.fail2[3],
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("Send required ETH");
    });

    it("`joinActivity` member is added in the activity", async () => {
      ethPriceValue = await ethPrice("usd");
      const ethValue = convertUsdToETH(3, ethPriceValue);
      const weiAmount = ethers.utils.parseEther(ethValue.toString());
      ActivityContract.connect(addr2).joinActivity(
        _joinActivity.fail2[0],
        _joinActivity.fail2[1],
        _joinActivity.fail2[2],
        _joinActivity.fail2[3],
        {
          value: weiAmount,
        }
      );
      const response = await ActivityContract.getMemberDetails(addr2.address);
    });
  });

  describe("\n`addTermForActivity` Test Cases", async () => {
    let owner, addr2, addr3;
    beforeEach(async () => {
      await ActivityContract.createActivity(
        "Slowqueso", // _username
        "Minerva", // _title
        "Minerva is a cryptocurrency application", // _desc
        5, // _totalTimeInMonths
        3, // _price
        1, // _level
        5, // _maxMembers
        290822, // dateOfCreation
        1 //_waitingPeriodInMonths
      );
      const [_owner, _addr2, _addr3] = await ethers.getSigners();
      owner = _owner;
      addr2 = _addr2;
      addr3 = _addr3;
    });

    it("`addTermForActivity` reverts with 'Activity Does not exist'", async () => {
      await expect(
        ActivityContract.addTermForActivity(
          _addTermForActivity.case_1[0],
          _addTermForActivity.case_1[1],
          _addTermForActivity.case_1[2]
        )
      ).to.be.revertedWith("Activity Does not exist");
    });

    it("`addTermForActivity` reverts with 'You are not allowed to perform this task!", async () => {
      await expect(
        ActivityContract.connect(addr2).addTermForActivity(
          _addTermForActivity.case_2[0],
          _addTermForActivity.case_2[1],
          _addTermForActivity.case_2[2]
        )
      ).to.be.revertedWith("You are not allowed to perform this task!");
    });

    it("`addTermForActivity` successfully adds a Term in the activity", async () => {
      await ActivityContract.addTermForActivity(
        _addTermForActivity.case_2[0],
        _addTermForActivity.case_2[1],
        _addTermForActivity.case_2[2]
      );
      const response = await ActivityContract.getTermsForActivity(1);
      assert.isTrue(response[0].includes(_addTermForActivity.case_2[1]));
    });
  });
});
