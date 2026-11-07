import { createFileRoute } from "@tanstack/react-router";
import { Wizard } from "@/components/wizard";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Wizard />;
}
