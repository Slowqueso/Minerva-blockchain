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
  let UserRegistrationAddress;
  if (developmentChains.includes(network.name)) {
    const ethUSDAggregator = await deployments.get("MockV3Aggregator");
    const UserRegistrationContract = await deployments.get(
      "UserRegistrationContract"
    );
    UserRegistrationAddress = UserRegistrationContract.address;
    ethPriceFeedAddress = ethUSDAggregator.address;
  } else {
    const UserRegistrationContract = await deployments.get(
      "UserRegistrationContract"
    );
    UserRegistrationAddress = UserRegistrationContract.address;
    ethPriceFeedAddress = networkConfig[chainId].priceFeedAddress;
  }

  log(`\nDeploying Activity Contract to ${network.name} ...`);
  const MinervaActivityContract = await deploy("MinervaActivityContract", {
    from: deployer,
    args: [UserRegistrationAddress, ethPriceFeedAddress],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`Activity Contract deployed at: ${MinervaActivityContract.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(MinervaActivityContract.address, [
      UserRegistrationAddress,
      ethPriceFeedAddress,
    ]);
  }
};
module.exports.tags = ["all", "activity"];
