"use client";

import dynamic from "next/dynamic";

const FloatingOperatorWindow = dynamic(
  () => import("./FloatingOperatorWindow").then((module) => module.FloatingOperatorWindow),
  { ssr: false },
);

export function FloatingOperatorClient() {
  return <FloatingOperatorWindow />;
}
