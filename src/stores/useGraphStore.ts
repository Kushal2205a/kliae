import { create } from "zustand";
import type { Graph } from "../types";
import type { ValidationIssue } from "../types";

interface GraphState {
  graphs: Map<string, Graph>;
  validationIssues: ValidationIssue[];

  setGraphs: (graphs: Map<string, Graph>) => void;
  setValidationIssues: (issues: ValidationIssue[]) => void;
  clear: () => void;
}

export const useGraphStore = create<GraphState>((set) => ({
  graphs: new Map(),
  validationIssues: [],

  setGraphs: (graphs) => set({ graphs }),
  setValidationIssues: (issues) => set({ validationIssues: issues }),
  clear: () => set({ graphs: new Map(), validationIssues: [] }),
}));
