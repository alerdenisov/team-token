var TeamToken = artifacts.require("./TeamToken.sol");
var TeamTokenDistribution = artifacts.require('./TeamTokenDistribution.sol');

module.exports = async function(deployer) {
  await deployer.deploy(TeamToken)
  await deployer.deploy(TeamTokenDistribution, TeamToken.address)

  const tokenInstance = await TeamToken.deployed()
  const distrInstance = await TeamTokenDistribution.deployed()

  console.log(`Initial owner: ${await tokenInstance.owner()}`)

  await tokenInstance.transferOwnership(distrInstance.address)

  console.log(`Final owner: ${await tokenInstance.owner()}`)
  // await deployer.deploy(TeamTokenDistribution, '0x87aa42ab921a7179add7e0152f2c85c08b78977e')
};
