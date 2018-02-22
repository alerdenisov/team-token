const TeamToken = artifacts.require('./TeamToken.sol')
const TeamTokenDistribution = artifacts.require('./TeamTokenDistribution.sol')

module.exports = async function (callback) {
  const token = await TeamToken.deployed()
  const distribution = await TeamTokenDistribution.deployed()

  const resultOfTransfer = await token.transferOwnership(distribution.address)
  console.log(resultOfTransfer)
}