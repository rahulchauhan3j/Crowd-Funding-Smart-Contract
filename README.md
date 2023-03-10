# Sample Hardhat Project

## Background

Imagine that you, or your company, want to create the next billion-dollar idea. Way to go!

One problem: you need more funds to support the development, marketing, and launch.
To source the initial funds, you use a crowdfunding platform and share your idea for
fundraising.

A good crowdfunding platform can help your community and your users become
shareholders in your project. Web3 is a perfect technology to help build this crowdfunding
platform and campaign.

## Challenge

Create a crowdfunding campaign where users can pledge and claim funds to, and claim
funds from, the contract.

## Contract(s) should be written such that:

Funds take the form of a custom ERC20 token - create your own token for an added challenge.
Each crowdfunded project should have a funding goal
When a funding goal is not met, customers can get a refund of their pledged funds

## Teachnical Overview

contracts/CrowdFunding.sol is the solidity contract which in upgradeable. It allows creation of crowd funding campaigns. Project Owners create
campaigns and Users with ERC20 tokens can fund those campaigns. Once funding goals are achived by campaigns then Project Owners can withdraw ERC20 tokens funded
for campaigns. If campaign fails the users can withdraw the amount they funded.

contracts/CrowdFundingUpgraded.sol is the upgraded version of CrowdFunding.sol. It has been created to show the upgradeability feature. The only added functionality of this
contract is that it has additional checks on the duration of crowd funding campaigns.

test/01-test-crowd-funding.js is the test script for contracts/CrowdFunding.sol.

test/02-test-crowd-funding-upgraded.js is the test script for contracts/contracts/CrowdFundingUpgraded.sol

Above test scripts can be executed using

```shell
yarn hardhat test
```

scripts/upgradeContract.js is the script which shows end to end business flow from contract creation to the moment campaign ends and funds are transferred to project owner.
This script also demonstrates upgradeability feature. This script can be run using -

```shell
yarn hardhat run ./scripts/upgradeContract.js
```

## Install

After cloning the repository do npm install or yarn.This will install all dependencies.

And then you can compile contracts using yarn hardhat compile
