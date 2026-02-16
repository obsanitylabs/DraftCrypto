// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title UNITEStaking
/// @notice Stake UNITE tokens to unlock tier-gated features in Fantasy Crypto.
///         Tiers: Fun (1K), Serious (10K), Whale (100K).
///         7-day cooldown on unstake to prevent tier-gaming.
///         Tier queries are on-chain so the Vault and other contracts can check.
/// @dev    UNITE token: 0xb14448B48452D7bA076aBeb3c505Fc044DEAF4E9 on Arbitrum
contract UNITEStaking is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════
    // Types
    // ═══════════════════════════════════════════════════

    enum Tier { NONE, FUN, SERIOUS, WHALE }

    struct StakeInfo {
        uint256 stakedAmount;
        uint256 unstakeRequestAmount;
        uint64  unstakeRequestTime;
        uint64  firstStakedAt;
    }

    // ═══════════════════════════════════════════════════
    // State
    // ═══════════════════════════════════════════════════

    IERC20 public immutable unite;

    uint256 public constant WHALE_THRESHOLD   = 100_000 ether;   // 100K UNITE
    uint256 public constant SERIOUS_THRESHOLD =  10_000 ether;   // 10K UNITE
    uint256 public constant FUN_THRESHOLD     =   1_000 ether;   // 1K UNITE

    uint256 public unstakeCooldown = 7 days;
    uint256 public constant MIN_COOLDOWN = 1 days;
    uint256 public constant MAX_COOLDOWN = 30 days;

    mapping(address => StakeInfo) public stakes;
    uint256 public totalStaked;
    uint256 public totalStakers;

    // ═══════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════

    event Staked(address indexed user, uint256 amount, Tier newTier);
    event UnstakeRequested(address indexed user, uint256 amount, uint256 unlockTime);
    event UnstakeCompleted(address indexed user, uint256 amount, Tier newTier);
    event UnstakeCancelled(address indexed user, uint256 amount);
    event CooldownUpdated(uint256 oldCooldown, uint256 newCooldown);
    event EmergencyWithdraw(address token, uint256 amount);

    // ═══════════════════════════════════════════════════
    // Errors
    // ═══════════════════════════════════════════════════

    error ZeroAmount();
    error InsufficientStake();
    error NoPendingUnstake();
    error CooldownNotExpired(uint256 unlockTime);
    error UnstakeAlreadyPending();
    error InvalidCooldown();
    error ZeroAddress();

    // ═══════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════

    constructor(address _unite) Ownable(msg.sender) {
        if (_unite == address(0)) revert ZeroAddress();
        unite = IERC20(_unite);
    }

    // ═══════════════════════════════════════════════════
    // Staking
    // ═══════════════════════════════════════════════════

    /// @notice Stake UNITE tokens to increase tier
    /// @param amount Amount of UNITE to stake (18 decimals)
    function stake(uint256 amount) external nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();

        unite.safeTransferFrom(msg.sender, address(this), amount);

        StakeInfo storage s = stakes[msg.sender];
        if (s.stakedAmount == 0) {
            s.firstStakedAt = uint64(block.timestamp);
            totalStakers++;
        }
        s.stakedAmount += amount;
        totalStaked += amount;

        emit Staked(msg.sender, amount, getTier(msg.sender));
    }

    /// @notice Request to unstake (starts cooldown)
    /// @param amount Amount to unstake
    function requestUnstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();

        StakeInfo storage s = stakes[msg.sender];
        if (s.stakedAmount < amount) revert InsufficientStake();
        if (s.unstakeRequestAmount > 0) revert UnstakeAlreadyPending();

        s.unstakeRequestAmount = amount;
        s.unstakeRequestTime = uint64(block.timestamp);

        uint256 unlockTime = block.timestamp + unstakeCooldown;
        emit UnstakeRequested(msg.sender, amount, unlockTime);
    }

    /// @notice Complete unstake after cooldown expires
    function completeUnstake() external nonReentrant {
        StakeInfo storage s = stakes[msg.sender];
        if (s.unstakeRequestAmount == 0) revert NoPendingUnstake();

        uint256 unlockTime = uint256(s.unstakeRequestTime) + unstakeCooldown;
        if (block.timestamp < unlockTime) revert CooldownNotExpired(unlockTime);

        uint256 amount = s.unstakeRequestAmount;
        s.stakedAmount -= amount;
        s.unstakeRequestAmount = 0;
        s.unstakeRequestTime = 0;
        totalStaked -= amount;

        if (s.stakedAmount == 0) {
            totalStakers--;
        }

        unite.safeTransfer(msg.sender, amount);
        emit UnstakeCompleted(msg.sender, amount, getTier(msg.sender));
    }

    /// @notice Cancel pending unstake request
    function cancelUnstake() external nonReentrant {
        StakeInfo storage s = stakes[msg.sender];
        if (s.unstakeRequestAmount == 0) revert NoPendingUnstake();

        uint256 amount = s.unstakeRequestAmount;
        s.unstakeRequestAmount = 0;
        s.unstakeRequestTime = 0;

        emit UnstakeCancelled(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════
    // Tier Queries (on-chain, callable by other contracts)
    // ═══════════════════════════════════════════════════

    /// @notice Get user's current tier
    function getTier(address user) public view returns (Tier) {
        uint256 staked = stakes[user].stakedAmount;
        if (staked >= WHALE_THRESHOLD) return Tier.WHALE;
        if (staked >= SERIOUS_THRESHOLD) return Tier.SERIOUS;
        if (staked >= FUN_THRESHOLD) return Tier.FUN;
        return Tier.NONE;
    }

    /// @notice Get tier as a string (for backend convenience)
    function getTierName(address user) external view returns (string memory) {
        Tier t = getTier(user);
        if (t == Tier.WHALE) return "whale";
        if (t == Tier.SERIOUS) return "serious";
        if (t == Tier.FUN) return "fun";
        return "none";
    }

    /// @notice Check if user meets a minimum tier
    function meetsMinTier(address user, Tier minTier) external view returns (bool) {
        return getTier(user) >= minTier;
    }

    /// @notice Get maximum wager for user based on tier
    function getMaxWager(address user) external view returns (uint256) {
        Tier t = getTier(user);
        if (t == Tier.WHALE) return 10_000_000;   // 10 USDC (6 decimals)
        if (t == Tier.SERIOUS) return 2_000_000;  // 2 USDC
        if (t == Tier.FUN) return 500_000;         // 0.50 USDC
        return 0;
    }

    /// @notice Get boost allowance for user based on tier
    /// @return count Number of boosts per match
    /// @return maxMultiplier Maximum boost multiplier
    function getBoostAllowance(address user) external view returns (uint256 count, uint256 maxMultiplier) {
        Tier t = getTier(user);
        if (t == Tier.WHALE) return (2, 3);
        if (t == Tier.SERIOUS) return (1, 2);
        return (0, 1);
    }

    // ═══════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════

    /// @notice Get full stake info for a user
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 unstakeRequestAmount,
        uint256 unstakeRequestTime,
        uint256 unlockTime,
        bool canUnstake,
        Tier tier
    ) {
        StakeInfo storage s = stakes[user];
        uint256 _unlockTime = s.unstakeRequestAmount > 0
            ? uint256(s.unstakeRequestTime) + unstakeCooldown
            : 0;

        return (
            s.stakedAmount,
            s.unstakeRequestAmount,
            uint256(s.unstakeRequestTime),
            _unlockTime,
            s.unstakeRequestAmount > 0 && block.timestamp >= _unlockTime,
            getTier(user)
        );
    }

    /// @notice Get UNITE needed to reach next tier
    function uniteToNextTier(address user) external view returns (uint256 needed, Tier nextTier) {
        uint256 staked = stakes[user].stakedAmount;
        if (staked >= WHALE_THRESHOLD) return (0, Tier.WHALE);
        if (staked >= SERIOUS_THRESHOLD) return (WHALE_THRESHOLD - staked, Tier.WHALE);
        if (staked >= FUN_THRESHOLD) return (SERIOUS_THRESHOLD - staked, Tier.SERIOUS);
        return (FUN_THRESHOLD - staked, Tier.FUN);
    }

    // ═══════════════════════════════════════════════════
    // Admin
    // ═══════════════════════════════════════════════════

    /// @notice Update unstake cooldown period
    function setCooldown(uint256 newCooldown) external onlyOwner {
        if (newCooldown < MIN_COOLDOWN || newCooldown > MAX_COOLDOWN) revert InvalidCooldown();
        uint256 old = unstakeCooldown;
        unstakeCooldown = newCooldown;
        emit CooldownUpdated(old, newCooldown);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Emergency withdraw stuck tokens (not staked UNITE)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        // Prevent withdrawing staked UNITE
        if (token == address(unite)) {
            uint256 excess = unite.balanceOf(address(this)) - totalStaked;
            require(amount <= excess, "Cannot withdraw staked UNITE");
        }
        IERC20(token).safeTransfer(owner(), amount);
        emit EmergencyWithdraw(token, amount);
    }
}
