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
  let UserRegistrationAddress;
  let MinervaActivityContractAddress;
  let MinervaTaskContractAddress;
  let MinervaDonationContractAddress;
  const UserRegistrationContract = await deployments.get(
    "UserRegistrationContract"
  );
  const MinervaActivityContract = await deployments.get(
    "MinervaActivityContract"
  );
  const MinervaTaskContract = await deployments.get("MinervaTaskContract");
  const MinervaDonationContract = await deployments.get(
    "MinervaDonationContract"
  );
  MinervaActivityContractAddress = MinervaActivityContract.address;
  UserRegistrationAddress = UserRegistrationContract.address;
  MinervaTaskContractAddress = MinervaTaskContract.address;
  MinervaDonationContractAddress = MinervaDonationContract.address;

  log("-----------------------------------------");
  const MinervaInterfaceContract = await deploy("Minerva", {
    from: deployer,
    args: [
      UserRegistrationAddress,
      MinervaActivityContractAddress,
      MinervaTaskContractAddress,
      MinervaDonationContractAddress,
    ],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  const deployerSigner = ethers.provider.getSigner(deployer);

  const userRegistrationContractInstance = new ethers.Contract(
    UserRegistrationAddress,
    UserRegistrationContract.abi,
    deployerSigner
  );

  const addPermittedAddressTx1 = await userRegistrationContractInstance.addPermittedAddress(
    MinervaInterfaceContract.address
  );
  await addPermittedAddressTx1.wait();

  const activityContractInstance = new ethers.Contract(
    MinervaActivityContractAddress,
    MinervaActivityContract.abi,
    deployerSigner
  );

  const addPermittedAddressTx = await activityContractInstance.addPermittedAddress(
    MinervaInterfaceContract.address
  );
  await addPermittedAddressTx.wait();

  const taskContractInstance = new ethers.Contract(
    MinervaTaskContractAddress,
    MinervaTaskContract.abi,
    deployerSigner
  );

  const addPermittedAddressTx2 = await taskContractInstance.addPermittedAddress(
    MinervaInterfaceContract.address
  );
  await addPermittedAddressTx2.wait();

  const donationContractInstance = new ethers.Contract(
    MinervaDonationContractAddress,
    MinervaDonationContract.abi,
    deployerSigner
  );

  const addPermittedAddressTx3 = await donationContractInstance.addPermittedAddress(
    MinervaInterfaceContract.address
  );
  await addPermittedAddressTx3.wait();

  log(`Minerva Contract deployed at: ${MinervaInterfaceContract.address}`);
  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    await verify(MinervaInterfaceContract.address);
  }
};
module.exports.tags = ["all", "minerva"];
