import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// ═══════════════════════════════════════════════════════
// Test Helpers
// ═══════════════════════════════════════════════════════

async function deployMockERC20(name: string, symbol: string, decimals: number) {
  // Deploy a simple mock ERC20 for testing
  const Token = await ethers.getContractFactory("MockERC20");
  return Token.deploy(name, symbol, decimals);
}

// ═══════════════════════════════════════════════════════
// FantasyCryptoVault Tests
// ═══════════════════════════════════════════════════════

describe("FantasyCryptoVault", function () {
  async function deployVaultFixture() {
    const [owner, player1, player2, treasury, other] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const usdc = await MockToken.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();

    const Vault = await ethers.getContractFactory("FantasyCryptoVault");
    const vault = await Vault.deploy(await usdc.getAddress(), treasury.address);
    await vault.waitForDeployment();

    // Mint USDC to players
    const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    await usdc.mint(player1.address, mintAmount);
    await usdc.mint(player2.address, mintAmount);

    // Approve vault
    await usdc.connect(player1).approve(await vault.getAddress(), ethers.MaxUint256);
    await usdc.connect(player2).approve(await vault.getAddress(), ethers.MaxUint256);

    return { vault, usdc, owner, player1, player2, treasury, other };
  }

  describe("Match Creation", function () {
    it("should create a match with correct wager", async function () {
      const { vault, player1 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("2", 6); // 2 USDC

      await expect(vault.connect(player1).createMatch(matchId, wager))
        .to.emit(vault, "MatchCreated")
        .withArgs(matchId, player1.address, wager);

      const match = await vault.getMatch(matchId);
      expect(match.player1).to.equal(player1.address);
      expect(match.wagerAmount).to.equal(wager);
      expect(match.status).to.equal(1); // PENDING
    });

    it("should reject duplicate match IDs", async function () {
      const { vault, player1 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("2", 6);

      await vault.connect(player1).createMatch(matchId, wager);
      await expect(vault.connect(player1).createMatch(matchId, wager))
        .to.be.revertedWithCustomError(vault, "MatchExists");
    });

    it("should reject wagers below minimum", async function () {
      const { vault, player1 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));

      await expect(vault.connect(player1).createMatch(matchId, 1000)) // 0.001 USDC
        .to.be.revertedWithCustomError(vault, "InvalidWager");
    });
  });

  describe("Match Joining", function () {
    it("should allow player2 to join and activate match", async function () {
      const { vault, player1, player2 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("2", 6);

      await vault.connect(player1).createMatch(matchId, wager);
      await expect(vault.connect(player2).joinMatch(matchId))
        .to.emit(vault, "MatchJoined");

      const match = await vault.getMatch(matchId);
      expect(match.player2).to.equal(player2.address);
      expect(match.status).to.equal(2); // ACTIVE
    });

    it("should reject self-join", async function () {
      const { vault, player1 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      await vault.connect(player1).createMatch(matchId, ethers.parseUnits("2", 6));

      await expect(vault.connect(player1).joinMatch(matchId))
        .to.be.revertedWithCustomError(vault, "CannotJoinOwn");
    });
  });

  describe("Settlement", function () {
    it("should pay winner minus 5% fee", async function () {
      const { vault, usdc, player1, player2, treasury, owner } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("10", 6); // 10 USDC

      await vault.connect(player1).createMatch(matchId, wager);
      await vault.connect(player2).joinMatch(matchId);

      const p1Before = await usdc.balanceOf(player1.address);

      await vault.connect(owner).settleMatch(matchId, player1.address);

      const p1After = await usdc.balanceOf(player1.address);
      const treasuryBal = await usdc.balanceOf(treasury.address);

      // Winner gets 20 USDC - 5% = 19 USDC
      expect(p1After - p1Before).to.equal(ethers.parseUnits("19", 6));
      expect(treasuryBal).to.equal(ethers.parseUnits("1", 6)); // 5% fee
    });

    it("should handle draw — split pot", async function () {
      const { vault, usdc, player1, player2, owner } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("10", 6);

      await vault.connect(player1).createMatch(matchId, wager);
      await vault.connect(player2).joinMatch(matchId);

      const p1Before = await usdc.balanceOf(player1.address);
      const p2Before = await usdc.balanceOf(player2.address);

      await vault.connect(owner).settleAsDraw(matchId);

      const p1After = await usdc.balanceOf(player1.address);
      const p2After = await usdc.balanceOf(player2.address);

      // Each gets (20 - 1) / 2 = 9.5 USDC
      expect(p1After - p1Before).to.equal(ethers.parseUnits("9.5", 6));
      expect(p2After - p2Before).to.equal(ethers.parseUnits("9.5", 6));
    });

    it("should reject settlement of non-active match", async function () {
      const { vault, player1, owner } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      await vault.connect(player1).createMatch(matchId, ethers.parseUnits("2", 6));

      await expect(vault.connect(owner).settleMatch(matchId, player1.address))
        .to.be.revertedWithCustomError(vault, "NotActive");
    });

    it("should reject non-owner settlement", async function () {
      const { vault, player1, player2 } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      await vault.connect(player1).createMatch(matchId, ethers.parseUnits("2", 6));
      await vault.connect(player2).joinMatch(matchId);

      await expect(vault.connect(player1).settleMatch(matchId, player1.address))
        .to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
  });

  describe("Cancellation", function () {
    it("should refund both players on active match cancel", async function () {
      const { vault, usdc, player1, player2, owner } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("5", 6);

      await vault.connect(player1).createMatch(matchId, wager);
      await vault.connect(player2).joinMatch(matchId);

      const p1Before = await usdc.balanceOf(player1.address);
      await vault.connect(owner).cancelMatch(matchId);

      const p1After = await usdc.balanceOf(player1.address);
      expect(p1After - p1Before).to.equal(wager);
    });

    it("should refund player1 on pending match cancel", async function () {
      const { vault, usdc, player1, owner } = await loadFixture(deployVaultFixture);
      const matchId = ethers.keccak256(ethers.toUtf8Bytes("match-001"));
      const wager = ethers.parseUnits("5", 6);

      await vault.connect(player1).createMatch(matchId, wager);
      const p1Before = await usdc.balanceOf(player1.address);
      await vault.connect(owner).cancelMatch(matchId);

      expect(await usdc.balanceOf(player1.address) - p1Before).to.equal(wager);
    });
  });

  describe("Admin", function () {
    it("should update platform fee", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      await vault.connect(owner).setPlatformFee(300); // 3%
      expect(await vault.platformFeeBps()).to.equal(300);
    });

    it("should reject fee above max", async function () {
      const { vault, owner } = await loadFixture(deployVaultFixture);
      await expect(vault.connect(owner).setPlatformFee(1500))
        .to.be.revertedWithCustomError(vault, "InvalidFee");
    });

    it("should pause/unpause", async function () {
      const { vault, player1, owner } = await loadFixture(deployVaultFixture);
      await vault.connect(owner).pause();

      await expect(vault.connect(player1).createMatch(
        ethers.keccak256(ethers.toUtf8Bytes("match")),
        ethers.parseUnits("2", 6),
      )).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.connect(owner).unpause();
    });
  });
});

// ═══════════════════════════════════════════════════════
// UNITEStaking Tests
// ═══════════════════════════════════════════════════════

describe("UNITEStaking", function () {
  async function deployStakingFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockERC20");
    const unite = await MockToken.deploy("UNITE Token", "UNITE", 18);
    await unite.waitForDeployment();

    const Staking = await ethers.getContractFactory("UNITEStaking");
    const staking = await Staking.deploy(await unite.getAddress());
    await staking.waitForDeployment();

    // Mint UNITE to users
    const mintAmount = ethers.parseEther("500000"); // 500K UNITE
    await unite.mint(alice.address, mintAmount);
    await unite.mint(bob.address, mintAmount);

    // Approve staking
    await unite.connect(alice).approve(await staking.getAddress(), ethers.MaxUint256);
    await unite.connect(bob).approve(await staking.getAddress(), ethers.MaxUint256);

    return { staking, unite, owner, alice, bob };
  }

  describe("Staking", function () {
    it("should stake and reach Fun tier", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("1000"));
      expect(await staking.getTierName(alice.address)).to.equal("fun");
    });

    it("should stake and reach Serious tier", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("10000"));
      expect(await staking.getTierName(alice.address)).to.equal("serious");
    });

    it("should stake and reach Whale tier", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("100000"));
      expect(await staking.getTierName(alice.address)).to.equal("whale");
    });

    it("should track total staked", async function () {
      const { staking, alice, bob } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("5000"));
      await staking.connect(bob).stake(ethers.parseEther("3000"));

      expect(await staking.totalStaked()).to.equal(ethers.parseEther("8000"));
      expect(await staking.totalStakers()).to.equal(2);
    });

    it("should reject zero stake", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);
      await expect(staking.connect(alice).stake(0))
        .to.be.revertedWithCustomError(staking, "ZeroAmount");
    });
  });

  describe("Unstaking", function () {
    it("should enforce 7-day cooldown", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("10000"));
      await staking.connect(alice).requestUnstake(ethers.parseEther("5000"));

      // Try immediately — should fail
      await expect(staking.connect(alice).completeUnstake())
        .to.be.revertedWithCustomError(staking, "CooldownNotExpired");

      // Fast forward 7 days
      await time.increase(7 * 24 * 60 * 60);

      await staking.connect(alice).completeUnstake();
      expect(await staking.getTierName(alice.address)).to.equal("fun"); // 5K staked
    });

    it("should allow cancel unstake", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("10000"));
      await staking.connect(alice).requestUnstake(ethers.parseEther("10000"));
      await staking.connect(alice).cancelUnstake();

      // Still at serious tier
      expect(await staking.getTierName(alice.address)).to.equal("serious");
    });

    it("should prevent double unstake request", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("10000"));
      await staking.connect(alice).requestUnstake(ethers.parseEther("5000"));

      await expect(staking.connect(alice).requestUnstake(ethers.parseEther("3000")))
        .to.be.revertedWithCustomError(staking, "UnstakeAlreadyPending");
    });
  });

  describe("Tier Queries", function () {
    it("should return correct boost allowance", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("100000"));
      const [count, max] = await staking.getBoostAllowance(alice.address);
      expect(count).to.equal(2);
      expect(max).to.equal(3);
    });

    it("should return correct max wager", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("10000"));
      expect(await staking.getMaxWager(alice.address)).to.equal(2_000_000); // 2 USDC
    });

    it("should calculate UNITE needed for next tier", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("5000"));
      const [needed, nextTier] = await staking.uniteToNextTier(alice.address);
      expect(needed).to.equal(ethers.parseEther("5000")); // 10K - 5K
      expect(nextTier).to.equal(2); // SERIOUS
    });

    it("should return 0 needed at max tier", async function () {
      const { staking, alice } = await loadFixture(deployStakingFixture);

      await staking.connect(alice).stake(ethers.parseEther("200000"));
      const [needed] = await staking.uniteToNextTier(alice.address);
      expect(needed).to.equal(0);
    });
  });

  describe("Admin", function () {
    it("should update cooldown within bounds", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      await staking.connect(owner).setCooldown(3 * 24 * 60 * 60); // 3 days
      expect(await staking.unstakeCooldown()).to.equal(3 * 24 * 60 * 60);
    });

    it("should reject cooldown outside bounds", async function () {
      const { staking, owner } = await loadFixture(deployStakingFixture);
      await expect(staking.connect(owner).setCooldown(100))
        .to.be.revertedWithCustomError(staking, "InvalidCooldown");
    });

    it("should prevent withdrawing staked UNITE", async function () {
      const { staking, alice, owner } = await loadFixture(deployStakingFixture);
      const uniteAddr = await staking.unite();

      await staking.connect(alice).stake(ethers.parseEther("10000"));

      await expect(staking.connect(owner).emergencyWithdraw(uniteAddr, ethers.parseEther("5000")))
        .to.be.reverted;
    });
  });
});
