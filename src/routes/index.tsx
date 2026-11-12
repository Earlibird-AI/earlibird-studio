import { createFileRoute, redirect } from "@tanstack/react-router";

// The showcase is a plain HTML/CSS/JS site in public/showcase/ (no build step, easy to edit).
// The home page sends visitors straight to it.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ href: "/showcase/index.html", replace: true });
  },
  component: () => null,
});
