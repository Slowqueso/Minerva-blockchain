const { assert, expect } = require("chai");
const { network, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../hardhat-helper-config");

describe("ActivityContract", async () => {
  let ActivityContract;
  let deployer;
  let MockV3Aggregator;
  beforeEach(async () => {
    deployer = (await getNamedAccounts()).deployer;
    await deployments.fixture(["all"]);
    ActivityContract = await ethers.getContract("ActivityContract", deployer);
    MockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("Constructor", async () => {
    it("Sets ETH / USD address correctly", async () => {
      const response = await ActivityContract.getPriceFeed();
      assert.equal(response, MockV3Aggregator.address);
    });
  });
});
