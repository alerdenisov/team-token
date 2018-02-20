require('dotenv').config()
require('babel-register')
require('babel-polyfill')

let provider
const HDWalletProvider = require('truffle-hdwallet-provider-privkey')
const private = process.env.PRIVATE_KEY

if (!process.env.SOLIDITY_COVERAGE){
    provider = new HDWalletProvider(private, 'https://rinkeby.infura.io')
}


module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*" // Match any network id
    },
    rinkeby: {
      provider: provider,
      network_id: 4,
      gas: 4.5 * 1e6,
      gasPrice: 5e9
    }
  }
}
