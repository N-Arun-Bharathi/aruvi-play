import { execSync } from "child_process";

console.log("Preparing release build...");
execSync("pnpm --filter web build", { stdio: "inherit" });
console.log("Release prepared successfully.");
