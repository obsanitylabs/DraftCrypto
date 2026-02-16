// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/// @title FantasyCryptoVault
/// @notice Escrows USDC wagers for Fantasy Crypto H2H matches on Arbitrum.
///         Players deposit equal wagers. The backend settles matches by calling
///         settleMatch() with the winner address. 5% platform fee on the pot.
///         Supports cancellation (full refund) and draws (split pot minus fee).
/// @dev    Owner should be a multisig or timelock in production.
contract FantasyCryptoVault is ReentrancyGuard, Ownable2Step, Pausable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════
    // Types
    // ═══════════════════════════════════════════════════

    enum MatchStatus { NONE, PENDING, ACTIVE, SETTLED, CANCELLED, DRAW }

    struct Match {
        address player1;
        address player2;
        uint256 wagerAmount;    // per player (USDC, 6 decimals)
        MatchStatus status;
        uint64 createdAt;
        uint64 settledAt;
    }

    // ═══════════════════════════════════════════════════
    // State
    // ═══════════════════════════════════════════════════

    IERC20 public immutable usdc;
    address public treasury;
    uint256 public platformFeeBps = 500;          // 5% = 500 basis points
    uint256 public constant MAX_FEE_BPS = 1000;   // cap at 10%
    uint256 public constant MIN_WAGER = 100_000;  // 0.10 USDC (6 decimals)

    mapping(bytes32 => Match) public matches;
    uint256 public totalMatches;
    uint256 public totalVolumeUsdc;
    uint256 public totalFeesCollected;

    // ═══════════════════════════════════════════════════
    // Events
    // ═══════════════════════════════════════════════════

    event MatchCreated(bytes32 indexed matchId, address indexed player1, uint256 wagerAmount);
    event MatchJoined(bytes32 indexed matchId, address indexed player2);
    event MatchSettled(bytes32 indexed matchId, address indexed winner, uint256 payout, uint256 fee);
    event MatchDraw(bytes32 indexed matchId, uint256 splitAmount);
    event MatchCancelled(bytes32 indexed matchId);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event EmergencyWithdraw(address token, uint256 amount);

    // ═══════════════════════════════════════════════════
    // Errors
    // ═══════════════════════════════════════════════════

    error MatchExists();
    error MatchNotFound();
    error InvalidWager();
    error NotJoinable();
    error CannotJoinOwn();
    error NotActive();
    error InvalidWinner();
    error NotCancellable();
    error InvalidFee();
    error ZeroAddress();

    // ═══════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════

    /// @param _usdc USDC address on Arbitrum (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)
    /// @param _treasury Address to receive platform fees
    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        if (_usdc == address(0) || _treasury == address(0)) revert ZeroAddress();
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ═══════════════════════════════════════════════════
    // Player Functions
    // ═══════════════════════════════════════════════════

    /// @notice Create a match and deposit wager
    /// @param matchId Unique match identifier (keccak256 of match UUID)
    /// @param wagerAmount USDC amount per player (6 decimals)
    function createMatch(bytes32 matchId, uint256 wagerAmount) external nonReentrant whenNotPaused {
        if (matches[matchId].status != MatchStatus.NONE) revert MatchExists();
        if (wagerAmount < MIN_WAGER) revert InvalidWager();

        usdc.safeTransferFrom(msg.sender, address(this), wagerAmount);

        matches[matchId] = Match({
            player1: msg.sender,
            player2: address(0),
            wagerAmount: wagerAmount,
            status: MatchStatus.PENDING,
            createdAt: uint64(block.timestamp),
            settledAt: 0
        });

        totalMatches++;
        emit MatchCreated(matchId, msg.sender, wagerAmount);
    }

    /// @notice Join an existing match by depositing equal wager
    /// @param matchId Match to join
    function joinMatch(bytes32 matchId) external nonReentrant whenNotPaused {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.PENDING) revert NotJoinable();
        if (m.player1 == msg.sender) revert CannotJoinOwn();

        usdc.safeTransferFrom(msg.sender, address(this), m.wagerAmount);

        m.player2 = msg.sender;
        m.status = MatchStatus.ACTIVE;

        totalVolumeUsdc += m.wagerAmount * 2;
        emit MatchJoined(matchId, msg.sender);
    }

    // ═══════════════════════════════════════════════════
    // Settlement (Owner Only)
    // ═══════════════════════════════════════════════════

    /// @notice Settle match — pay winner minus platform fee
    /// @param matchId Match to settle
    /// @param winner Address of the winning player
    function settleMatch(bytes32 matchId, address winner) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.ACTIVE) revert NotActive();
        if (winner != m.player1 && winner != m.player2) revert InvalidWinner();

        uint256 totalPot = m.wagerAmount * 2;
        uint256 fee = (totalPot * platformFeeBps) / 10_000;
        uint256 payout = totalPot - fee;

        m.status = MatchStatus.SETTLED;
        m.settledAt = uint64(block.timestamp);

        totalFeesCollected += fee;

        usdc.safeTransfer(winner, payout);
        if (fee > 0) {
            usdc.safeTransfer(treasury, fee);
        }

        emit MatchSettled(matchId, winner, payout, fee);
    }

    /// @notice Settle as draw — split pot minus fee equally
    /// @param matchId Match to settle as draw
    function settleAsDraw(bytes32 matchId) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.ACTIVE) revert NotActive();

        uint256 totalPot = m.wagerAmount * 2;
        uint256 fee = (totalPot * platformFeeBps) / 10_000;
        uint256 splitAmount = (totalPot - fee) / 2;

        m.status = MatchStatus.DRAW;
        m.settledAt = uint64(block.timestamp);

        totalFeesCollected += fee;

        usdc.safeTransfer(m.player1, splitAmount);
        usdc.safeTransfer(m.player2, splitAmount);
        if (fee > 0) {
            usdc.safeTransfer(treasury, fee);
        }

        // Handle dust (1 wei if odd)
        uint256 dust = totalPot - fee - (splitAmount * 2);
        if (dust > 0) {
            usdc.safeTransfer(treasury, dust);
        }

        emit MatchDraw(matchId, splitAmount);
    }

    /// @notice Cancel match — full refund to both players
    /// @param matchId Match to cancel
    function cancelMatch(bytes32 matchId) external onlyOwner nonReentrant {
        Match storage m = matches[matchId];
        if (m.status != MatchStatus.PENDING && m.status != MatchStatus.ACTIVE) {
            revert NotCancellable();
        }

        MatchStatus prevStatus = m.status;
        m.status = MatchStatus.CANCELLED;
        m.settledAt = uint64(block.timestamp);

        usdc.safeTransfer(m.player1, m.wagerAmount);
        if (prevStatus == MatchStatus.ACTIVE) {
            usdc.safeTransfer(m.player2, m.wagerAmount);
        }

        emit MatchCancelled(matchId);
    }

    // ═══════════════════════════════════════════════════
    // Admin Functions
    // ═══════════════════════════════════════════════════

    /// @notice Update platform fee (basis points)
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        uint256 oldFee = platformFeeBps;
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(oldFee, newFeeBps);
    }

    /// @notice Update treasury address
    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert ZeroAddress();
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    /// @notice Pause all deposits and joins
    function pause() external onlyOwner { _pause(); }

    /// @notice Unpause
    function unpause() external onlyOwner { _unpause(); }

    /// @notice Emergency withdraw any ERC20 (for stuck tokens)
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(treasury, amount);
        emit EmergencyWithdraw(token, amount);
    }

    // ═══════════════════════════════════════════════════
    // View Functions
    // ═══════════════════════════════════════════════════

    function getMatch(bytes32 matchId) external view returns (Match memory) {
        return matches[matchId];
    }

    function getMatchPlayers(bytes32 matchId) external view returns (address, address) {
        Match storage m = matches[matchId];
        return (m.player1, m.player2);
    }

    function isMatchActive(bytes32 matchId) external view returns (bool) {
        return matches[matchId].status == MatchStatus.ACTIVE;
    }
}
