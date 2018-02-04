const { promisify, expectThrow } = require('./utils')
const TeamToken = artifacts.require("./TeamToken.sol");


function getBalance(account, at) {
  return promisify(cb => web3.eth.getBalance(account, at, cb));
}

function sendTransaction(data) {
  return promisify(cb => web3.eth.sendTransaction(data, cb));
}

let Team

contract('TeamToken', accounts => {
  const OWNER_SIGNATURE = { from: accounts[0] }

  beforeEach(async () => {
    Team = await TeamToken.new(OWNER_SIGNATURE)
  })

  describe('Payable', () => {
    it('should forward received funds to the owner', async () => {
      await expectThrow(sendTransaction({
        from: accounts[2],
        to: Team.address,
        value: web3.toWei(0.2, "ether")
      }))
    })
  })

  describe('Ownership', () => {
    it('should have a owner', async () => {
      const owner = await Team.owner()
      assert.strictEqual(owner, accounts[0])
    })
    it('should transfer owner when it needed', async () => {
      await Team.transferOwnership(accounts[1], OWNER_SIGNATURE)
      assert.strictEqual(await Team.owner.call(), accounts[1])
    })

    it('should throw then not owner try to transfer ownership', async () => {
      await expectThrow(Team.transferOwnership(accounts[2], { from: accounts[1] }))
    })
  })

  describe('Emission Tests', () => {
    const assertEquals = async (func, expect, msg) => {
      const value = await func()
      assert(value.equals(expect), msg || `Value isnt expected! (current is ${value} but expected is ${expect})`)
    }

    const assertSupply = async (expect, msg) => {
      await assertEquals(Team.totalSupply, expect, msg)
    }

    it('should starts with zero supply', async () => {
      await assertSupply(0, 'supply isnt zero')
      await assertEquals(Team.freeToExtraMinting, 0)
      await assertEquals(Team.investorSupply, 0)
      await assertEquals(Team.extraSupply, 0)
    })

    it('should add free to extra minting tokens after mint', async () => {
      assertEquals(Team.freeToExtraMinting, 0)
      await Team.mint(accounts[1], 120, OWNER_SIGNATURE)
      assertEquals(Team.freeToExtraMinting, 120)
    })

    it('should create extra 40 tokens for each 60 tokens', async () => {
      await Team.mint(accounts[1], 120, OWNER_SIGNATURE)
      await assertSupply(120)
      await assertEquals(Team.investorSupply, 120)
      await Team.extraMint(OWNER_SIGNATURE)
      await assertEquals(Team.freeToExtraMinting, 0)
      await assertEquals(Team.investorSupply, 120)
      await assertEquals(Team.extraSupply, 80)
      await assertSupply(120 + 80)
    })

    it('should allow repeat extra minting', async () => {
      await Team.mint(accounts[1], 120, OWNER_SIGNATURE)
      await Team.extraMint(OWNER_SIGNATURE)
      await Team.mint(accounts[1], 120, OWNER_SIGNATURE)
      await Team.extraMint(OWNER_SIGNATURE)
      
      await assertEquals(Team.extraSupply, 160)
      await assertSupply(400)
    })

    it('should divide to minimal bounds', async () => {
      await Team.mint(accounts[1], 119, OWNER_SIGNATURE)
      await Team.extraMint(OWNER_SIGNATURE)
      
      await assertEquals(Team.extraSupply, 40)
      await assertSupply(119 + 40)
      await assertEquals(Team.freeToExtraMinting, 59)

      await Team.mint(accounts[1], 121, OWNER_SIGNATURE)
      await Team.extraMint(OWNER_SIGNATURE)
      await assertEquals(Team.extraSupply, 160)
      await assertSupply(400)
    })

    it('prevent to sale more than sale hard cap', async () => {
      await Team.mint(accounts[3], await Team.MAXSOLD_SUPPLY(), OWNER_SIGNATURE)
      await expectThrow(Team.mint(accounts[2], 10000, OWNER_SIGNATURE))

      const maxSold = await Team.MAXSOLD_SUPPLY()
      console.log(maxSold.div(1e4).toString(10))

      const totalSupply = await Team.totalSupply()
      assert(totalSupply.equals(maxSold))
    })

    it('prevent to mint more than hard cap', async () => {
      await Team.mint(accounts[3], await Team.MAXSOLD_SUPPLY(), OWNER_SIGNATURE)
      await Team.extraMint(OWNER_SIGNATURE)
      await assertSupply(await Team.HARDCAPPED_SUPPLY())
    })
  })

  describe('Token Manipulations', () => {
    async function assertBalance(account, expect) {
      const balance = await Team.balanceOf.call(account)
      assert(balance.equals(expect), `${account} balance isn't expected (current is ${balance}, but expected is ${expect}`)
    }

    beforeEach(async () => {
      await Team.mint(accounts[0], 100000, OWNER_SIGNATURE)
      await Team.mint(accounts[1], 10000, OWNER_SIGNATURE)
      await Team.mint(accounts[2], 2000, OWNER_SIGNATURE)

      
      await assertBalance(accounts[0], 100000)
      await assertBalance(accounts[1], 10000)
      await assertBalance(accounts[2], 2000)
    })

    describe('Transfers', () => {
      it('should throw on transfer', async () => {
        await expectThrow(Team.transfer(accounts[2], 1000, { from: accounts[1] }))
      })

      it('should throw on transfer also on owner', async () => {
        await expectThrow(Team.transfer(accounts[1], 1000, OWNER_SIGNATURE))
      })

      it('should allow to transfer funds', async () => {
        await Team.openTransfer(OWNER_SIGNATURE)
        return Team.transfer(accounts[1], 1000, OWNER_SIGNATURE)
      })

      it('should allow transfer for special account', async () => {
        await Team.toggleTransferFor(accounts[1], OWNER_SIGNATURE)
        await Team.transfer(accounts[2], 5000, { from: accounts[1] })
        await assertBalance(accounts[1], 5000)
        await assertBalance(accounts[2], 7000)
      })

      it('should close transfer for special account', async () => {
        await Team.toggleTransferFor(accounts[1], OWNER_SIGNATURE)
        await Team.transfer(accounts[2], 5000, { from: accounts[1] })
        await assertBalance(accounts[1], 5000)
        await assertBalance(accounts[2], 7000)

        await Team.toggleTransferFor(accounts[1], OWNER_SIGNATURE)
        await expectThrow(Team.transfer(accounts[2], 5000, { from: accounts[1] }))
        await assertBalance(accounts[1], 5000)
        await assertBalance(accounts[2], 7000)
      })
    })

    describe('Allowance', () => {
      it('should prevent transfer allowed tokens', async () => {
        await Team.approve(accounts[2], 5000, { from: accounts[1] })
        await expectThrow(Team.transferFrom(accounts[1], accounts[2], 5000, { from: accounts[2] }),
          'transfer should throw exception before transfer open')
        await assertBalance(accounts[1], 10000)
        await assertBalance(accounts[2], 2000)
      })

      it('should transfer tokens as always', async () => {
        await Team.approve(accounts[2], 5000, { from: accounts[1] })
        await Team.openTransfer(OWNER_SIGNATURE)
        await Team.transferFrom(accounts[1], accounts[2], 5000, { from: accounts[2] })
        await assertBalance(accounts[1], 5000)
        await assertBalance(accounts[2], 7000)
      })
    })

    describe('Finilize crowdsale', () => {
      it('shouldnt to allow to finalize before end minting and/or open transfer', async() => {
        await expectThrow(Team.finilize(OWNER_SIGNATURE))
      })
      it('shouldnt to allow to finalize before open transfer', async() => {
        await Team.finishMinting(OWNER_SIGNATURE)
        await expectThrow(Team.finilize(OWNER_SIGNATURE))
      })
      it('shouldnt to allow to finalize before open transfer', async() => {
        await Team.openTransfer(OWNER_SIGNATURE)
        await expectThrow(Team.finilize(OWNER_SIGNATURE))
      })
      it('should finalize after ends minting and open transfer', async() => {
        await Team.openTransfer(OWNER_SIGNATURE)
        await Team.finishMinting(OWNER_SIGNATURE)
        await Team.finilize(OWNER_SIGNATURE)
      })
      it('owner should be a 0 after ends', async() => {
        await Team.openTransfer(OWNER_SIGNATURE)
        await Team.finishMinting(OWNER_SIGNATURE)
        await Team.finilize(OWNER_SIGNATURE)

        const owner = await Team.owner()
        assert(!parseInt(owner), `unxpected owner address ${owner}`)
      })
    })
  })
})