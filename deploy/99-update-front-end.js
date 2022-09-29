const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
  "../minerva-frontend/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../minerva-frontend/constants/abi.json";

module.exports = async function() {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...");
    updateContractAddresses();
    updateAbi();
  }
};

async function updateAbi() {
  const ActivityContract = await ethers.getContract("ActivityContract");
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    ActivityContract.interface.format(ethers.utils.FormatTypes.json)
  );
}

const updateContractAddresses = async () => {
  const ActivityContract = await ethers.getContract("ActivityContract");
  const contractAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8")
  );
  if (network.config.chainId.toString() in contractAddresses) {
    if (
      !contractAddresses[network.config.chainId.toString()].includes(
        ActivityContract.address
      )
    ) {
      contractAddresses[network.config.chainId.toString()].push(
        ActivityContract.address
      );
    }
  } else {
    contractAddresses[network.config.chainId.toString()] = [
      ActivityContract.address,
    ];
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(contractAddresses));
};

module.exports.tags = ["all", "frontend"];
