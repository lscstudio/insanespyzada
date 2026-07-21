import { createFileRoute } from "@tanstack/react-router";
import { default as SpaApp } from "@/spa/App";

export const Route = createFileRoute("/$")({
  ssr: false,
  component: SpaRoot,
});

function SpaRoot() {
  return <SpaApp />;
}
