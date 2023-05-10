const config = require("../src/config.json")

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const wait = (seconds) => {
  const milliseconds = seconds * 1000
  return new Promise(resolve => setTimeout(resolve, milliseconds)) 
}

async function main() {
  // Fetch accounts from wallet - these are unlocked
  const accounts = await ethers.getSigners()

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork()
  console.log('Using chainId: ' + chainId)

  // Fetch deployed tokens
  const Dapp = await ethers.getContractAt('Token', config[chainId].Dapp.address)
  console.log('Dapp Token fetched: ' + Dapp.address)

  const mETH = await ethers.getContractAt('Token', config[chainId].mETH.address)
  console.log('mETH Token fetched: ' + mETH.address)

  const mDAI = await ethers.getContractAt('Token', config[chainId].mDAI.address)
  console.log('mDAI Token fetched: ' + mDAI.address)

  // Fetch the deployed exchange
  const exchange = await ethers.getContractAt('Exchange', config[chainId].exchange.address)
  console.log('Exchange fetched: ' + exchange.address + '\n')

  // Give tokens to account[1]
  const sender = accounts[0]
  const receiver = accounts[1]
  let amount = tokens(10000)

  // User1 transfer 10,000 mETH...
  let transaction, result
  transaction = await mETH.connect(sender).transfer(receiver.address, amount)
  console.log('Transfered ' + amount + ' tokens from ' + sender.address + ' to ' + receiver.address + '\n')

  // Setup exchange users
  const user1 = accounts[0]
  const user2 = accounts[1]
  amount = tokens(10000)

  // User1 approves 10,000 Dapp...
  transaction = await Dapp.connect(user1).approve(exchange.address, amount)
  await transaction.wait()
  console.log('Approved ' + amount + ' tokens from ' + user1.address)

  // User1 deposits 10,000 Dapp...
  transaction = await exchange.connect(user1).depositToken(Dapp.address, amount)
  await transaction.wait()
  console.log('Deposited ' + amount + ' Dapp from ' + user1.address)

  // User2 approves mETH
  transaction = await mETH.connect(user2).approve(exchange.address, amount)
  await transaction.wait()
  console.log('Approved ' + amount + ' tokens from ' + user2.address)

  // User1 deposits mETH
  transaction = await exchange.connect(user2).depositToken(mETH.address, amount)
  await transaction.wait()
  console.log('Deposited ' + amount + ' mETH from ' + user2.address + '\n')

  //////////////////////////////////////////////////////////
  // Seed a cancelled order

  // User1 makes order to get tokens
  let orderId
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), Dapp.address, tokens(5))
  result = await transaction.wait()
  console.log('Made order from ' + user1.address)

  // User1 cancels order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user1).cancelOrder(orderId)
  result = await transaction.wait()
  console.log('Cancelled order from ' + user1.address + '\n')

  // Wait 1 second
  await wait(1) 

  //////////////////////////////////////////////////////////
  // Seed filled orders

  // User1 makes order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(100), Dapp.address, tokens(10))
  result = await transaction.wait()
  console.log('Made order from ' + user1.address)

  // User2 fills order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log('Filled order from ' + user2.address)

  // Wait 1 second
  await wait(1)

  // User1 makes another order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(50), Dapp.address, tokens(15))
  result = await transaction.wait()
  console.log('Made order from ' + user1.address)

  // User2 fills another order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log('Filled order from ' + user2.address)

  // Wait 1 second
  await wait(1)

  // User1 makes final order
  transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(200), Dapp.address, tokens(20))
  result = await transaction.wait()
  console.log('Made order from ' + user1.address)

  // User2 fills final order
  orderId = result.events[0].args.id
  transaction = await exchange.connect(user2).fillOrder(orderId)
  result = await transaction.wait()
  console.log('Filled order from ' + user2.address + '\n')

  // Wait 1 second
  await wait(1)

  //////////////////////////////////////////////////////////
  // Seed open orders

  // User1 makes 10 orders
  for(let i = 1; i <= 10; i++){
    transaction = await exchange.connect(user1).makeOrder(mETH.address, tokens(10 * i), Dapp.address, tokens(10))
    result = await transaction.wait()
    
    console.log('Made order from ' + user1.address)

    // Wait 1 second
    await wait(1)
  }

  // User2 makes 10 orders
  for(let i = 1; i <= 10; i++){
    transaction = await exchange.connect(user2).makeOrder(Dapp.address, tokens(10), mETH.address, tokens(10 * i))
    result = await transaction.wait()
    
    console.log('Made order from ' + user2.address)

    // Wait 1 second
    await wait(1)
  }

}


main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
