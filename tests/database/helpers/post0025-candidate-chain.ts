import { POST0024_APPROVED_CHAIN } from "./post0024-approved-chain";
// New 0025 bytes are a review candidate; historical approved bytes remain immutable.
export const POST0025_CANDIDATE_CHAIN = [...POST0024_APPROVED_CHAIN, {"idx":25,"version":"7","when":1793280737565,"tag":"0025_partner_applications","breakpoints":true,"blob":"92f49b60de08c2c0a97c607d6f21035d5819f15b"}] as const;
