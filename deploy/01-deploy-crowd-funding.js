const { ethers, upgrades } = require("hardhat")
const {
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
} = require("../helper.hardhat.config")

module.exports = async (hre) => {
  const CrowdFunding = await ethers.getContractFactory("CrowdFunding")

  const args = [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS]
  const instanceCrowdFunding = await upgrades.deployProxy(CrowdFunding, args)
  await instanceCrowdFunding.deployed()

  console.log(
    `Crowd Funding Contract Deployed at ${instanceCrowdFunding.address}`
  )
  console.log("-------------------------------")
}
