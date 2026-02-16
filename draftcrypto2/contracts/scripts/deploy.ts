import { ethers, run, network } from "hardhat";

// Arbitrum Mainnet addresses
const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
const UNITE_ARBITRUM = "0xb14448B48452D7bA076aBeb3c505Fc044DEAF4E9";

// Testnet: use mock tokens or deploy your own
const USDC_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Arbitrum Sepolia USDC
const UNITE_SEPOLIA = ""; // Deploy a test ERC20

async function main() {
  const [deployer] = await ethers.getSigners();
  const isMainnet = network.name === "arbitrum";

  console.log("═══════════════════════════════════════════");
  console.log("DraftCrypto — Contract Deployment");
  console.log("═══════════════════════════════════════════");
  console.log(`Network:  ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("");

  const USDC = isMainnet ? USDC_ARBITRUM : USDC_SEPOLIA;
  const UNITE = isMainnet ? UNITE_ARBITRUM : UNITE_SEPOLIA;

  // ── Deploy FantasyCryptoVault ──
  console.log("Deploying FantasyCryptoVault...");
  const Vault = await ethers.getContractFactory("FantasyCryptoVault");
  const vault = await Vault.deploy(USDC, deployer.address); // treasury = deployer initially
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log(`  ✓ FantasyCryptoVault: ${vaultAddr}`);

  // ── Deploy UNITEStaking ──
  if (UNITE) {
    console.log("Deploying UNITEStaking...");
    const Staking = await ethers.getContractFactory("UNITEStaking");
    const staking = await Staking.deploy(UNITE);
    await staking.waitForDeployment();
    const stakingAddr = await staking.getAddress();
    console.log(`  ✓ UNITEStaking:       ${stakingAddr}`);

    // ── Verify on Arbiscan ──
    if (network.name !== "hardhat" && network.name !== "localhost") {
      console.log("\nWaiting for block confirmations...");
      // Wait for a few blocks before verifying
      const tx1 = vault.deploymentTransaction();
      const tx2 = staking.deploymentTransaction();
      if (tx1) await tx1.wait(5);
      if (tx2) await tx2.wait(5);

      console.log("Verifying contracts on Arbiscan...");
      try {
        await run("verify:verify", {
          address: vaultAddr,
          constructorArguments: [USDC, deployer.address],
        });
        console.log("  ✓ Vault verified");
      } catch (e: any) {
        console.log(`  ⚠ Vault verification: ${e.message}`);
      }

      try {
        await run("verify:verify", {
          address: stakingAddr,
          constructorArguments: [UNITE],
        });
        console.log("  ✓ Staking verified");
      } catch (e: any) {
        console.log(`  ⚠ Staking verification: ${e.message}`);
      }
    }

    // ── Summary ──
    console.log("\n═══════════════════════════════════════════");
    console.log("DEPLOYMENT COMPLETE");
    console.log("═══════════════════════════════════════════");
    console.log(`FantasyCryptoVault: ${vaultAddr}`);
    console.log(`UNITEStaking:       ${stakingAddr}`);
    console.log(`USDC:               ${USDC}`);
    console.log(`UNITE:              ${UNITE}`);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Update server/.env with contract addresses");
    console.log("  2. Transfer Vault ownership to multisig");
    console.log("  3. Set treasury to DAO/multisig address");
    console.log("  4. Update frontend config/index.ts CONTRACTS");
    console.log("═══════════════════════════════════════════");
  } else {
    console.log("⚠ Skipping UNITEStaking — no UNITE token address for this network");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
