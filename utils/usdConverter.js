const convertUsdToETH = (usdPrice, ethPriceValue) => {
  const ethPriceInUSD = parseInt(ethPriceValue[0].split(": ")[1]);
  ethValue = (usdPrice - 0.01) / ethPriceInUSD;
  return ethValue.toFixed(6);
};

module.exports = { convertUsdToETH };
