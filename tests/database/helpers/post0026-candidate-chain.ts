import { POST0025_CANDIDATE_CHAIN } from "./post0025-candidate-chain";
// Canonical historical SQL bytes remain immutable; 0026 measured in isolated PostgreSQL 15.
export const POST0026_CANDIDATE_CHAIN = [...POST0025_CANDIDATE_CHAIN, {"idx":26,"version":"7","when":1793480000000,"tag":"0026_offer_moderation_events","breakpoints":true,"blob":"67c60975fcdf9003f0431cc5e5c12a4341c77c4e"}] as const;
