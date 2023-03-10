// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./CrowdFunding.sol";

contract CrowdFundingUpgraded is CrowdFunding {
  uint256 public constant duration = 30000;

  /// Function to Submit Crowd Funding Proposal. Only Project Owner can execute this function.
  /// @param _projectName (Name of Project)
  /// @param _fundingGoal (Total Funding Expected)
  /// @param _startTime (Start Time of Crowd Funding Campaign)
  /// @param _endTime   (End Time of Crowd Funding Campaign)
  function submitProjectProposal(
    string calldata _projectName,
    uint256 _fundingGoal,
    uint256 _startTime,
    uint256 _endTime
  ) public virtual override onlyProjectOwners {
    require(_endTime > _startTime, "End Time lesser than Start Time");
    require(_endTime - _startTime <= 30000, "Invalid Duration");

    uint256 index = crowdFundingProjects.length;

    crowdFundingProjectExists[index] = true;

    crowdFundingProjects.push(
      crowdFundingProject(
        msg.sender,
        _projectName,
        _fundingGoal,
        _startTime,
        _endTime,
        0,
        goal.initiated
      )
    );

    emit projectProposalSubmitted(index);
  }
}
