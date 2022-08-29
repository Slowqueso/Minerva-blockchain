const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../hardhat-helper-config");
const { _joinActivity } = require("../static_files/inputCases");
const { convertUsdToETH } = require("../utils/usdConverter");
const BigNumber = require("bignumber.js");
const ethPrice = require("eth-price");

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

  describe("`createActivity` Test Cases \n", async () => {
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

    it("Should Create an Activity Successully", async () => {
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

  describe("Testing Wei Amount", () => {
    it("should return the right wei value", () => {
      const weiAmount = ethers.utils.parseEther("1.0");
      console.log(weiAmount);
    });
  });

  describe("`joinActivity` Test Cases", async () => {
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
    it("`doesActivityExist` creates activity`", async () => {
      ethPriceValue = await ethPrice("usd");
      const ethValue = convertUsdToETH(3, ethPriceValue);
      const weiAmount = ethers.utils.parseEther(ethValue.toString());
      await expect(
        ActivityContract.joinActivity(
          _joinActivity.pass[0],
          _joinActivity.pass[1],
          _joinActivity.pass[2],
          _joinActivity.pass[3],
          {
            value: weiAmount,
          }
        )
      ).to.be.revertedWith("Activity Does not exist");
    });
  });
});
