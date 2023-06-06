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
    const UserRegistrationContract = await deployments.get(
      "UserRegistrationContract"
    );
    const MinervaActivityContract = await deployments.get(
      "MinervaActivityContract"
    );
    MinervaActivityContractAddress = MinervaActivityContract.address;
    UserRegistrationAddress = UserRegistrationContract.address;
    ethPriceFeedAddress = networkConfig[chainId].priceFeedAddress;
  }
  log("-----------------------------------------");
  const MinervaDonationContract = await deploy("MinervaDonationContract", {
    from: deployer,
    args: [MinervaActivityContractAddress, UserRegistrationAddress],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`Donation Contract deployed at: ${MinervaDonationContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(MinervaDonationContract.address, [MinervaActivityContractAddress, UserRegistrationAddress]);
  }
};
module.exports.tags = ["all", "donation"];
