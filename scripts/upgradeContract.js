// This script describes an end to end business flow from contract creation
// to the moment campaign ends and funds are transferred to project owner.
// This script also demonstrates upgradeability feature.
// This script can be run using - yarn hardhat run ./scripts/upgradeContract.js

const { time } = require("@nomicfoundation/hardhat-network-helpers")
const { ethers, upgrades } = require("hardhat")
const { getNamedAccounts } = hre
const {
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  PROJECT_NAME,
  FUNDING_GOAL,
  START_TIME,
  END_TIME,
  GOAL_STATUS,
} = require("../helper.hardhat.config")

async function main() {
  const { deployer, user, user2, user3 } = await getNamedAccounts()

  console.log("Deploying Initial CrowdFunding Contract")
  const crowdFundingContract = await ethers.getContractFactory(
    "CrowdFunding",
    deployer
  )
  const crowdFunding = await upgrades.deployProxy(crowdFundingContract, [
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_DECIMALS,
  ])
  await crowdFunding.deployed()
  console.log(`Crowd Funding Contract Deployed at ${crowdFunding.address}`)
  console.log("-----------------------------------------------------------")

  console.log("Adding Project Owner")
  const addProjectOwner = await crowdFunding.addProjectOwner(user)
  const addProjectOwnerTx = await addProjectOwner.wait()

  console.log(`${addProjectOwnerTx.events[0].args[0]} added as project owner`)
  console.log("-----------------------------------------------------------")

  console.log("Submiting Project")
  const signer = await ethers.getSigner(user)

  const submitProjectProposal = await crowdFunding
    .connect(signer)
    .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)
  const submitProjectProposalTx = await submitProjectProposal.wait()

  const proposalID = submitProjectProposalTx.events[0].args[0]
  console.log(`Proposal Id ${proposalID} submitted `)
  console.log("-----------------------------------------------------------")

  console.log("Lets mint some tokens to user2 and user3")
  const mintTokensForUser2 = await crowdFunding.mint(user2, FUNDING_GOAL)
  const mintTokensForUser3 = await crowdFunding.mint(user3, FUNDING_GOAL)

  console.log(`${FUNDING_GOAL} tokens minted for each ${user2} and ${user3}`)
  console.log("-----------------------------------------------------------")

  console.log("Fund the project")
  time.increaseTo(START_TIME + 1)
  const signer2 = await ethers.getSigner(user2)
  const fundedAmount = FUNDING_GOAL / 2
  const fundProject = await crowdFunding
    .connect(signer2)
    .fundProjectProposal(proposalID, fundedAmount)
  const fundProjectTx = await fundProject.wait()

  console.log(
    `Project Proposal Id ${fundProjectTx.events[1].args[0]} funded by ${fundProjectTx.events[1].args[1]} with amount ${fundProjectTx.events[1].args[2]} `
  )
  console.log("-----------------------------------------------------------")

  console.log("Check status of project")

  const goalStatus = (await crowdFunding.viewProjectProposal(proposalID))
    .goalStatus

  console.log(`Project status is ${GOAL_STATUS[goalStatus]}`)
  console.log("-----------------------------------------------------------")

  console.log("Check ERC20 Balance of user who funded the project")
  const balanceOfUser2 = await crowdFunding.balanceOf(user2)
  console.log(
    `Balance of ${user2} who funded the project is ${balanceOfUser2}. Initially it was ${FUNDING_GOAL}`
  )
  console.log("-----------------------------------------------------------")

  console.log("*******LETS UPGRADE THE CONTRACT*********")
  const crowdFundingUpgradedContract = await ethers.getContractFactory(
    "CrowdFundingUpgraded",
    deployer
  )
  const crowdFundingUpgraded = await upgrades.upgradeProxy(
    crowdFunding.address,
    crowdFundingUpgradedContract
  )
  crowdFundingUpgraded.deployed()
  console.log(
    `Upgraded Crowd Funding Contract deployed at ${crowdFundingUpgraded.address}`
  )
  console.log("-----------------------------------------------------------")
  console.log("Check value of constant duration")
  const duration = await crowdFundingUpgraded.duration()

  console.log(`Duration is set as ${duration}`)

  console.log("-----------------------------------------------------------")

  console.log(
    "Check status of project which was created in the initial project"
  )

  const goalStatus_upgraded = (
    await crowdFundingUpgraded.viewProjectProposal(proposalID)
  ).goalStatus

  console.log(`Project status is ${GOAL_STATUS[goalStatus_upgraded]}`)
  console.log("-----------------------------------------------------------")
  console.log(
    "Check that ERC20 Balance of user who funded the project is same after upgrade"
  )
  const balanceOfUser2_upgraded = await crowdFundingUpgraded.balanceOf(user2)
  console.log(
    `Balance of ${user2} who funded the project is ${balanceOfUser2_upgraded}. Initially it was ${FUNDING_GOAL}`
  )
  console.log("-----------------------------------------------------------")

  console.log("Fund the project further using upgraded contract")
  const signer_upgraded = await ethers.getSigner(user3)
  const fundedAmount_upgraded = FUNDING_GOAL / 2
  const fundProjectProposal_upgraded = await crowdFundingUpgraded
    .connect(signer_upgraded)
    .fundProjectProposal(proposalID, fundedAmount_upgraded)

  const fundProjectProposal_upgradedTx =
    await fundProjectProposal_upgraded.wait()
  console.log(
    `Project Proposal Id ${fundProjectProposal_upgradedTx.events[1].args[0]} funded by ${fundProjectProposal_upgradedTx.events[1].args[1]} with amount ${fundProjectProposal_upgradedTx.events[1].args[2]} `
  )
  console.log("-----------------------------------------------------------")
  console.log("Check status of project now. It's goal should be achieved")

  const goalStatus_upgraded_2 = (
    await crowdFundingUpgraded.viewProjectProposal(proposalID)
  ).goalStatus

  console.log(`Project status is ${GOAL_STATUS[goalStatus_upgraded_2]}`)
  console.log("-----------------------------------------------------------")
  console.log("Transfer ERC20 tokens to project owner")

  time.increaseTo(END_TIME + 1)
  const signerProjectOwner = await ethers.getSigner(user)
  const transferFundsToProjectOwner = await crowdFundingUpgraded
    .connect(signerProjectOwner)
    .transferFundsToProjectOwner(proposalID)

  const transferFundsToProjectOwnerTx = await transferFundsToProjectOwner.wait()

  console.log(
    `Funds withdrawn from ${transferFundsToProjectOwnerTx.events[1].args[0]}  by ${transferFundsToProjectOwnerTx.events[1].args[1]}. Total Amount Withdrawn ${transferFundsToProjectOwnerTx.events[1].args[2]}`
  )
  console.log("-----------------------------------------------------------")
  console.log("Check Total Funds left in the Campaign")

  const totalFundsLeft = (
    await crowdFundingUpgraded.viewProjectProposal(proposalID)
  ).fundsRecieved

  console.log(`Total Funds Left in Campaign - ${totalFundsLeft}`)
  console.log("-----------------------------------------------------------")
  console.log("Check Total Balance of Project Owner")
  const totalBalanceOfProjectOwner = await crowdFundingUpgraded.balanceOf(user)
  console.log(
    `Balance of project owner is ${totalBalanceOfProjectOwner.toString()}`
  )
  console.log("-----------------------------------------------------------")
}

main()
  .then(() => {
    console.log("--------SUCCESS-----------")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
