"use client";

import { useState, useMemo } from "react";
import { Search, Filter, Zap, Gavel, Grid3X3, List } from "lucide-react";
import { InventionCard } from "@/components/marketplace/InventionCard";
import { MOCK_INVENTIONS } from "@/lib/mockData";
import {
  InventionCategory,
  CategoryLabels,
  CategoryIcons,
  MonetizationModel,
  isPayPerUse,
} from "@/types";

type SortOption = "newest" | "popular" | "price_low" | "price_high";
type ViewMode = "grid" | "list";

export default function BrowsePage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    InventionCategory | "all"
  >("all");
  const [selectedModel, setSelectedModel] = useState<MonetizationModel | "all">(
    "all",
  );
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filter and sort inventions
  const filteredInventions = useMemo(() => {
    let result = [...MOCK_INVENTIONS];

    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.metadata.title.toLowerCase().includes(searchLower) ||
          inv.metadata.shortDescription.toLowerCase().includes(searchLower) ||
          inv.metadata.tags.some((tag) =>
            tag.toLowerCase().includes(searchLower),
          ),
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((inv) => inv.category === selectedCategory);
    }

    // Filter by model
    if (selectedModel !== "all") {
      result = result.filter((inv) => inv.model === selectedModel);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return Number(b.createdAt - a.createdAt);
        case "popular":
          // For Pay-Per-Use, sort by total executions
          // For Nash, sort by number of bidders (we'd need to track this)
          if (isPayPerUse(a) && isPayPerUse(b)) {
            return Number(b.config.totalExecutions - a.config.totalExecutions);
          }
          return Number(b.createdAt - a.createdAt);
        case "price_low":
          const priceA = isPayPerUse(a) ? a.config.pricePerCall : BigInt(0);
          const priceB = isPayPerUse(b) ? b.config.pricePerCall : BigInt(0);
          return Number(priceA - priceB);
        case "price_high":
          const priceA2 = isPayPerUse(a) ? a.config.pricePerCall : BigInt(0);
          const priceB2 = isPayPerUse(b) ? b.config.pricePerCall : BigInt(0);
          return Number(priceB2 - priceA2);
        default:
          return 0;
      }
    });

    return result;
  }, [search, selectedCategory, selectedModel, sortBy]);

  // Stats
  const stats = useMemo(() => {
    return MOCK_INVENTIONS.reduce(
      (acc, inv) => {
        acc.total++;
        if (isPayPerUse(inv)) {
          acc.payPerUse++;
          acc.totalRevenue += inv.config.totalRevenue;
          acc.totalExecutions += inv.config.totalExecutions;
        } else {
          acc.nash++;
        }
        return acc;
      },
      {
        total: 0,
        payPerUse: 0,
        nash: 0,
        totalRevenue: BigInt(0),
        totalExecutions: BigInt(0),
      },
    );
  }, []);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            The Marketplace for Protected Knowledge
          </h1>
          <p className="text-adytum-smoke">
            Trade secrets, algorithms, and ML models — protected by TEE, traded
            trustlessly.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <p className="text-xs text-adytum-smoke mb-1">Total Inventions</p>
            <p className="text-xl font-semibold text-white">{stats.total}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
              <Zap className="h-3 w-3" /> Pay-Per-Use
            </p>
            <p className="text-xl font-semibold text-adytum-vault-light">
              {stats.payPerUse}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
              <Gavel className="h-3 w-3" /> Nash Bargaining
            </p>
            <p className="text-xl font-semibold text-adytum-seal-light">
              {stats.nash}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-adytum-smoke mb-1">Total Executions</p>
            <p className="text-xl font-semibold text-white">
              {stats.totalExecutions.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center">
            {/* Search */}
            <div className="relative min-w-0 w-full lg:flex-1 lg:min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-adytum-smoke" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search inventions, tags..."
                className="input pl-10 w-full"
              />
            </div>

            {/* Model filter — shrink-0 + nowrap so selects (input w-full) don’t crush labels */}
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedModel("all")}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedModel === "all"
                    ? "bg-adytum-amethyst-500 text-white"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white"
                }`}
              >
                All Models
              </button>
              <button
                type="button"
                onClick={() => setSelectedModel(MonetizationModel.PayPerUse)}
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  selectedModel === MonetizationModel.PayPerUse
                    ? "bg-adytum-vault text-white"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white"
                }`}
              >
                <Zap className="h-3.5 w-3.5 shrink-0" />
                Pay-Per-Use
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedModel(MonetizationModel.NashNegotiation)
                }
                className={`whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  selectedModel === MonetizationModel.NashNegotiation
                    ? "bg-adytum-seal text-white"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white"
                }`}
              >
                <Gavel className="h-3.5 w-3.5 shrink-0" />
                Nash Bargaining
              </button>
            </div>

            {/* Category dropdown — w-auto overrides .input’s w-full inside flex row */}
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(
                  e.target.value === "all"
                    ? "all"
                    : (Number(e.target.value) as InventionCategory),
                )
              }
              className="input w-full min-w-0 shrink-0 sm:w-auto sm:min-w-48 sm:max-w-64"
            >
              <option value="all">All Categories</option>
              {Object.entries(CategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {CategoryIcons[Number(value) as InventionCategory]} {label}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="input w-full min-w-0 shrink-0 sm:w-auto sm:min-w-44 sm:max-w-52"
            >
              <option value="newest">Newest</option>
              <option value="popular">Most Popular</option>
              <option value="price_low">Price: Low → High</option>
              <option value="price_high">Price: High → Low</option>
            </select>

            {/* View toggle */}
            <div className="flex shrink-0 border border-adytum-void-100 rounded-lg overflow-hidden self-start lg:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 ${
                  viewMode === "grid"
                    ? "bg-adytum-amethyst-500 text-white"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white"
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 ${
                  viewMode === "list"
                    ? "bg-adytum-amethyst-500 text-white"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-adytum-smoke">
          Showing {filteredInventions.length} of {MOCK_INVENTIONS.length}{" "}
          inventions
        </div>

        {/* Invention grid/list */}
        {filteredInventions.length === 0 ? (
          <div className="text-center py-16">
            <Filter className="h-12 w-12 text-adytum-smoke mx-auto mb-4" />
            <h3 className="font-display text-lg font-semibold text-white mb-2">
              No inventions found
            </h3>
            <p className="text-adytum-smoke">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredInventions.map((invention) => (
              <InventionCard key={invention.id} invention={invention} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
