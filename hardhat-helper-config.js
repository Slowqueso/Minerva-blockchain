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
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
