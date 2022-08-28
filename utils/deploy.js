const { ethers, run, network } = require("hardhat");

const main = async () => {
  const ActivityFactory = await ethers.getContractFactory("MockV3Aggregator");
  console.log("Deploying contract....");
  const activity = await ActivityFactory.deploy();
  await activity.deployed();
  console.log(`Deployed successfully deployed to ${activity.address}`);
  if (network.config.chainId === 4 && process.env.ETHERSCAN_API_KEY) {
    await activity.deployTransaction.wait(6);
    await verify(activity.address, []);
  }
};
const verify = async (contractAddress, args) => {
  console.log("Verifying Contract....");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (error) {
    if (error.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified");
    } else {
      console.log(e);
    }
  }
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
