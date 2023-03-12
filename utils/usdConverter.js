const convertUsdToETH = (usdPrice, ethPriceValue) => {
  if (usdPrice === 0) return 0;
  const ethPriceInUSD = parseInt(ethPriceValue[0].split(": ")[1]);
  ethValue = (usdPrice - 0.01) / ethPriceInUSD;
  return ethValue.toFixed(6);
};

module.exports = { convertUsdToETH };
