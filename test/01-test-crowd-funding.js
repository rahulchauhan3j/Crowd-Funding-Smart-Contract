// This is test script for CrowdFunding.sol
const {
  loadFixture,
  impersonateAccount,
  stopImpersonatingAccount,
  time,
} = require("@nomicfoundation/hardhat-network-helpers")
const { getNamedAccounts } = hre
const { ethers, upgrades } = require("hardhat")
const { assert, expect } = require("chai")
const {
  TOKEN_NAME,
  TOKEN_SYMBOL,
  PROJECT_NAME,
  FUNDING_GOAL,
  START_TIME,
  END_TIME,
} = require("../helper.hardhat.config")
const {
  increase,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time")
const { entropyToMnemonic } = require("ethers/lib/utils")

describe("Test Crowd Funding Contract", function () {
  async function deployCrowdFundingFixture() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()
    const crowdFundingContract = await ethers.getContractFactory(
      "CrowdFunding",
      deployer
    )

    const args = [TOKEN_NAME, TOKEN_SYMBOL]
    const crowdFunding = await upgrades.deployProxy(crowdFundingContract, args)
    await crowdFunding.deployed()

    return { deployer, user, user2, user3, crowdFunding }
  }

  async function deployCrowdFundingFixtureAndCreateCrowdFundingCampaign() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()

    const crowdFundingContract = await ethers.getContractFactory(
      "CrowdFunding",
      deployer
    )

    const args = [TOKEN_NAME, TOKEN_SYMBOL]
    const crowdFunding = await upgrades.deployProxy(crowdFundingContract, args)
    await crowdFunding.deployed()

    const addProjectOwner = await crowdFunding.addProjectOwner(user)
    await addProjectOwner.wait()

    await impersonateAccount(user)

    const signer = await ethers.getSigner(user)

    const submitProjectProposal = await crowdFunding
      .connect(signer)
      .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)

    const submitProjectProposalTx = await submitProjectProposal.wait()

    await stopImpersonatingAccount(user)

    const proposalId = submitProjectProposalTx.events[0].args[0]

    /* Mint some ERC 20 tokens to user2 and user3 so that they can fund later */

    const mintToUser2 = await crowdFunding.mint(user2, 2000)
    const mintToUser3 = await crowdFunding.mint(user3, 2000)

    return { deployer, user, user2, user3, crowdFunding, proposalId }
  }

  async function deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt() {
    const { deployer, user, user2, user3 } = await getNamedAccounts()

    const crowdFundingContract = await ethers.getContractFactory(
      "CrowdFunding",
      deployer
    )

    const args = [TOKEN_NAME, TOKEN_SYMBOL]
    const crowdFunding = await upgrades.deployProxy(crowdFundingContract, args)
    await crowdFunding.deployed()

    const addProjectOwner = await crowdFunding.addProjectOwner(user)
    await addProjectOwner.wait()

    await impersonateAccount(user)

    const signer = await ethers.getSigner(user)

    const submitProjectProposal = await crowdFunding
      .connect(signer)
      .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)

    const submitProjectProposalTx = await submitProjectProposal.wait()

    await stopImpersonatingAccount(user)

    const proposalId = submitProjectProposalTx.events[0].args[0]

    /* Mint some ERC 20 tokens to user2 and user3 so that they can fund later */

    const mintToUser2 = await crowdFunding.mint(user2, FUNDING_GOAL)
    const mintToUser3 = await crowdFunding.mint(user3, FUNDING_GOAL)

    await impersonateAccount(user2)

    const signer2 = await ethers.getSigner(user2)
    const fundProjectProposal = await crowdFunding
      .connect(signer2)
      .fundProjectProposal(proposalId, FUNDING_GOAL - 100)
    await fundProjectProposal.wait()

    await stopImpersonatingAccount(user2)

    return { deployer, user, user2, user3, crowdFunding, proposalId }
  }

  describe("Test Initializations", function () {
    it("ERC20 Token Name is correctly initialized", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const tokenName = await crowdFunding.name()
      assert.equal(TOKEN_NAME, tokenName)
    })

    it("ERC20 Token Symbol is correctly initialized", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const tokenSymbol = await crowdFunding.symbol()
      assert.equal(TOKEN_SYMBOL, tokenSymbol)
    })

    it("Owner of Contract is correctly set", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const owner = await crowdFunding.owner()
      assert.equal(owner, deployer)
    })
  })

  describe("Test adding project owner", function () {
    it("Non owner cannot add project owner", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )
      await impersonateAccount(user)
      const signer = await ethers.getSigner(user)
      await expect(
        crowdFunding.connect(signer).addProjectOwner(user2)
      ).to.be.revertedWith("Ownable: caller is not the owner")
      await stopImpersonatingAccount(user)
    })

    it("Owner can add project owner", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const addProjectOwner = await crowdFunding.addProjectOwner(user2)
      const addProjectOwnerTx = await addProjectOwner.wait()

      assert.equal(addProjectOwnerTx.events[0].args[0], user2)

      const isProjectOwner = await crowdFunding.isProjectOwner(user2)
      expect(isProjectOwner).to.be.true
    })

    it("Function isProjectOwner returns false if project owner is not found", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const isProjectOwner = await crowdFunding.isProjectOwner(user2)
      expect(isProjectOwner).to.be.false
    })
  })

  describe("Test Submitting Crowd Funding Project", function () {
    it("Non - Project Owner cannot submit crowd funding project", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )
      await expect(
        crowdFunding.submitProjectProposal(
          "Project 1",
          200,
          1678120761,
          1678140761
        )
      ).to.be.revertedWith("Only Project Owner Authorized")
    })

    it("Project Owner can submit crowd funding project", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )
      const addProjectOwner = await crowdFunding.addProjectOwner(user)
      await addProjectOwner.wait()

      const isProjectOwner = await crowdFunding.isProjectOwner(user)

      expect(isProjectOwner).to.be.true

      await impersonateAccount(user)
      const signer = await ethers.getSigner(user)

      const projectName = "Project 1"
      const fundingGoal = 200
      const startTime = 1678120761
      const endTime = 1678140761

      const submitProject = await crowdFunding
        .connect(signer)
        .submitProjectProposal("Project 1", 200, 1678120761, 1678140761)
      const submitProjectTx = await submitProject.wait()

      await stopImpersonatingAccount(user)

      const viewProjectProposal = await crowdFunding.viewProjectProposal(
        submitProjectTx.events[0].args[0]
      )

      assert.equal(viewProjectProposal.projectOwner, user)
      assert.equal(viewProjectProposal.fundingGoal, fundingGoal)
      assert.equal(viewProjectProposal.startTime, startTime)
      assert.equal(viewProjectProposal.endTime, endTime)
      assert.equal(viewProjectProposal.goalStatus.toString(), "0")
    })
  })

  describe("Test Cancelling Crowd Funding Project", function () {
    it("Non-Owner/Non-Project Owner cannot cancel crowd funding project", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const owner = await crowdFunding.owner()
      const isProjectOwner = await crowdFunding.isProjectOwner(user2)

      assert.notEqual(owner, user2) // user is not the owner
      expect(isProjectOwner).to.be.false // user is not the project owner

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const cancel = await expect(
        crowdFunding.connect(signer).cancelProjectProposal(proposalId)
      ).to.be.revertedWith("Only owner or project owner can take this action")

      await stopImpersonatingAccount(user2)
    })

    it("Owner can cancel crowd funding project", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const owner = await crowdFunding.owner()
      assert.equal(owner, deployer)

      const cancelCrowdFundingProject =
        await crowdFunding.cancelProjectProposal(proposalId)

      const cancelCrowdFundingProjectTx = await cancelCrowdFundingProject.wait()

      const cancelledProposal = cancelCrowdFundingProjectTx.events[0].args[0]

      assert.equal(cancelledProposal.toString(), proposalId.toString())

      const viewProjectProposal = await crowdFunding.viewProjectProposal(
        proposalId
      )

      assert.equal(viewProjectProposal.goalStatus.toString(), "2")
    })

    it("Project Owner can cancel crowd funding project", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const isProjectOwner = await crowdFunding.isProjectOwner(user)
      expect(isProjectOwner).to.be.true

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const cancelCrowdFundingProject = await crowdFunding
        .connect(signer)
        .cancelProjectProposal(proposalId)

      const cancelCrowdFundingProjectTx = await cancelCrowdFundingProject.wait()

      const cancelledProposal = cancelCrowdFundingProjectTx.events[0].args[0]

      await stopImpersonatingAccount(user)

      assert.equal(cancelledProposal.toString(), proposalId.toString())

      const viewProjectProposal = await crowdFunding.viewProjectProposal(
        proposalId
      )

      assert.equal(viewProjectProposal.goalStatus.toString(), "2")
    })
  })

  describe("Test Funding Crowd Funding Project", function () {
    it("Funding cannot be done if incorrect project id is passed", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )
      await expect(crowdFunding.fundProjectProposal(2, 200)).to.be.revertedWith(
        "Incorrect Project Id"
      )
    })

    it("Funding cannot be done if campaign has not started (start time > date now)", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const addProjectOwner = await crowdFunding.addProjectOwner(user)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      await stopImpersonatingAccount(user)
      const proposalId = submitProjectProposalTx.events[0].args[0]

      time.increaseTo(START_TIME - 1)
      await expect(
        crowdFunding.fundProjectProposal(proposalId, 200)
      ).to.be.revertedWith("Crowd Funding Campaign has not started")
    })

    it("Funding cannot be done if campaign has ended (end time > date now)", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const addProjectOwner = await crowdFunding.addProjectOwner(user)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      await stopImpersonatingAccount(user)
      const proposalId = submitProjectProposalTx.events[0].args[0]

      time.increaseTo(END_TIME + 1)
      await expect(
        crowdFunding.fundProjectProposal(proposalId, 200)
      ).to.be.revertedWith("Crowd Funding Campaign has ended")
    })

    it("Funding cannot be done if campaign has been cancelled", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const addProjectOwner = await crowdFunding.addProjectOwner(user)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      const proposalId = submitProjectProposalTx.events[0].args[0]

      const cancelCrowdFundingProject =
        await crowdFunding.cancelProjectProposal(proposalId)

      await stopImpersonatingAccount(user)

      time.increaseTo(START_TIME + 1)
      await expect(
        crowdFunding.fundProjectProposal(proposalId, 200)
      ).to.be.revertedWith(
        "Crowd Funding Campaign is either completed or cancelled or failed"
      )
    })

    it("Funding cannot be done if user doesnt have ERC20 tokens", async function () {
      const { deployer, user, user2, user3, crowdFunding } = await loadFixture(
        deployCrowdFundingFixture
      )

      const addProjectOwner = await crowdFunding.addProjectOwner(user)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .submitProjectProposal(PROJECT_NAME, FUNDING_GOAL, START_TIME, END_TIME)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      const proposalId = submitProjectProposalTx.events[0].args[0]

      await stopImpersonatingAccount(user)

      time.increaseTo(START_TIME + 1)
      await expect(
        crowdFunding.fundProjectProposal(proposalId, 200)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })

    it("Funding can be done by user having ERC 20 tokens", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      time.increaseTo(START_TIME + 1)

      const InitialBalanceOfUser = await crowdFunding.balanceOf(user2)
      const InitialBalanceOfContract = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundedAmount = 1000
      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, fundedAmount)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      const proposalFunded = submitProjectProposalTx.events[1].args[0]
      const addressFundingTheProposal =
        submitProjectProposalTx.events[1].args[1]
      const amountFundedByUser = submitProjectProposalTx.events[1].args[2]

      assert.equal(proposalFunded.toString(), proposalId.toString())
      assert.equal(addressFundingTheProposal, user2)
      assert.equal(amountFundedByUser.toString(), fundedAmount.toString())

      const finalBalanceOfUser = await crowdFunding.balanceOf(user2)
      const finalBalanceOfContract = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      assert.equal(
        InitialBalanceOfUser.toString(),
        finalBalanceOfUser.add(amountFundedByUser).toString()
      )

      assert.equal(
        finalBalanceOfContract.toString(),
        InitialBalanceOfContract.add(amountFundedByUser).toString()
      )

      await stopImpersonatingAccount(user2)
    })
    it("Goal of Crowd Funding is achieved if amount funded is greater than equal to goal ", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      time.increaseTo(START_TIME + 1)

      const InitialBalanceOfUser = await crowdFunding.balanceOf(user2)
      const InitialBalanceOfContract = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundedAmount = FUNDING_GOAL
      const submitProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, fundedAmount)
      const submitProjectProposalTx = await submitProjectProposal.wait()

      const proposalFunded = submitProjectProposalTx.events[1].args[0]
      const addressFundingTheProposal =
        submitProjectProposalTx.events[1].args[1]
      const amountFundedByUser = submitProjectProposalTx.events[1].args[2]

      assert.equal(proposalFunded.toString(), proposalId.toString())
      assert.equal(addressFundingTheProposal, user2)
      assert.equal(amountFundedByUser.toString(), fundedAmount.toString())

      const finalBalanceOfUser = await crowdFunding.balanceOf(user2)
      const finalBalanceOfContract = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      assert.equal(
        InitialBalanceOfUser.toString(),
        finalBalanceOfUser.add(amountFundedByUser).toString()
      )

      assert.equal(
        finalBalanceOfContract.toString(),
        InitialBalanceOfContract.add(amountFundedByUser).toString()
      )

      await stopImpersonatingAccount(user2)

      const viewProjectProposal = await crowdFunding.viewProjectProposal(
        proposalFunded
      )
      assert.equal(viewProjectProposal.goalStatus.toString(), "1")
    })
  })

  describe("Test Withdrawing Funds", function () {
    it("Reverts if incorrect project id is submitted", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const invalidProposalId = 9999
      const amountToBeFunded = 1000

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, amountToBeFunded)

      await expect(
        crowdFunding.withdrawFunds(invalidProposalId)
      ).to.be.revertedWith("Incorrect Project Id")

      await stopImpersonatingAccount(user2)
    })
    it("Reverts if Crowd Funding Campaign has ended", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const invalidProposalId = 9999
      const amountToBeFunded = FUNDING_GOAL

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, amountToBeFunded)

      time.increaseTo(END_TIME + 1)

      await expect(
        crowdFunding.connect(signer).withdrawFunds(proposalId)
      ).to.be.revertedWith("Crowd Funding Campaign has ended")

      await stopImpersonatingAccount(user2)
    })
    it("Reverts if Crowd Funding Campaign was not funded by the user", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const invalidProposalId = 9999
      const amountToBeFunded = FUNDING_GOAL

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      await expect(
        crowdFunding.connect(signer).withdrawFunds(proposalId)
      ).to.be.revertedWith("You have not funded the project")

      await stopImpersonatingAccount(user2)
    })
    it("Allows to refund if campaign is in progress", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const amountToBeFunded = 1000

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, amountToBeFunded)

      const balanceOfUserAfterFunding = await crowdFunding.balanceOf(user2)

      const balanceOfContractAfterFunding = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      const withdrawFunds = await crowdFunding
        .connect(signer)
        .withdrawFunds(proposalId)

      const balanceOfUserAfterWithdrawl = await crowdFunding.balanceOf(user2)

      const balanceOfContractAfterWithdrawl = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      assert.equal(
        balanceOfContractAfterWithdrawl.toString(),
        balanceOfContractAfterFunding.sub(amountToBeFunded).toString()
      )
      assert.equal(
        balanceOfUserAfterWithdrawl.toString(),
        balanceOfUserAfterFunding.add(amountToBeFunded).toString()
      )
      await stopImpersonatingAccount(user2)
    })
    it("Sets goal status back to initiated if goal was met but withdrawal done befor end date", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureAndCreateCrowdFundingCampaign
        )

      const amountToBeFunded = FUNDING_GOAL

      await impersonateAccount(user2)

      const signer = await ethers.getSigner(user2)

      const fundProjectProposal = await crowdFunding
        .connect(signer)
        .fundProjectProposal(proposalId, amountToBeFunded)

      const balanceOfUserAfterFunding = await crowdFunding.balanceOf(user2)

      const balanceOfContractAfterFunding = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      const goalStatusAfterFunding = (
        await crowdFunding.viewProjectProposal(proposalId)
      ).goalStatus

      const withdrawFunds = await crowdFunding
        .connect(signer)
        .withdrawFunds(proposalId)

      const balanceOfUserAfterWithdrawl = await crowdFunding.balanceOf(user2)

      const balanceOfContractAfterWithdrawl = await crowdFunding.balanceOf(
        crowdFunding.address
      )

      const goalStatusAfterWithdrawl = (
        await crowdFunding.viewProjectProposal(proposalId)
      ).goalStatus

      assert.equal(
        balanceOfContractAfterWithdrawl.toString(),
        balanceOfContractAfterFunding.sub(amountToBeFunded).toString()
      )
      assert.equal(
        balanceOfUserAfterWithdrawl.toString(),
        balanceOfUserAfterFunding.add(amountToBeFunded).toString()
      )

      assert.equal(goalStatusAfterFunding.toString(), "1")

      assert.equal(goalStatusAfterWithdrawl.toString(), "0")
      await stopImpersonatingAccount(user2)
    })
  })

  describe("Test Transferring Funds to Project Owner", function () {
    it("Only Project Owner can withdraw funds", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )

      await expect(
        crowdFunding.transferFundsToProjectOwner(proposalId)
      ).to.be.revertedWith("Only Project Owner Authorized")
    })

    it("Reverts if incorrect project id is submitted", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )
      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)
      const invalidProposalId = 9999
      await expect(
        crowdFunding
          .connect(signer)
          .transferFundsToProjectOwner(invalidProposalId)
      ).to.be.revertedWith("Incorrect Project Id")

      await stopImpersonatingAccount(user)
    })

    it("Reverts if not owner of campaign", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )

      const addProjectOwner = await crowdFunding.addProjectOwner(user3)
      await addProjectOwner.wait()

      await impersonateAccount(user3)

      const signer = await ethers.getSigner(user3)

      await expect(
        crowdFunding.connect(signer).transferFundsToProjectOwner(proposalId)
      ).to.be.revertedWith("Not the Owner of Campaign")

      await stopImpersonatingAccount(user3)
    })

    it("Reverts if time of withdrawal less than end time", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      await expect(
        crowdFunding.connect(signer).transferFundsToProjectOwner(proposalId)
      ).to.be.revertedWith("Crowd Funding Campaign has not ended")

      await stopImpersonatingAccount(user)
    })

    it("Reverts if funding goal not achieved", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)
      time.increaseTo(END_TIME + 1)
      await expect(
        crowdFunding.connect(signer).transferFundsToProjectOwner(proposalId)
      ).to.be.revertedWith("Campaign goal not achieved")

      await stopImpersonatingAccount(user)
    })
    it("Successful withdrawal if project owner executes the function and funding goal is achieved", async function () {
      const { deployer, user, user2, user3, crowdFunding, proposalId } =
        await loadFixture(
          deployCrowdFundingFixtureCreateCrowdFundingCampaignAndFundIt
        )

      await impersonateAccount(user3)

      const signer3 = await ethers.getSigner(user3)
      const fundProjectProposal = await crowdFunding
        .connect(signer3)
        .fundProjectProposal(proposalId, FUNDING_GOAL)
      const fundProjectProposalTx = await fundProjectProposal.wait()

      await stopImpersonatingAccount(user3)

      const totalFundsInCampaign = (
        await crowdFunding.viewProjectProposal(proposalId)
      ).fundsRecieved

      const statusOfCampaign = (
        await crowdFunding.viewProjectProposal(proposalId)
      ).goalStatus

      const balanceOfProjectOwneBefore = await crowdFunding.balanceOf(user)

      await impersonateAccount(user)

      const signer = await ethers.getSigner(user)

      time.increaseTo(END_TIME + 1)
      const transferFundsToProjectOwner = await crowdFunding
        .connect(signer)
        .transferFundsToProjectOwner(proposalId)
      const transferFundsToProjectOwnertx =
        await transferFundsToProjectOwner.wait()

      await stopImpersonatingAccount(user)

      assert.equal(statusOfCampaign, "1")

      const balanceOfProjectOwnerAfter = await crowdFunding.balanceOf(user)

      assert.equal(
        balanceOfProjectOwneBefore.add(totalFundsInCampaign).toString(),
        balanceOfProjectOwnerAfter.toString()
      )
    })
  })
})
