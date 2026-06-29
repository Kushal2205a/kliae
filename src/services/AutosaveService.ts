import type { EventBus } from "./EventBus";
import type { GraphService } from "./GraphService";
import type { WorkspaceService } from "./WorkspaceService";
import type { NavigationService } from "./NavigationService";

export class AutosaveService {
  private eventBus: EventBus;
  private graphService: GraphService;
  private workspaceService: WorkspaceService;
  private navigationService: NavigationService;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private unsubscribe: (() => void)[] = [];

  constructor(eventBus: EventBus, graphService: GraphService, workspaceService: WorkspaceService, navigationService: NavigationService) {
    this.eventBus = eventBus;
    this.graphService = graphService;
    this.workspaceService = workspaceService;
    this.navigationService = navigationService;
  }

  start(): void {
    this.unsubscribe.push(
      this.eventBus.on("node:created", () => this.saveGraphAndWorkspace(true)),
      this.eventBus.on("node:deleted", () => this.saveGraphAndWorkspace(true)),
      this.eventBus.on("node:updated", () => this.saveGraph(true)),
      this.eventBus.on("node:viewUpdated", () => this.saveGraph(false)),
      this.eventBus.on("edge:created", () => this.saveGraphAndWorkspace(true)),
      this.eventBus.on("edge:deleted", () => this.saveGraphAndWorkspace(true)),
      this.eventBus.on("edge:updated", () => this.saveGraph(true)),
      this.eventBus.on("graph:created", () => this.saveWorkspace(true)),
      this.eventBus.on("graph:deleted", () => this.saveWorkspace(true)),
    );
  }

  stop(): void {
    for (const unsub of this.unsubscribe) {
      unsub();
    }
    this.unsubscribe = [];
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  private async saveGraph(immediate: boolean): Promise<void> {
    const graphId = this.getCurrentGraphId();
    if (!graphId) return;
    await this.schedule(`graph:${graphId}`, immediate, async () => {
      const graph = this.graphService.getGraph(graphId);
      if (graph) {
        await this.graphService.save(graph);
      }
    });
  }

  private async saveGraphAndWorkspace(immediate: boolean): Promise<void> {
    await this.saveGraph(immediate);
    await this.saveWorkspace(immediate);
  }

  private async saveWorkspace(immediate: boolean): Promise<void> {
    await this.schedule("workspace", immediate, async () => {
      await this.workspaceService.save();
    });
  }

  private async schedule(key: string, immediate: boolean, fn: () => Promise<void>): Promise<void> {
    const existing = this.debounceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    if (immediate) {
      await fn();
      this.debounceTimers.delete(key);
    } else {
      return new Promise<void>((resolve) => {
        this.debounceTimers.set(
          key,
          setTimeout(async () => {
            await fn();
            this.debounceTimers.delete(key);
            resolve();
          }, 500),
        );
      });
    }
  }

  private getCurrentGraphId(): string | undefined {
    return this.navigationService.getCurrentGraphId();
  }
}
