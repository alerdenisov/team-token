var TeamToken = artifacts.require('./TeamToken.sol')
var TeamTokenDistribution = artifacts.require('./TeamTokenDistribution.sol')

module.exports = function(deployer) {
  deployer.deploy(TeamToken)
}
