"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { config } from "@/config/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

const adytumTheme = darkTheme({
  accentColor: "#8b5cf6",
  accentColorForeground: "white",
  borderRadius: "medium",
  fontStack: "system",
  overlayBlur: "small",
});

// Override some theme values
adytumTheme.colors.modalBackground = "#15151f";
adytumTheme.colors.modalBorder = "rgba(139, 92, 246, 0.2)";
adytumTheme.colors.profileForeground = "#0a0a0f";
adytumTheme.colors.closeButton = "#71717a";
adytumTheme.colors.closeButtonBackground = "rgba(139, 92, 246, 0.1)";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={adytumTheme} modalSize="compact">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
