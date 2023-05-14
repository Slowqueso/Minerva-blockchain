const { getNamedAccounts, deployments, network, ethers } = require("hardhat");
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
  let MinervaActivityContractAddress;
  if (developmentChains.includes(network.name)) {
    const ethUSDAggregator = await deployments.get("MockV3Aggregator");
    const UserRegistrationContract = await deployments.get(
      "UserRegistrationContract"
    );
    const MinervaActivityContract = await deployments.get(
      "MinervaActivityContract"
    );
    MinervaActivityContractAddress = MinervaActivityContract.address;
    UserRegistrationAddress = UserRegistrationContract.address;
    ethPriceFeedAddress = ethUSDAggregator.address;
  } else {
    ethPriceFeedAddress = networkConfig[chainId].priceFeedAddress;
  }
  log("-----------------------------------------");
  const MinervaTaskContract = await deploy("MinervaTaskContract", {
    from: deployer,
    args: [UserRegistrationAddress, MinervaActivityContractAddress],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`Task Contract deployed at: ${MinervaTaskContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(MinervaTaskContract.address);
  }
};
module.exports.tags = ["all", "task"];
