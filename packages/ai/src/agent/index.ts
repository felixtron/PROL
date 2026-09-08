/**
 * Núcleo del harness de agente. Sin dependencias de Next ni de la base de
 * datos: se puede compilar y probar suelto. Las herramientas concretas viven
 * en `apps/web/lib/agent/tools`, junto al código de negocio que envuelven.
 */

export {
  blocks,
  fail,
  isTainted,
  neutralize,
  newFenceId,
  ok,
  renderToolResult,
  untrustedBlock,
  SHORT_FIELD_MAX,
  UNTRUSTED_MAX_BLOCKS,
  UNTRUSTED_MAX_CHARS,
} from "./envelope";
export type { ToolResult, UntrustedBlock } from "./envelope";

export {
  BANNED_PARAM_NAMES,
  ToolSchemaError,
  toGeminiSchema,
} from "./schema";
export type { GeminiSchema, GeminiSchemaType } from "./schema";

export {
  AGENT_ROLES,
  MODULE_KEYS,
  ToolDefinitionError,
  createRegistry,
  defineTool,
  isAgentRole,
} from "./registry";
export type {
  AgentRole,
  AgentTool,
  AgentToolSpec,
  GeminiFunctionDeclaration,
  ModuleKey,
  ToolKind,
  ToolRegistry,
  ValidationOutcome,
} from "./registry";

export {
  ToolNotAllowedError,
  advanceContext,
  allowedToolNames,
  assertToolAllowed,
  denyReason,
} from "./policy";
export type { DenyReason, TurnContext } from "./policy";

export { MODELS, callGemini, resetClient } from "./gemini";
export type {
  CallModel,
  ModelFunctionCall,
  ModelRequest,
  ModelStep,
  ModelTier,
  ModelUsage,
} from "./gemini";

export { DEFAULT_BUDGET, runTurn } from "./loop";
export type {
  AgentEvent,
  Attachment,
  Budget,
  RunTurnInput,
  ToolCallRecord,
  TurnFinish,
  TurnOutcome,
  WriteProposal,
} from "./loop";
