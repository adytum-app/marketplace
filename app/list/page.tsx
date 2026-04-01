"use client";

import { parseUSDC } from "@/config/wagmi";
import { generateSalt, generateNashBidHash } from "@/lib/api";
import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
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

type ListingStep = "model" | "form" | "uploading" | "success" | "error";

export default function ListInventionPage() {
  const { address, isConnected } = useAccount();

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
    maxCallsPerMonth: 500,
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

    try {
      setStep("uploading");

      let preparedArgs: Record<string, unknown> = {};
      let nashSaltToSave: `0x${string}` | null = null;
      let nashPriceToSave: string | null = null;

      // ==========================================
      // 1. PREPARE SMART CONTRACT ARGUMENTS
      // ==========================================
      if (selectedModel === MonetizationModel.NashNegotiation) {
        // Calculate absolute Unix timestamps
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const bidDeadline =
          currentTimestamp + nashConfig.bidDurationDays * 86400;
        const revealDeadline =
          bidDeadline + nashConfig.revealDurationDays * 86400;

        // --- THE NASH SALT CHALLENGE ---
        // 1. Generate a secure random 32-byte salt
        const salt = generateSalt();

        // 2. Parse human-readable USDC to BigInt (e.g., "10.50" -> 10500000n)
        const minPriceBigInt = parseUSDC(nashConfig.minAcceptable);

        // 3. Hash them together (Matches Solidity's keccak256(abi.encodePacked(price, salt)))
        const sellerBidHash = generateNashBidHash(minPriceBigInt, salt);

        // Save these to variables so we can write them to localStorage AFTER the tx succeeds
        nashSaltToSave = salt;
        nashPriceToSave = nashConfig.minAcceptable;

        preparedArgs = {
          sellerMinHash: sellerBidHash, // ONLY THE HASH GOES TO THE BLOCKCHAIN!
          bidDeadline,
          revealDeadline,
          allowTrialsDuring: nashConfig.allowTrialsDuring,
          trialFee: nashConfig.trialFee
            ? parseUSDC(nashConfig.trialFee)
            : BigInt(0),
          maxTrialsPerBidder: nashConfig.maxTrialsPerBidder,
        };

        console.log("Prepared Nash Arguments:", preparedArgs);
      } else if (selectedModel === MonetizationModel.PayPerUse) {
        preparedArgs = {
          pricePerCall: parseUSDC(payPerUseConfig.pricePerCall),
          maxCallsPerDay: payPerUseConfig.maxCallsPerDay,
          maxCallsPerMonth: payPerUseConfig.maxCallsPerMonth,
          cooldownSeconds: payPerUseConfig.cooldownSeconds,
        };

        console.log("Prepared Pay-Per-Use Arguments:", preparedArgs);
      }

      // ==========================================
      // 2. ENCRYPT, UPLOAD, AND CALL CONTRACT
      // ==========================================
      // Simulate: 1. Encrypt code, 2. Upload to IPFS, 3. Call contract
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // ⚠️ IMPORTANT FOR PRODUCTION:
      // When you replace the timeout above with actual Wagmi logic, you need to extract
      // the newly created `inventionId` from the transaction receipt logs.
      const newlyMintedInventionId = "simulated_id_123";

      // ==========================================
      // 3. SAVE SENSITIVE DATA TO LOCALSTORAGE
      // ==========================================
      if (
        selectedModel === MonetizationModel.NashNegotiation &&
        nashSaltToSave &&
        address
      ) {
        // We tie the storage key to BOTH the invention ID and the seller's address.
        // This prevents mixups if multiple users share a computer.
        localStorage.setItem(
          `seller_nash_salt_${newlyMintedInventionId}_${address}`,
          nashSaltToSave,
        );
        localStorage.setItem(
          `seller_nash_amount_${newlyMintedInventionId}_${address}`,
          nashPriceToSave!,
        );
        console.log(
          "✅ Securely saved Nash salt and price to local browser storage.",
        );
      }

      setStep("success");
    } catch (err) {
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
      maxCallsPerMonth: 500,
      cooldownSeconds: 0,
    });
    setNashConfig({
      minAcceptable: "",
      bidDurationDays: 7,
      revealDurationDays: 3,
      allowTrialsDuring: true,
      trialFee: "",
      maxTrialsPerBidder: 5,
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

  // Uploading
  if (step === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-16 w-16 text-adytum-amethyst-400 animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-white mb-2">
            Listing Your Invention
          </h2>
          <p className="text-adytum-smoke">
            Encrypting code, uploading to IPFS, and registering on-chain...
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
            />
          ) : (
            <NashConfigForm config={nashConfig} setConfig={setNashConfig} />
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
}: {
  config: {
    pricePerCall: string;
    maxCallsPerDay: number;
    maxCallsPerMonth: number;
    cooldownSeconds: number;
  };
  setConfig: React.Dispatch<React.SetStateAction<typeof config>>;
}) {
  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-display text-xl font-semibold text-white flex items-center gap-2">
        <Zap className="h-5 w-5 text-adytum-vault" />
        Pay-Per-Use Configuration
      </h2>

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
          <label className="label">Max Calls per Month</label>
          <input
            type="number"
            min="1"
            max="10000"
            value={config.maxCallsPerMonth}
            onChange={(e) =>
              setConfig({ ...config, maxCallsPerMonth: Number(e.target.value) })
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
}: {
  config: {
    minAcceptable: string;
    bidDurationDays: number;
    revealDurationDays: number;
    allowTrialsDuring: boolean;
    trialFee: string;
    maxTrialsPerBidder: number;
  };
  setConfig: React.Dispatch<React.SetStateAction<typeof config>>;
}) {
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
