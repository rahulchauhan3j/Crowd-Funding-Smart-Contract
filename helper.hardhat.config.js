const TOKEN_NAME = "Company Tokens"
const TOKEN_SYMBOL = "CTK1"
const TOKEN_DECIMALS = 3

const PROJECT_NAME = "Project A"
const FUNDING_GOAL = 2000
const START_TIME = Date.now() + 20000
const END_TIME = Date.now() + 40000

const GO_FORWARD_IN_TIME = Date.now() + 9999999999999999999999999999

const GOAL_STATUS = {
  0: "initiated",
  1: "achieved",
  2: "cancelled",
  3: "failed",
}

module.exports = {
  TOKEN_NAME,
  TOKEN_SYMBOL,
  TOKEN_DECIMALS,
  PROJECT_NAME,
  FUNDING_GOAL,
  START_TIME,
  END_TIME,
  GOAL_STATUS,
  GO_FORWARD_IN_TIME,
}
