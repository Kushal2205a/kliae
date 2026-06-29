import type { NodeService } from "../services/NodeService";
import type { EdgeService } from "../services/EdgeService";
import type { GraphService } from "../services/GraphService";
import type { WorkspaceService } from "../services/WorkspaceService";
import type { NavigationService } from "../services/NavigationService";
import type { EventBus } from "../services/EventBus";

export interface CommandContext {
  eventBus: EventBus;
  nodeService: NodeService;
  edgeService: EdgeService;
  graphService: GraphService;
  workspaceService: WorkspaceService;
  navigationService: NavigationService;
}

export interface Command {
  readonly type: string;
  readonly label: string;
  readonly description?: string;
  readonly shortcut?: string;
  execute(ctx: CommandContext): void | Promise<void>;
  undo(ctx: CommandContext): void | Promise<void>;
}
