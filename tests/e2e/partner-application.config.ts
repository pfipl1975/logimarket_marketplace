import { defineConfig } from "@playwright/test";
if(process.env.PARTNER_APPLICATION_DB_TESTS !== "LOCAL_ISOLATED_15479")throw Error("Classified LOCAL application QA required");
export default defineConfig({testDir:".",testMatch:"partner-application.spec.ts",fullyParallel:false,workers:1,retries:0,timeout:120000,reporter:"list",use:{baseURL:"http://localhost:3107",browserName:"chromium",screenshot:"only-on-failure"}});
