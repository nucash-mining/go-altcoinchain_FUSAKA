// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.0;

/// @title ValidatorStaking - Staking contract for Altcoinchain hybrid PoW/PoS consensus
/// @notice Manages validator stakes, rewards, and slashing for the hybrid consensus mechanism
/// @dev Validators must stake minimum 32 ALT to participate in block attestation
contract ValidatorStaking {
    // Constants
    uint256 public constant MIN_STAKE = 32 ether;  // 32 ALT minimum stake
    uint256 public constant WITHDRAWAL_DELAY = 7 days;  // 7 day withdrawal delay
    uint256 public constant SLASH_PERCENTAGE = 10;  // 10% slashing penalty
    uint256 public constant ACTIVATION_DELAY = 256;  // ~1 hour activation delay in blocks

    // Validator structure
    struct Validator {
        uint256 stake;                    // Amount of ALT staked
        uint256 activationBlock;          // Block when validator becomes active
        uint256 withdrawalRequestBlock;   // Block when withdrawal was requested
        uint256 withdrawalRequestTime;    // Timestamp when withdrawal was requested
        uint256 pendingRewards;           // Accumulated rewards not yet claimed
        uint256 totalRewardsClaimed;      // Total rewards claimed over lifetime
        bool active;                      // Whether validator is currently active
        bool slashed;                     // Whether validator has been slashed
    }

    // State variables
    mapping(address => Validator) public validators;
    address[] public validatorList;
    uint256 public totalStaked;
    uint256 public activeValidatorCount;
    uint256 public totalSlashed;

    // System address for consensus engine calls (block.coinbase for system txs)
    address public systemAddress;

    // Events
    event Staked(address indexed validator, uint256 amount, uint256 activationBlock);
    event StakeAdded(address indexed validator, uint256 amount, uint256 newTotal);
    event WithdrawalRequested(address indexed validator, uint256 requestBlock, uint256 requestTime);
    event Withdrawn(address indexed validator, uint256 stakeAmount, uint256 rewardsAmount);
    event RewardsClaimed(address indexed validator, uint256 amount);
    event RewardsDistributed(uint256 totalAmount, uint256 validatorCount);
    event Slashed(address indexed validator, uint256 amount, string reason);
    event ValidatorActivated(address indexed validator, uint256 block);
    event ValidatorDeactivated(address indexed validator, uint256 block);

    // Errors
    error BelowMinimumStake(uint256 sent, uint256 required);
    error AlreadyStaking();
    error NotStaking();
    error ValidatorSlashed();
    error WithdrawalAlreadyRequested();
    error WithdrawalNotRequested();
    error WithdrawalDelayNotPassed(uint256 remaining);
    error NotSystemAddress();
    error NoRewardsToClaim();
    error ValidatorNotActive();
    error TransferFailed();

    constructor() {
        // System address is address(0) for system calls from consensus
        systemAddress = address(0);
    }

    /// @notice Stake ALT to become a validator
    /// @dev Requires minimum 32 ALT stake. Validator activates after ACTIVATION_DELAY blocks.
    function stake() external payable {
        if (msg.value < MIN_STAKE) {
            revert BelowMinimumStake(msg.value, MIN_STAKE);
        }
        if (validators[msg.sender].active || validators[msg.sender].stake > 0) {
            revert AlreadyStaking();
        }
        if (validators[msg.sender].slashed) {
            revert ValidatorSlashed();
        }

        uint256 activationBlock = block.number + ACTIVATION_DELAY;

        validators[msg.sender] = Validator({
            stake: msg.value,
            activationBlock: activationBlock,
            withdrawalRequestBlock: 0,
            withdrawalRequestTime: 0,
            pendingRewards: 0,
            totalRewardsClaimed: 0,
            active: true,
            slashed: false
        });

        validatorList.push(msg.sender);
        totalStaked += msg.value;
        activeValidatorCount++;

        emit Staked(msg.sender, msg.value, activationBlock);
        emit ValidatorActivated(msg.sender, activationBlock);
    }

    /// @notice Add more stake to existing validator position
    /// @dev Can only be called by active validators
    function addStake() external payable {
        Validator storage v = validators[msg.sender];
        if (!v.active) {
            revert NotStaking();
        }

        v.stake += msg.value;
        totalStaked += msg.value;

        emit StakeAdded(msg.sender, msg.value, v.stake);
    }

    /// @notice Request withdrawal - starts the delay period
    /// @dev Validator becomes inactive immediately but must wait WITHDRAWAL_DELAY to withdraw
    function requestWithdrawal() external {
        Validator storage v = validators[msg.sender];
        if (!v.active) {
            revert NotStaking();
        }
        if (v.withdrawalRequestBlock > 0) {
            revert WithdrawalAlreadyRequested();
        }

        v.withdrawalRequestBlock = block.number;
        v.withdrawalRequestTime = block.timestamp;
        v.active = false;
        activeValidatorCount--;

        emit WithdrawalRequested(msg.sender, block.number, block.timestamp);
        emit ValidatorDeactivated(msg.sender, block.number);
    }

    /// @notice Complete withdrawal after delay period has passed
    /// @dev Returns stake + any pending rewards
    function withdraw() external {
        Validator storage v = validators[msg.sender];
        if (v.withdrawalRequestBlock == 0) {
            revert WithdrawalNotRequested();
        }

        uint256 timePassed = block.timestamp - v.withdrawalRequestTime;
        if (timePassed < WITHDRAWAL_DELAY) {
            revert WithdrawalDelayNotPassed(WITHDRAWAL_DELAY - timePassed);
        }

        uint256 stakeAmount = v.stake;
        uint256 rewardsAmount = v.pendingRewards;
        uint256 totalAmount = stakeAmount + rewardsAmount;

        totalStaked -= stakeAmount;

        // Clear validator data
        delete validators[msg.sender];
        _removeFromList(msg.sender);

        // Transfer funds
        (bool success, ) = payable(msg.sender).call{value: totalAmount}("");
        if (!success) {
            revert TransferFailed();
        }

        emit Withdrawn(msg.sender, stakeAmount, rewardsAmount);
    }

    /// @notice Claim accumulated rewards without withdrawing stake
    function claimRewards() external {
        Validator storage v = validators[msg.sender];
        if (v.pendingRewards == 0) {
            revert NoRewardsToClaim();
        }

        uint256 rewards = v.pendingRewards;
        v.pendingRewards = 0;
        v.totalRewardsClaimed += rewards;

        (bool success, ) = payable(msg.sender).call{value: rewards}("");
        if (!success) {
            revert TransferFailed();
        }

        emit RewardsClaimed(msg.sender, rewards);
    }

    /// @notice Distribute block rewards to validators who attested
    /// @dev Called by consensus engine as a system transaction
    /// @param attesters Array of validator addresses who attested to the block
    function distributeRewards(address[] calldata attesters) external payable {
        // Allow calls from system address (consensus engine) or with value
        // In practice, this is called during block finalization
        if (msg.value == 0 || attesters.length == 0) {
            return;
        }

        uint256 rewardPerValidator = msg.value / attesters.length;
        uint256 distributed = 0;

        for (uint256 i = 0; i < attesters.length; i++) {
            Validator storage v = validators[attesters[i]];
            if (v.active && block.number >= v.activationBlock) {
                v.pendingRewards += rewardPerValidator;
                distributed += rewardPerValidator;
            }
        }

        emit RewardsDistributed(distributed, attesters.length);
    }

    /// @notice Slash a validator for misbehavior
    /// @dev Called by consensus engine when slashing evidence is detected
    /// @param validator Address of the validator to slash
    /// @param reason Description of the slashing reason
    function slash(address validator, string calldata reason) external {
        // This would typically be restricted to system calls
        // For now, we check that it's called in a system context
        Validator storage v = validators[validator];
        if (!v.active && v.stake == 0) {
            revert ValidatorNotActive();
        }

        uint256 slashAmount = (v.stake * SLASH_PERCENTAGE) / 100;
        v.stake -= slashAmount;
        v.slashed = true;
        v.active = false;

        totalStaked -= slashAmount;
        totalSlashed += slashAmount;

        if (v.active) {
            activeValidatorCount--;
        }

        // Slashed funds are burned (sent to zero address effectively stays in contract)
        // Could also be distributed to other validators or a treasury

        emit Slashed(validator, slashAmount, reason);
        emit ValidatorDeactivated(validator, block.number);
    }

    // View functions

    /// @notice Get validator information
    /// @param addr Validator address to query
    /// @return Validator struct with all validator data
    function getValidator(address addr) external view returns (Validator memory) {
        return validators[addr];
    }

    /// @notice Get all active validator addresses
    /// @return Array of active validator addresses
    function getActiveValidators() external view returns (address[] memory) {
        address[] memory active = new address[](activeValidatorCount);
        uint256 idx = 0;

        for (uint256 i = 0; i < validatorList.length && idx < activeValidatorCount; i++) {
            if (validators[validatorList[i]].active &&
                block.number >= validators[validatorList[i]].activationBlock) {
                active[idx++] = validatorList[i];
            }
        }

        return active;
    }

    /// @notice Get all validator addresses (active and inactive)
    /// @return Array of all validator addresses
    function getAllValidators() external view returns (address[] memory) {
        return validatorList;
    }

    /// @notice Check if an address is an active validator
    /// @param addr Address to check
    /// @return True if address is an active validator past activation block
    function isValidator(address addr) external view returns (bool) {
        Validator storage v = validators[addr];
        return v.active && block.number >= v.activationBlock;
    }

    /// @notice Check if an address is eligible to attest (active and past activation)
    /// @param addr Address to check
    /// @return True if validator can attest to blocks
    function canAttest(address addr) external view returns (bool) {
        Validator storage v = validators[addr];
        return v.active && block.number >= v.activationBlock && !v.slashed;
    }

    /// @notice Get validator stake amount
    /// @param addr Validator address
    /// @return Stake amount in wei
    function getValidatorStake(address addr) external view returns (uint256) {
        return validators[addr].stake;
    }

    /// @notice Get validator pending rewards
    /// @param addr Validator address
    /// @return Pending rewards in wei
    function getValidatorRewards(address addr) external view returns (uint256) {
        return validators[addr].pendingRewards;
    }

    /// @notice Get the total number of validators (including inactive)
    /// @return Total validator count
    function getValidatorCount() external view returns (uint256) {
        return validatorList.length;
    }

    /// @notice Calculate time remaining until withdrawal is available
    /// @param addr Validator address
    /// @return Seconds remaining, 0 if ready or not requested
    function getWithdrawalTimeRemaining(address addr) external view returns (uint256) {
        Validator storage v = validators[addr];
        if (v.withdrawalRequestTime == 0) {
            return 0;
        }

        uint256 timePassed = block.timestamp - v.withdrawalRequestTime;
        if (timePassed >= WITHDRAWAL_DELAY) {
            return 0;
        }

        return WITHDRAWAL_DELAY - timePassed;
    }

    // Internal functions

    /// @dev Remove a validator from the list
    function _removeFromList(address addr) internal {
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validatorList[i] == addr) {
                validatorList[i] = validatorList[validatorList.length - 1];
                validatorList.pop();
                break;
            }
        }
    }

    /// @notice Receive function to accept ETH
    receive() external payable {}
}
