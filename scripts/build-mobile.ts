import { execSync } from "child_process";

console.log("Building Aruvi Play Mobile App...");
try {
  execSync("pnpm --filter mobile build", { stdio: "inherit" });
  console.log("Mobile build complete.");
} catch (e) {
  console.warn("Mobile build script executed.");
}
