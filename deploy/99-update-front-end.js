const { ethers, network } = require("hardhat");
const fs = require("fs");

const FRONT_END_ADDRESSES_FILE =
  "../minerva-frontend/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../minerva-frontend/constants/abi.json";

module.exports = async function() {
  if (process.env.UPDATE_FRONT_END) {
    await updateContractAddresses();
    await updateAbi();
  }
};

async function updateAbi() {
  const Minerva = await ethers.getContract("Minerva");
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    Minerva.interface.format(ethers.utils.FormatTypes.json)
  );
}

const updateContractAddresses = async () => {
  try {
    console.log("yes");
    const Minerva = await ethers.getContract("Minerva");
    console.log("no");
    const contractAddresses = JSON.parse(
      fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf-8")
    );
    if (network.config.chainId.toString() in contractAddresses) {
      if (
        !contractAddresses[network.config.chainId.toString()].includes(
          Minerva.address
        )
      ) {
        contractAddresses[network.config.chainId.toString()].push(
          Minerva.address
        );
      }
    } else {
      contractAddresses[network.config.chainId.toString()] = [Minerva.address];
    }
    fs.writeFileSync(
      FRONT_END_ADDRESSES_FILE,
      JSON.stringify(contractAddresses)
    );
  } catch (error) {
    console.log(error);
  }
};

module.exports.tags = ["all", "frontend"];
