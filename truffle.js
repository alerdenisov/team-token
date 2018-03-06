require('babel-polyfill')
require('babel-register')({
  // Ignore everything in node_modules except node_modules/zeppelin-solidity. 
  presets: ['es2015'],
  plugins: ['syntax-async-functions','transform-regenerator'],
  ignore: /node_modules\/(?!zeppelin-solidity)/, 
})

const HDWalletProvider = require('truffle-hdwallet-provider-privkey')

module.exports = {
  networks: {
    testrpc: {
      // gas: 4.5 * 1e6,
      gasPrice: 1,
      network_id: '*',
      host: 'localhost',
      port: 8545,
      from: '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1'     // Use the address we derived
    },
    rinkeby: {
      provider: () => new HDWalletProvider(process.env.PRIVATE_KEY, 'https://rinkeby.infura.io'),
      network_id: 4,
      gas: 4.5 * 1e6,
      gasPrice: 5e9
    }
  }
}
