import { execSync } from "child_process";

console.log("Building Aruvi Play Web App...");
try {
  execSync("pnpm --filter web build", { stdio: "inherit" });
  console.log("Web build complete.");
} catch (e) {
  console.error("Web build failed:", e);
}
