// Wird vor jedem Client-Test geladen: erweitert expect um DOM-Matcher wie
// toBeInTheDocument() und raeumt gerenderte Komponenten nach jedem Test auf.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
