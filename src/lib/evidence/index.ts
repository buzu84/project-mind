/**
 * Evidence Layer – Barrel exports.
 */

export { retrieveEvidence } from "./retrieval-service";
export { createEvidenceCitations, formatEvidenceForPrompt } from "./citations";
export { RETRIEVAL_INTENT_CONFIG } from "./intent-config";
export { logRetrievalEvent } from "./retrieval-log";
export {
  RETRIEVAL_INTENTS,
  EVIDENCE_SOURCE_TYPES,
  type RetrievalIntent,
  type EvidenceSourceType,
  type EvidenceCandidate,
  type RetrieveEvidenceInput,
  type RetrieveEvidenceResult,
  type EvidenceCitation,
} from "./types";


