"use client";

import { parseUSDC, formatUSDC } from "@/config/wagmi";
import { generateSalt, generateNashBidHash } from "@/lib/api";
import { encryptCodeForTEE } from "@/lib/crypto";
import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useReadContract } from "wagmi";
import { decodeEventLog, keccak256, toHex } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { CONTRACTS } from "@/config/wagmi";
import { ADYTUM_ABI, ERC20_ABI } from "@/config/abi";
import {
  Upload,
  Plus,
  X,
  Shield,
  Loader2,
  CheckCircle,
  AlertCircle,
  Zap,
  Gavel,
  Info,
  ShieldAlert,
} from "lucide-react";
import {
  InventionCategory,
  CategoryLabels,
  CategoryIcons,
  MonetizationModel,
  ModelLabels,
  ModelDescriptions,
  Benchmark,
} from "@/types";

type ListingStep =
  | "model"
  | "form"
  | "approving"
  | "uploading"
  | "signing"
  | "confirming"
  | "success"
  | "error";

type NashPreparedArgs = {
  sellerMinHash: `0x${string}`;
  bidDeadline: bigint;
  revealDeadline: bigint;
  allowTrialsDuring: boolean;
  trialFee: bigint;
  maxTrialsPerBidder: bigint;
  sellerBond: bigint;
  requiredDeposit: bigint;
};

type PayPerUsePreparedArgs = {
  pricePerCall: bigint;
  maxCallsPerDay: bigint;
  maxCallsPer30Days: bigint;
  cooldownSeconds: bigint;
};

export default function ListInventionPage() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Fetch required network minimums
  const { data: minBondData } = useReadContract({
    address: CONTRACTS.ADYTUM_MARKETPLACE,
    abi: ADYTUM_ABI,
    functionName: "minSellerBond",
  });
  
  const { data: listingFeeData } = useReadContract({
    address: CONTRACTS.ADYTUM_MARKETPLACE,
    abi: ADYTUM_ABI,
    functionName: "payPerUseListingFee",
  });

  const minSellerBond = (minBondData as bigint) ?? BigInt(50_000_000); // Default 50 USDC
  const payPerUseListingFee = (listingFeeData as bigint) ?? BigInt(5_000_000); // Default 5 USDC

  const [step, setStep] = useState<ListingStep>("model");
  const [selectedModel, setSelectedModel] = useState<MonetizationModel | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Shared form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    shortDescription: "",
    category: InventionCategory.Algorithm,
    tags: [] as string[],
    benchmarks: [] as Benchmark[],
  });

  // Pay-Per-Use specific
  const [payPerUseConfig, setPayPerUseConfig] = useState({
    pricePerCall: "",
    maxCallsPerDay: 50,
    maxCallsPer30Days: 500,
    cooldownSeconds: 0,
  });

  // Nash specific
  const [nashConfig, setNashConfig] = useState({
    minAcceptable: "",
    bidDurationDays: 7,
    revealDurationDays: 3,
    allowTrialsDuring: true,
    trialFee: "",
    maxTrialsPerBidder: 5,
    sellerBond: "50",
    requiredDeposit: "10",
  });

  const [newTag, setNewTag] = useState("");
  const [newBenchmark, setNewBenchmark] = useState<Benchmark>({
    metric: "",
    value: 0,
    unit: "",
  });
  const [inventionCode, setInventionCode] = useState("");

  // Tag management
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter((t) => t !== tag) });
  };

  // Benchmark management
  const addBenchmark = () => {
    if (newBenchmark.metric.trim()) {
      setFormData({
        ...formData,
        benchmarks: [...formData.benchmarks, { ...newBenchmark }],
      });
      setNewBenchmark({ metric: "", value: 0, unit: "" });
    }
  };

  const removeBenchmark = (index: number) => {
    setFormData({
      ...formData,
      benchmarks: formData.benchmarks.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicClient) {
      setError("Web3 provider not initialized");
      setStep("error");
      return;
    }

    try {
      let preparedArgs: NashPreparedArgs | PayPerUsePreparedArgs | null = null;
      let nashSaltToSave: `0x${string}` | null = null;
      let nashPriceToSave: string | null = null;
      let requiredUSDC = BigInt(0);

      // ==========================================
      // 1. PREPARE SMART CONTRACT ARGUMENTS
      // ==========================================
      if (selectedModel === MonetizationModel.NashNegotiation) {
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const bidDeadline = BigInt(currentTimestamp + nashConfig.bidDurationDays * 86400);
        const revealDeadline = BigInt(currentTimestamp + (nashConfig.bidDurationDays + nashConfig.revealDurationDays) * 86400);

        const salt = generateSalt();
        const minPriceBigInt = parseUSDC(nashConfig.minAcceptable);
        const sellerBidHash = generateNashBidHash(minPriceBigInt, salt);

        nashSaltToSave = salt;
        nashPriceToSave = nashConfig.minAcceptable;
        
        const sellerBondBigInt = parseUSDC(nashConfig.sellerBond);
        if (sellerBondBigInt < minSellerBond) {
          throw new Error(`Minimum seller bond is ${formatUSDC(minSellerBond)} USDC`);
        }
        
        requiredUSDC = sellerBondBigInt;

        preparedArgs = {
          sellerMinHash: sellerBidHash,
          bidDeadline,
          revealDeadline,
          allowTrialsDuring: nashConfig.allowTrialsDuring,
          trialFee: nashConfig.trialFee
            ? parseUSDC(nashConfig.trialFee)
            : BigInt(0),
          maxTrialsPerBidder: BigInt(nashConfig.maxTrialsPerBidder),
          sellerBond: sellerBondBigInt,
          requiredDeposit: nashConfig.requiredDeposit ? parseUSDC(nashConfig.requiredDeposit) : BigInt(0),
        };
      } else if (selectedModel === MonetizationModel.PayPerUse) {
        requiredUSDC = payPerUseListingFee;
        preparedArgs = {
          pricePerCall: parseUSDC(payPerUseConfig.pricePerCall),
          maxCallsPerDay: BigInt(payPerUseConfig.maxCallsPerDay),
          maxCallsPer30Days: BigInt(payPerUseConfig.maxCallsPer30Days),
          cooldownSeconds: BigInt(payPerUseConfig.cooldownSeconds),
        };
      }

      if (!preparedArgs) {
        throw new Error("Failed to prepare arguments for listing");
      }

      // ==========================================
      // 2. APPROVE USDC FOR BOND / FEE
      // ==========================================
      if (requiredUSDC > BigInt(0)) {
        setStep("approving");
        const approveTx = await (writeContractAsync as unknown as (
          config: unknown,
        ) => Promise<`0x${string}`>)({
          address: CONTRACTS.USDC,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACTS.ADYTUM_MARKETPLACE, requiredUSDC],
        });
        
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
      }

      // ==========================================
      // 3. ENCRYPT & UPLOAD TO IPFS
      // ==========================================
      setStep("uploading");
      const encryptedCodeBlob = await encryptCodeForTEE(inventionCode);

      const codeFormData = new FormData();
      codeFormData.append("file", encryptedCodeBlob, "encrypted_invention.bin");

      const codeUploadRes = await fetch("/api/ipfs", {
        method: "POST",
        body: codeFormData,
      });
      const codeUploadData = await codeUploadRes.json();
      if (!codeUploadData.cid) throw new Error("Failed to upload code to IPFS");
      const encryptedCodeUri = `ipfs://${codeUploadData.cid}`;

      const metadataJson = {
        name: formData.title,
        description: formData.description,
        shortDescription: formData.shortDescription,
        external_url: "https://adytum.network",
        attributes: [
          { trait_type: "Category", value: CategoryLabels[formData.category] },
          { trait_type: "Model", value: ModelLabels[selectedModel!] },
          ...formData.tags.map((tag) => ({ trait_type: "Tag", value: tag })),
        ],
        benchmarks: formData.benchmarks,
        encryptedCodeUri: encryptedCodeUri,
      };

      const metadataFormData = new FormData();
      metadataFormData.append("json", JSON.stringify(metadataJson));

      const metadataRes = await fetch("/api/ipfs", {
        method: "POST",
        body: metadataFormData,
      });
      const metadataData = await metadataRes.json();
      if (!metadataData.cid)
        throw new Error("Failed to upload metadata to IPFS");
      const finalTokenUri = `ipfs://${metadataData.cid}`;

      // ==========================================
      // 4. CALL SMART CONTRACT (WAGMI)
      // ==========================================
      setStep("signing");

      // Calculate hashes needed for the smart contract struct parameters
      const codeBuffer = await encryptedCodeBlob.arrayBuffer();
      const encryptedCodeHash = keccak256(toHex(new Uint8Array(codeBuffer)));
      // Mocking encryption key hash for frontend testing - in prod this comes from KMS
      const encryptionKeyHash = keccak256(toHex(new Uint8Array(32))); 

      let txHash: `0x${string}`;

      if (selectedModel === MonetizationModel.NashNegotiation) {
        const args = preparedArgs as NashPreparedArgs;
        txHash = await (writeContractAsync as unknown as (
          config: unknown,
        ) => Promise<`0x${string}`>)({
          address: CONTRACTS.ADYTUM_MARKETPLACE,
          abi: ADYTUM_ABI,
          functionName: "listNashNegotiation",
          args: [
            finalTokenUri,
            encryptedCodeHash,
            encryptionKeyHash,
            formData.category,
            args.sellerMinHash,
            args.bidDeadline,
            args.revealDeadline,
            args.allowTrialsDuring,
            args.trialFee,
            args.maxTrialsPerBidder,
            args.sellerBond,
            args.requiredDeposit,
          ],
        });
      } else {
        const args = preparedArgs as PayPerUsePreparedArgs;
        txHash = await (writeContractAsync as unknown as (
          config: unknown,
        ) => Promise<`0x${string}`>)({
          address: CONTRACTS.ADYTUM_MARKETPLACE,
          abi: ADYTUM_ABI,
          functionName: "listPayPerUse",
          args: [
            finalTokenUri,
            encryptedCodeHash,
            encryptionKeyHash,
            formData.category,
            args.pricePerCall,
            args.maxCallsPerDay,
            args.maxCallsPer30Days,
            args.cooldownSeconds,
          ],
        });
      }

      setStep("confirming");

      // Wait for the transaction to be mined on Base L2
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // ==========================================
      // 5. EXTRACT ID & SAVE SENSITIVE DATA
      // ==========================================
      let newlyMintedInventionId = "";

      // Decode the event logs to find the newly minted ID
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ADYTUM_ABI,
            data: log.data,
            topics: log.topics,
          });

          if (decoded.eventName === "InventionListed") {
            const eventArgs = decoded.args as { id?: string; inventionId?: string };
            if (eventArgs.id) {
              newlyMintedInventionId = eventArgs.id.toString();
            } else if (eventArgs.inventionId) {
              newlyMintedInventionId = eventArgs.inventionId.toString();
            }
          }
        } catch {
          // Ignore logs from other contracts or unmatching events
        }
      }

      // Fallback if event decoding fails but tx succeeded
      if (!newlyMintedInventionId) {
        console.warn(
          "Could not find InventionListed event. Using fallback ID.",
        );
        newlyMintedInventionId = txHash.slice(0, 15);
      }

      // Save Nash Secrets safely now that tx is confirmed
      if (
        selectedModel === MonetizationModel.NashNegotiation &&
        nashSaltToSave &&
        address
      ) {
        localStorage.setItem(
          `seller_nash_salt_${newlyMintedInventionId}_${address}`,
          nashSaltToSave,
        );
        localStorage.setItem(
          `seller_nash_amount_${newlyMintedInventionId}_${address}`,
          nashPriceToSave!,
        );
      }

      setStep("success");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to list invention");
      setStep("error");
    }
  };

  const resetForm = () => {
    setStep("model");
    setSelectedModel(null);
    setFormData({
      title: "",
      description: "",
      shortDescription: "",
      category: InventionCategory.Algorithm,
      tags: [],
      benchmarks: [],
    });
    setPayPerUseConfig({
      pricePerCall: "",
      maxCallsPerDay: 50,
      maxCallsPer30Days: 500,
      cooldownSeconds: 0,
    });
    setNashConfig({
      minAcceptable: "",
      bidDurationDays: 7,
      revealDurationDays: 3,
      allowTrialsDuring: true,
      trialFee: "",
      maxTrialsPerBidder: 5,
      sellerBond: "50",
      requiredDeposit: "10",
    });
    setInventionCode("");
    setError(null);
  };

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-full bg-adytum-amethyst-500/20 flex items-center justify-center mx-auto mb-6">
            <Upload className="h-8 w-8 text-adytum-amethyst-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            List Your Invention
          </h2>
          <p className="text-adytum-smoke mb-6">
            Connect your wallet to list an invention on the Adytum marketplace.
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  // Approving Phase
  if (step === "approving") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-adytum-vault mx-auto mb-6 animate-spin" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Approving USDC
          </h2>
          <p className="text-adytum-smoke">
            Please approve the required {selectedModel === MonetizationModel.NashNegotiation ? "Seller Bond" : "Listing Fee"} in your wallet.
          </p>
        </div>
      </div>
    );
  }

  // Uploading Phase
  if (step === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-adytum-amethyst-400 animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Encrypting & Uploading
          </h2>
          <p className="text-adytum-smoke">
            Encrypting code and uploading metadata to IPFS...
          </p>
        </div>
      </div>
    );
  }

  // Wallet Signing Phase
  if (step === "signing") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-adytum-vault mx-auto mb-6 animate-pulse" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Sign Transaction
          </h2>
          <p className="text-adytum-smoke">
            Please confirm the transaction in your wallet to list on Base.
          </p>
        </div>
      </div>
    );
  }

  // Blockchain Confirming Phase
  if (step === "confirming") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-adytum-vault mx-auto mb-6 animate-spin" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Confirming on Blockchain
          </h2>
          <p className="text-adytum-smoke">
            Waiting for the block to be mined...
          </p>
        </div>
      </div>
    );
  }

  // Success
  if (step === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <CheckCircle className="h-16 w-16 text-adytum-vault mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            Invention Listed!
          </h2>
          <p className="text-adytum-smoke mb-6">
            Your invention is now live on the Adytum marketplace.
            {selectedModel === MonetizationModel.PayPerUse
              ? " Buyers can now execute it."
              : " Buyers can now submit bids."}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="btn-secondary">
              Browse Marketplace
            </Link>
            <button onClick={resetForm} className="btn-primary">
              List Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-4">
            Listing Failed
          </h2>
          <p className="text-adytum-smoke mb-6">{error}</p>
          <button onClick={() => setStep("form")} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Model selection
  if (step === "model") {
    return (
      <div className="min-h-screen py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Choose Monetization Model
            </h1>
            <p className="text-adytum-smoke">
              How do you want to monetize your invention?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pay-Per-Use */}
            <button
              onClick={() => {
                setSelectedModel(MonetizationModel.PayPerUse);
                setStep("form");
              }}
              className="card p-6 text-left hover:border-adytum-vault/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-adytum-vault/20 flex items-center justify-center mb-4 group-hover:bg-adytum-vault/30 transition-colors">
                <Zap className="h-6 w-6 text-adytum-vault-light" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">
                Pay-Per-Use
              </h3>
              <p className="text-adytum-smoke text-sm mb-4">
                Buyers pay per execution. You keep ownership forever.
                Anti-extraction protections prevent reverse-engineering.
              </p>
              <ul className="text-xs text-adytum-smoke space-y-1">
                <li>✓ Recurring revenue</li>
                <li>✓ Rate limits & tiered pricing</li>
                <li>✓ TEE-protected execution</li>
              </ul>
            </button>

            {/* Nash Bargaining */}
            <button
              onClick={() => {
                setSelectedModel(MonetizationModel.NashNegotiation);
                setStep("form");
              }}
              className="card p-6 text-left hover:border-adytum-seal/50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-adytum-seal/20 flex items-center justify-center mb-4 group-hover:bg-adytum-seal/30 transition-colors">
                <Gavel className="h-6 w-6 text-adytum-seal-light" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white mb-2">
                Nash Bargaining
              </h3>
              <p className="text-adytum-smoke text-sm mb-4">
                Sealed-bid negotiation for full ownership transfer. Fair price
                discovery through game theory.
              </p>
              <ul className="text-xs text-adytum-smoke space-y-1">
                <li>✓ One-time sale</li>
                <li>✓ Sealed bids → fair pricing</li>
                <li>✓ Atomic key transfer</li>
              </ul>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => setStep("model")}
            className="text-sm text-adytum-smoke hover:text-white mb-4 flex items-center gap-1"
          >
            ← Change model
          </button>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl font-bold text-white">
              List Invention
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${
                selectedModel === MonetizationModel.PayPerUse
                  ? "bg-adytum-vault/20 text-adytum-vault-light"
                  : "bg-adytum-seal/20 text-adytum-seal-light"
              }`}
            >
              {selectedModel === MonetizationModel.PayPerUse ? (
                <Zap className="h-3.5 w-3.5" />
              ) : (
                <Gavel className="h-3.5 w-3.5" />
              )}
              {ModelLabels[selectedModel!]}
            </span>
          </div>
          <p className="text-adytum-smoke">
            {ModelDescriptions[selectedModel!]}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Basic Information
            </h2>

            <div>
              <label className="label">Title</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Sentiment Analysis Model v2.1"
                className="input"
              />
            </div>

            <div>
              <label className="label">Short Description</label>
              <input
                type="text"
                required
                maxLength={100}
                value={formData.shortDescription}
                onChange={(e) =>
                  setFormData({ ...formData, shortDescription: e.target.value })
                }
                placeholder="One-line summary (shown in cards)"
                className="input"
              />
              <p className="mt-1 text-xs text-adytum-smoke">
                {formData.shortDescription.length}/100 characters
              </p>
            </div>

            <div>
              <label className="label">Full Description</label>
              <textarea
                required
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Detailed description of your invention, its capabilities, and use cases..."
                className="input"
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: Number(e.target.value) as InventionCategory,
                  })
                }
                className="input"
              >
                {Object.entries(CategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {CategoryIcons[Number(value) as InventionCategory]} {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Model-specific config */}
          {selectedModel === MonetizationModel.PayPerUse ? (
            <PayPerUseConfigForm
              config={payPerUseConfig}
              setConfig={setPayPerUseConfig}
              listingFee={payPerUseListingFee}
            />
          ) : (
            <NashConfigForm 
              config={nashConfig} 
              setConfig={setNashConfig} 
              minBond={minSellerBond}
            />
          )}

          {/* Tags */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Tags
            </h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && (e.preventDefault(), addTag())
                }
                placeholder="Add a tag..."
                className="input flex-1"
              />
              <button type="button" onClick={addTag} className="btn-secondary">
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-adytum-void-100 text-adytum-smoke-light rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Benchmarks */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Benchmarks (Optional)
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={newBenchmark.metric}
                onChange={(e) =>
                  setNewBenchmark({ ...newBenchmark, metric: e.target.value })
                }
                placeholder="Metric (e.g., Accuracy)"
                className="input"
              />
              <input
                type="number"
                step="any"
                value={newBenchmark.value || ""}
                onChange={(e) =>
                  setNewBenchmark({
                    ...newBenchmark,
                    value: Number(e.target.value),
                  })
                }
                placeholder="Value"
                className="input"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBenchmark.unit}
                  onChange={(e) =>
                    setNewBenchmark({ ...newBenchmark, unit: e.target.value })
                  }
                  placeholder="Unit (%)"
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={addBenchmark}
                  className="btn-secondary"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {formData.benchmarks.length > 0 && (
              <div className="space-y-2">
                {formData.benchmarks.map((benchmark, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-adytum-void-100 rounded-lg"
                  >
                    <span className="text-white">
                      {benchmark.metric}: {benchmark.value}
                      {benchmark.unit}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeBenchmark(index)}
                      className="text-adytum-smoke hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invention Code */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Invention Code
            </h2>

            <div>
              <label className="label">Python Code</label>
              <textarea
                required
                rows={12}
                value={inventionCode}
                onChange={(e) => setInventionCode(e.target.value)}
                placeholder={`def run(input_data):
    """
    Your invention logic here.
    
    Args:
        input_data: dict with buyer's test input
    
    Returns:
        dict with your invention's output
    """
    # Your proprietary algorithm/model
    result = process(input_data)
    return {"prediction": result}`}
                className="input font-mono text-sm"
              />
              <p className="mt-2 text-xs text-adytum-smoke">
                Your code must be self-contained and export a{" "}
                <code className="text-adytum-amethyst-300">
                  run(input_data)
                </code>{" "}
                function. Only{" "}
                <code className="text-adytum-amethyst-300">numpy</code>,{" "}
                <code className="text-adytum-amethyst-300">scipy</code>, and{" "}
                <code className="text-adytum-amethyst-300">scikit-learn</code>{" "}
                imports are allowed.
              </p>
            </div>

            <div className="flex items-start gap-3 p-3 bg-adytum-amethyst-500/10 rounded-lg">
              <Shield className="h-5 w-5 text-adytum-amethyst-400 shrink-0 mt-0.5" />
              <p className="text-xs text-adytum-amethyst-200">
                Your code will be encrypted client-side before upload. Only the
                TEE can decrypt and execute it.
                {selectedModel === MonetizationModel.PayPerUse
                  ? " Buyers see outputs only."
                  : " The winner receives the decryption key."}
              </p>
            </div>
          </div>

          {/* Protocol fee notice */}
          <div className="card p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-adytum-seal shrink-0 mt-0.5" />
              <p className="text-xs text-adytum-seal-light">
                Adytum charges a 2.5% protocol fee on all transactions. You
                receive 97.5% of all payments.
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3">
            <Link href="/" className="btn-ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={
                !formData.title ||
                !inventionCode ||
                (selectedModel === MonetizationModel.PayPerUse &&
                  !payPerUseConfig.pricePerCall) ||
                (selectedModel === MonetizationModel.NashNegotiation &&
                  !nashConfig.minAcceptable)
              }
              className="btn-primary"
            >
              <Upload className="h-4 w-4 mr-2" />
              List Invention
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// MODEL-SPECIFIC CONFIG FORMS
// ============================================

function PayPerUseConfigForm({
  config,
  setConfig,
  listingFee,
}: {
  config: {
    pricePerCall: string;
    maxCallsPerDay: number;
    maxCallsPer30Days: number;
    cooldownSeconds: number;
  };
  setConfig: React.Dispatch<React.SetStateAction<typeof config>>;
  listingFee: bigint;
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
          <Zap className="h-5 w-5 text-adytum-vault" />
          Pay-Per-Use Configuration
        </h2>
        <span className="badge badge-vault">
          Listing Fee: {formatUSDC(listingFee)} USDC
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Price per Execution (USDC)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={config.pricePerCall}
            onChange={(e) =>
              setConfig({ ...config, pricePerCall: e.target.value })
            }
            placeholder="0.50"
            className="input"
          />
        </div>

        <div>
          <label className="label">Cooldown (seconds)</label>
          <input
            type="number"
            min="0"
            value={config.cooldownSeconds}
            onChange={(e) =>
              setConfig({ ...config, cooldownSeconds: Number(e.target.value) })
            }
            className="input"
          />
          <p className="mt-1 text-xs text-adytum-smoke">
            Minimum time between executions per buyer
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Max Calls per Day</label>
          <input
            type="number"
            min="1"
            max="1000"
            value={config.maxCallsPerDay}
            onChange={(e) =>
              setConfig({ ...config, maxCallsPerDay: Number(e.target.value) })
            }
            className="input"
          />
        </div>

        <div>
          <label className="label">Max Calls per 30 Days</label>
          <input
            type="number"
            min="1"
            max="10000"
            value={config.maxCallsPer30Days}
            onChange={(e) =>
              setConfig({ ...config, maxCallsPer30Days: Number(e.target.value) })
            }
            className="input"
          />
        </div>
      </div>

      <div className="p-3 bg-adytum-vault/10 rounded-lg border border-adytum-vault/20">
        <p className="text-xs text-adytum-vault-light">
          <strong>Anti-extraction:</strong> Default tiered pricing applies
          automatically — 1.5x after 100 calls, 3x after 500, 10x after 1000.
          You can customize these after listing.
        </p>
      </div>
    </div>
  );
}

function NashConfigForm({
  config,
  setConfig,
  minBond,
}: {
  config: {
    minAcceptable: string;
    bidDurationDays: number;
    revealDurationDays: number;
    allowTrialsDuring: boolean;
    trialFee: string;
    maxTrialsPerBidder: number;
    sellerBond: string;
    requiredDeposit: string;
  };
  setConfig: React.Dispatch<React.SetStateAction<typeof config>>;
  minBond: bigint;
}) {
  const isBondTooLow = config.sellerBond ? parseUSDC(config.sellerBond) < minBond : true;

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
        <Gavel className="h-5 w-5 text-adytum-seal" />
        Nash Bargaining Configuration
      </h2>

      <div>
        <label className="label">Your Minimum Acceptable Price (USDC)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={config.minAcceptable}
          onChange={(e) =>
            setConfig({ ...config, minAcceptable: e.target.value })
          }
          placeholder="1000.00"
          className="input"
        />
        <p className="mt-1 text-xs text-adytum-smoke">
          This will be sealed and only revealed during settlement. If no buyer
          meets this minimum, the deal fails.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Seller Escrow Bond (USDC)</label>
          <input
            type="number"
            step="0.01"
            min={formatUSDC(minBond)}
            required
            value={config.sellerBond}
            onChange={(e) =>
              setConfig({ ...config, sellerBond: e.target.value })
            }
            placeholder={formatUSDC(minBond)}
            className={`input ${isBondTooLow ? "border-red-500 focus:border-red-500" : ""}`}
          />
          <p className={`mt-1 text-xs ${isBondTooLow ? "text-red-400" : "text-adytum-smoke"}`}>
            Minimum required bond is {formatUSDC(minBond)} USDC. Forfeited if you fail to reveal.
          </p>
        </div>

        <div>
          <label className="label flex items-center gap-1">
            Required Buyer Deposit (USDC)
            <ShieldAlert className="h-3.5 w-3.5 text-adytum-smoke" />
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={config.requiredDeposit}
            onChange={(e) =>
              setConfig({ ...config, requiredDeposit: e.target.value })
            }
            placeholder="10.00"
            className="input"
          />
          <p className="mt-1 text-xs text-adytum-smoke">
            Amount buyers must escrow to prevent fake bids. Can be 0.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Bid Duration (days)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={config.bidDurationDays}
            onChange={(e) =>
              setConfig({ ...config, bidDurationDays: Number(e.target.value) })
            }
            className="input"
          />
        </div>

        <div>
          <label className="label">Reveal Duration (days)</label>
          <input
            type="number"
            min="1"
            max="14"
            value={config.revealDurationDays}
            onChange={(e) =>
              setConfig({
                ...config,
                revealDurationDays: Number(e.target.value),
              })
            }
            className="input"
          />
        </div>
      </div>

      <div className="p-3 bg-adytum-void-100 rounded-lg">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.allowTrialsDuring}
            onChange={(e) =>
              setConfig({ ...config, allowTrialsDuring: e.target.checked })
            }
            className="w-4 h-4 rounded border-adytum-void-200 text-adytum-seal focus:ring-adytum-seal"
          />
          <span className="text-sm text-white">
            Allow trials during negotiation
          </span>
        </label>
        <p className="mt-2 text-xs text-adytum-smoke ml-7">
          Let potential buyers test the invention before committing to a bid
        </p>
      </div>

      {config.allowTrialsDuring && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Trial Fee (USDC)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={config.trialFee}
              onChange={(e) =>
                setConfig({ ...config, trialFee: e.target.value })
              }
              placeholder="10.00"
              className="input"
            />
          </div>

          <div>
            <label className="label">Max Trials per Bidder</label>
            <input
              type="number"
              min="1"
              max="20"
              value={config.maxTrialsPerBidder}
              onChange={(e) =>
                setConfig({
                  ...config,
                  maxTrialsPerBidder: Number(e.target.value),
                })
              }
              className="input"
            />
          </div>
        </div>
      )}

      <div className="p-3 bg-adytum-seal/10 rounded-lg border border-adytum-seal/20">
        <p className="text-xs text-adytum-seal-light">
          <strong>Nash bargaining:</strong> If a buyer&apos;s max ≥ your min,
          the final price is the midpoint (fair to both). Winner receives the
          decryption key atomically.
        </p>
      </div>
    </div>
  );
}