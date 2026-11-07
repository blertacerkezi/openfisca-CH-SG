import { createRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function ErrorView({ error }: ErrorComponentProps) {
  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="font-serif text-3xl">Etwas ist schiefgelaufen</h1>
      <p className="mt-3 text-muted">{error.message}</p>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: ErrorView,
  });
}
