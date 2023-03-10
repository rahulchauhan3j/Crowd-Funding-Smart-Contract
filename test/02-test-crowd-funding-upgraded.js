// This is test script for CrowdFundingUpgraded.sol
const {
  loadFixture,
  impersonateAccount,
  stopImpersonatingAccount,
  time,
} = require("@nomicfoundation/hardhat-network-helpers")
const { ethers, upgrades } = require("hardhat")
const { getNamedAccounts } = hre
const { assert, expect } = require("chai")
const {
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  PROJECT_NAME,
  FUNDING_GOAL,
  START_TIME,
  END_TIME,
} = require("../helper.hardhat.config")

describe("Test Upgraded Crowd Funding", function () {
  async function deployAndUpgradeCrowdFundingFixtureAndAddProjectOwner() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()

    const CrowdFundingContract = await ethers.getContractFactory(
      "CrowdFunding",
      deployer
    )
    const CrowdFunding = await upgrades.deployProxy(CrowdFundingContract, [
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_DECIMALS,
    ])
    await CrowdFunding.deployed()

    const CrowdFundingUpgradedContract = await ethers.getContractFactory(
      "CrowdFundingUpgraded",
      deployer
    )

    const CrowdFundingUpgraded = await upgrades.upgradeProxy(
      CrowdFunding.address,
      CrowdFundingUpgradedContract
    )
    await CrowdFundingUpgraded.deployed()

    const addProjectOwner = await CrowdFundingUpgraded.addProjectOwner(user)
    const addProjectOwnerTx = await addProjectOwner.wait()

    return { deployer, user, user2, user3, CrowdFundingUpgraded }
  }

  describe("Test that end time cannot be less than start time while submitting crowd funding campaign", async function () {
    it("End time cannot be less than start time while submitting crowd funding campaign", async function () {
      const { deployer, user, user2, user3, CrowdFundingUpgraded } =
        await loadFixture(deployAndUpgradeCrowdFundingFixtureAndAddProjectOwner)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      await expect(
        CrowdFundingUpgraded.connect(signer).submitProjectProposal(
          PROJECT_NAME,
          FUNDING_GOAL,
          END_TIME,
          START_TIME
        )
      ).to.be.revertedWith("End Time lesser than Start Time") // Note that END_TIME AND START TIME ARE SWITCHED

      await stopImpersonatingAccount(user)
    })

    it("Max duration is set as 30000", async function () {
      const { deployer, user, user2, user3, CrowdFundingUpgraded } =
        await loadFixture(deployAndUpgradeCrowdFundingFixtureAndAddProjectOwner)

      const maxDuration = await CrowdFundingUpgraded.duration()
      assert.equal(maxDuration.toString(), "30000")
    })
    it("Difference between End Time and Start Time cannot be more than 30000", async function () {
      const { deployer, user, user2, user3, CrowdFundingUpgraded } =
        await loadFixture(deployAndUpgradeCrowdFundingFixtureAndAddProjectOwner)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      await expect(
        CrowdFundingUpgraded.connect(signer).submitProjectProposal(
          PROJECT_NAME,
          FUNDING_GOAL,
          START_TIME,
          START_TIME + 30001
        )
      ).to.be.revertedWith("Invalid Duration")

      await stopImpersonatingAccount(user)
    })

    it("Crowd Funding Campaign can be submitted if difference End Time and Start Time is less than 30000 and End Time greater than Start Time", async function () {
      const { deployer, user, user2, user3, CrowdFundingUpgraded } =
        await loadFixture(deployAndUpgradeCrowdFundingFixtureAndAddProjectOwner)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const submitProjectProposal = await CrowdFundingUpgraded.connect(
        signer
      ).submitProjectProposal(
        PROJECT_NAME,
        FUNDING_GOAL,
        START_TIME,
        START_TIME + 30000
      )

      const submitProjectProposalTx = await submitProjectProposal.wait()

      const proposalID = submitProjectProposalTx.events[0].args[0]

      await stopImpersonatingAccount(user)

      const viewProjectProposal =
        await CrowdFundingUpgraded.viewProjectProposal(proposalID)

      assert.equal(viewProjectProposal.projectName, PROJECT_NAME)
      assert.equal(viewProjectProposal.fundingGoal, FUNDING_GOAL)
      assert.equal(viewProjectProposal.startTime, START_TIME)
      assert.equal(viewProjectProposal.endTime, START_TIME + 30000)
    })
  })
})
