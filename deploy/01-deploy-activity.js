const { getNamedAccounts, deployments, network } = require("hardhat");
const {
  networkConfig,
  developmentChains,
} = require("../hardhat-helper-config");
const { verify } = require("../utils/verify");

module.exports = async function({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  let ethPriceFeedAddress;
  if (developmentChains.includes(network.name)) {
    const ethUSDAggregator = await deployments.get("MockV3Aggregator");
    ethPriceFeedAddress = ethUSDAggregator.address;
  } else {
    ethPriceFeedAddress = networkConfig[chainId].priceFeedAddress;
  }

  log("-----------------------------------------");
  const activityContract = await deploy("ActivityContract", {
    from: deployer,
    args: [ethPriceFeedAddress],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`ActivityContract deployed at: ${activityContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(activityContract.address, [ethPriceFeedAddress]);
  }
};
module.exports.tags = ["all", "activity"];
