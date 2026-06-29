import type { Command, CommandContext } from "../types";

const MAX_HISTORY = 100;

export class CommandHistoryService {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private ctx: CommandContext;

  constructor(ctx: CommandContext) {
    this.ctx = ctx;
  }

  async execute(command: Command): Promise<void> {
    await command.execute(this.ctx);
    this.undoStack.push(command);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  async undo(): Promise<Command | undefined> {
    const command = this.undoStack.pop();
    if (!command) return undefined;
    await command.undo(this.ctx);
    this.redoStack.push(command);
    return command;
  }

  async redo(): Promise<Command | undefined> {
    const command = this.redoStack.pop();
    if (!command) return undefined;
    await command.execute(this.ctx);
    this.undoStack.push(command);
    return command;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoStack(): Command[] {
    return [...this.undoStack];
  }

  getRedoStack(): Command[] {
    return [...this.redoStack];
  }
}
