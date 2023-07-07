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

  log("-----------------------------------------");
  const RegistrationContract = await deploy("UserRegistrationContract", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });
  log(`Registration Contract deployed at: ${RegistrationContract.address}`);

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(RegistrationContract.address);
  }
};
module.exports.tags = ["all", "registration"];
