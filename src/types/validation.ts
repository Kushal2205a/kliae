export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  sourceObject: { type: "node" | "edge" | "graph"; id: string };
  graphId?: string;
}
