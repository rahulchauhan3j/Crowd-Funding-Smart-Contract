// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title Crowd Funding Platform Smart Contract
/// @author Rahul Chauhan
/// @notice A crowdfunding platform where project owners can initiate their crowdfunding campaigns.
///         Funds are recieved in form of ERC20 tokens.
///         This is an upgradeable contract.
contract CrowdFunding is Initializable, ERC20Upgradeable, OwnableUpgradeable {
  ///Mapping of valid project owners.Only Project Owners can submit crowdfunding project proposal.
  mapping(address => bool) projectOwners;

  /// enum to track status of crowdFundingProject
  enum goal {
    initiated,
    achieved,
    cancelled,
    failed
  }

  /// structure to store crowdfunding project attributes
  struct crowdFundingProject {
    address projectOwner; // owner of crowdfunding project
    string projectName; // name of project
    uint256 fundingGoal; // funding goal set by projectowner
    uint256 startTime; // start time of crowd funding project campaign
    uint256 endTime; // end time of crowdfunding project campaign
    uint256 fundsRecieved; // funds recieved so far
    goal goalStatus; // track if goal is met or not
  }

  /// list of crowdfunding projects
  crowdFundingProject[] crowdFundingProjects;

  /// Mapping to quickly check if crowd funding project with a particular index is valid
  mapping(uint256 => bool) crowdFundingProjectExists;

  /// Mappping of user address => crowdFundingProjectsIndex => fund send by user.
  /// Keeps track of how much each crowdfunding project is funded by the user.
  mapping(address => mapping(uint256 => uint256)) userFunds;

  /// decimals in ERC20 tokens
  uint8 decimalsERC20;

  /**** EVENTS */

  /// Event emitted when a project owner is added.
  event projectOwnerAdded(address _projectOwner);

  /// Event emitted when a project owner submits a crowd funding project proposal
  event projectProposalSubmitted(uint256 _index);

  /// Event emitted when a project proposal is cancelled
  event projectProposalCancelled(uint256 _index);

  /// Event emitted when a project proposal is funded
  event projectProposalFunded(uint256 _index, address _addr, uint256 _amount);

  /// Event emitted when fund is withdrawn from a project proposal
  event fundsWithdrawn(uint256 _index, address _addr, uint256 _amount);

  /// Event emitted when fund is transferred to project owner upon successful completion of the campaign
  event fundsTransferredToProjectOwner(
    uint256 _index,
    address _addr,
    uint256 _amount
  );

  /**** MODIFIERS */

  /// Modifier to validate that message sender is project owner
  modifier onlyProjectOwners() {
    require(projectOwners[msg.sender] == true, "Only Project Owner Authorized");
    _;
  }

  /// @custom:oz-upgrades-unsafe-allow constructor
  constructor() {
    _disableInitializers();
  }

  function initialize(
    string calldata _tokenName,
    string calldata _tokenSymbol,
    uint8 _decimals
  ) public initializer {
    __ERC20_init(_tokenName, _tokenSymbol);
    __Ownable_init();
    decimalsERC20 = _decimals;
  }

  /// Function to return decimal values in ERC 20 tokens.
  /// This function overrides the parent implementation which
  /// always returns 18 as decimals
  function decimals() public view override returns (uint8) {
    return decimalsERC20;
  }

  /// Function to Mint ERC 20
  /// @param to (address to whom tokens are to be minted)
  /// @param amount (amount of tokens to be minted)
  function mint(address to, uint256 amount) public virtual onlyOwner {
    _mint(to, amount);
  }

  /// Function to add project owner who can submit project proposal. Emits an event after adding project owner.
  /// @param _owner (Address of Project Owner)
  function addProjectOwner(address _owner) public virtual onlyOwner {
    require(projectOwners[_owner] == false, "Project Owner Already Exists");
    projectOwners[_owner] = true;
    emit projectOwnerAdded(_owner);
  }

  /// Function to check if the entered address is a valid project owner
  /// @param _owner (Address of Project Owner)
  function isProjectOwner(address _owner) public view returns (bool) {
    return projectOwners[_owner];
  }

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
  ) public virtual onlyProjectOwners {
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

  /// Function to View Details of Crowd Funding Proposal (if it exists).
  /// @param _index (project index)
  function viewProjectProposal(
    uint256 _index
  ) public view returns (crowdFundingProject memory) {
    require(crowdFundingProjectExists[_index] == true, "Incorrect Project Id");

    return crowdFundingProjects[_index];
  }

  /// Function to cancel crowd funding project proposal. Only the Owner or Project Owner of campaign can cancel the proposal.
  /// @param _index (project index)
  function cancelProjectProposal(uint256 _index) public virtual {
    require(crowdFundingProjectExists[_index] == true, "Incorrect Project Id");
    require(
      crowdFundingProjects[_index].projectOwner == msg.sender ||
        owner() == msg.sender,
      "Only owner or project owner can take this action"
    );

    crowdFundingProjects[_index].goalStatus = goal.cancelled;

    emit projectProposalCancelled(_index);
  }

  /// Function to add amount to crowd funding project proposal. Users with ERC20 tokens can pledge funds if crowd
  /// funding campaign is in progress. This function also checks if the funding goal is met and if so, then it sets the status of
  /// goal to achieved.
  /// @param _index (project index)
  /// @param _amount (pledged amount)
  function fundProjectProposal(uint256 _index, uint256 _amount) public virtual {
    require(crowdFundingProjectExists[_index] == true, "Incorrect Project Id");

    crowdFundingProject memory project;
    project = crowdFundingProjects[_index];

    require(
      block.timestamp >= project.startTime,
      "Crowd Funding Campaign has not started"
    );
    require(
      block.timestamp <= project.endTime,
      "Crowd Funding Campaign has ended"
    );
    require(
      project.goalStatus == goal.initiated,
      "Crowd Funding Campaign is either completed or cancelled or failed"
    );

    crowdFundingProjects[_index].fundsRecieved += _amount;

    if (
      crowdFundingProjects[_index].fundsRecieved >=
      crowdFundingProjects[_index].fundingGoal
    ) {
      crowdFundingProjects[_index].goalStatus = goal.achieved;
    }

    userFunds[msg.sender][_index] += _amount;
    transfer(address(this), _amount);

    emit projectProposalFunded(_index, msg.sender, _amount);
  }

  /// Function to enable users to withdraw funds if crowd funding campaign is in progress or if it is cancelled/failed.
  /// Fund cannot be withdrawn if crowd funding campaign was successful and end time is reachedß.
  /// This function also sets the crowd funding campaign status appropriately if pledged fund fall below the goal.
  /// @param _index (project index)
  function withdrawFunds(uint256 _index) public virtual {
    require(crowdFundingProjectExists[_index] == true, "Incorrect Project Id");

    crowdFundingProject memory project;
    project = crowdFundingProjects[_index];

    require(
      block.timestamp <= project.endTime ||
        (block.timestamp >= project.endTime &&
          project.goalStatus != goal.achieved),
      "Crowd Funding Campaign has ended"
    );

    require(
      userFunds[msg.sender][_index] > 0,
      "You have not funded the project"
    );

    uint256 amountToBeWithdrawn = userFunds[msg.sender][_index];

    userFunds[msg.sender][_index] = 0;

    crowdFundingProjects[_index].fundsRecieved -= amountToBeWithdrawn;

    if (
      crowdFundingProjects[_index].fundsRecieved <
      crowdFundingProjects[_index].fundingGoal
    ) {
      crowdFundingProjects[_index].goalStatus = goal.initiated;
    }

    _transfer(address(this), msg.sender, amountToBeWithdrawn);

    emit fundsWithdrawn(_index, msg.sender, amountToBeWithdrawn);
  }

  /// Function to transfer funds to project owner upon successful completion of the campaign.
  /// This function can be called by valid project owner and will transfer funds only if the campaign goal is achieved and
  /// current time is greater than end time of campaign.
  /// @param _index (project index)
  function transferFundsToProjectOwner(
    uint256 _index
  ) public virtual onlyProjectOwners {
    require(crowdFundingProjectExists[_index] == true, "Incorrect Project Id");

    crowdFundingProject memory project;
    project = crowdFundingProjects[_index];

    require(project.projectOwner == msg.sender, "Not the Owner of Campaign");

    require(
      block.timestamp >= project.endTime,
      "Crowd Funding Campaign has not ended"
    );

    require(project.goalStatus == goal.achieved, "Campaign goal not achieved");

    uint256 amountToBeTransferred = project.fundsRecieved;

    crowdFundingProjects[_index].fundsRecieved = 0;

    _transfer(address(this), msg.sender, amountToBeTransferred);

    emit fundsTransferredToProjectOwner(
      _index,
      msg.sender,
      amountToBeTransferred
    );
  }
}
