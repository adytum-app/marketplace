"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { Menu, X, Plus, Compass, Shield } from "lucide-react";
import { AdytumLogo } from "./AdytumLogo";

const navigation = [
  { name: "Browse", href: "/", icon: Compass },
  { name: "List Invention", href: "/list", icon: Plus },
  { name: "Vault", href: "/vault", icon: Shield },
];

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-adytum-void/80 backdrop-blur-xl border-b border-adytum-amethyst-500/10">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <AdytumLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
              <span className="font-display text-xl font-semibold text-white">
                Adytum
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? "bg-adytum-amethyst-500/20 text-adytum-amethyst-300"
                        : "text-adytum-smoke-light hover:text-white hover:bg-adytum-whisper"
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* Right side - Wallet */}
          <div className="flex items-center gap-4">
            <ConnectButton
              chainStatus="icon"
              accountStatus={{
                smallScreen: "avatar",
                largeScreen: "full",
              }}
              showBalance={{
                smallScreen: false,
                largeScreen: true,
              }}
            />

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden btn-ghost p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-adytum-amethyst-500/10">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium
                      transition-all duration-200
                      ${
                        isActive
                          ? "bg-adytum-amethyst-500/20 text-adytum-amethyst-300"
                          : "text-adytum-smoke-light hover:text-white hover:bg-adytum-whisper"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
