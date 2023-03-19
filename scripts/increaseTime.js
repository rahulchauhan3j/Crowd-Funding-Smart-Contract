//utility script to increase time
const { time } = require("@nomicfoundation/hardhat-network-helpers")
const { GO_FORWARD_IN_TIME } = require("../helper.hardhat.config")

async function increaseTime() {
  await time.increaseTo(GO_FORWARD_IN_TIME)
}

increaseTime()
  .then(() => {
    console.log("Time Increased")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
