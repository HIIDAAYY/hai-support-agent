"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import TopNavBar from "@/components/TopNavBar";
import ChatArea from "@/components/ChatArea";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import config from "@/config";
import { DEFAULT_TENANT_ID } from "@/app/lib/tenants";

const LeftSidebar = dynamic(() => import("@/components/LeftSidebar"), {
  ssr: false,
});
const RightSidebar = dynamic(() => import("@/components/RightSidebar"), {
  ssr: false,
});

function ChatWrapper() {
  const searchParams = useSearchParams();

  // Get clinicId from URL parameter, falling back to the default demo tenant
  // (DEFAULT_TENANT_ID in app/lib/tenants.ts — the same constant the chat route
  // falls back to, so the two can't drift apart).
  // Example: http://localhost:3000?clinicId=lumina-medspa
  const clinicId = searchParams.get('clinicId') || DEFAULT_TENANT_ID;

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
