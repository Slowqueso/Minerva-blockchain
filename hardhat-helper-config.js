const networkConfig = {
  4: {
    name: "rinkeby",
    priceFeedAddress: "0x8A753747A1Fa494EC906cE90E9f37563A8AF630e",
    RPC_URL: process.env.RINKEBY_RPC_URL,
  },
  5: {
    name: "goerli",
    priceFeedAddress: "0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e",
    RPC_URL: process.env.GOERLI_RPC_RUL,
  },
  80001: {
    name: "polygon",
    priceFeedAddress: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada",
    RPC_URL: process.env.MUMBAI_RPC_URL,
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
