"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import ChatArea from "@/components/ChatArea";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import config from "@/config";

const LeftSidebar = dynamic(() => import("@/components/LeftSidebar"), {
  ssr: false,
});
const RightSidebar = dynamic(() => import("@/components/RightSidebar"), {
  ssr: false,
});

// Default demo tenant for the bare URL (no ?clinicId=).
// lumina-medspa is English/USD and fully prompt-driven (no DB/Pinecone
// dependency), so it gives the best first impression for international
// clients and is the most cold-start-resilient tenant. Other tenants
// stay reachable via ?clinicId=... (e.g. ?clinicId=glow-clinic).
const DEFAULT_CLINIC_ID = "lumina-medspa";

function ChatWrapper() {
  const searchParams = useSearchParams();

  // Get clinicId from URL parameter, falling back to the default demo tenant.
  // Example: http://localhost:3000?clinicId=glow-clinic
  const clinicId = searchParams.get('clinicId') || DEFAULT_CLINIC_ID;

  // Log for debugging
  console.log(`🏥 Bot configured for clinic: ${clinicId}`);

  return (
    <ErrorBoundary>
      <ChatArea clinicId={clinicId} />
    </ErrorBoundary>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-full">
      <TopNavBar />
      <div className="flex flex-1 overflow-hidden h-screen w-full">
        {config.includeLeftSidebar && <LeftSidebar />}
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
          <ChatWrapper />
        </Suspense>
        {config.includeRightSidebar && <RightSidebar />}
      </div>
    </div>
  );
}
