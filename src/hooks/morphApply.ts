import pc from "picocolors";
import { MorphEditInterceptor, EditRequest, EditResult, FilePayload } from '../core/backend.js'; // Import necessary types and MorphEditInterceptor

/**
 * Represents a pre-tool-use hook for intercepting and handling tool calls.
 */
export class PreToolUseHook {
  private morphEditInterceptor: MorphEditInterceptor;

  /**
   * Creates an instance of PreToolUseHook.
   * @param account The account name for the MorphLLM API.
   */
  constructor(account: string) {
    this.morphEditInterceptor = new MorphEditInterceptor(account);
  }

  /**
   * Intercepts a tool call before it is executed.
   * @param toolName The name of the tool being called.
   * @param toolInput The arguments passed to the tool.
   * @param toolResp The tool response (can contain filePath).
   * @returns True if the tool call was handled and should not be executed by Claude, false otherwise.
   */
  async onPreToolUse(toolName: string, toolInput: any, toolResp: any): Promise<boolean> {
    // Check if it's a file edit operation
    const isFileEditTool = ["write_file", "replace", "MultiEdit", "Edit"].includes(toolName);

    if (isFileEditTool) {
      const filePath: string | undefined =
        toolResp?.filePath ??
        toolResp?.path ??
        toolInput?.file_path ??
        toolInput?.filepath ??
        toolInput?.path;
      const content: string | undefined = toolInput?.content; // For write_file
      const oldString: string | undefined = toolInput?.old_string; // For replace
      const newString: string | undefined = toolInput?.new_string; // For replace

      if (!filePath) {
        console.error(pc.yellow(`[morph] PreToolUseHook: No file_path resolved for tool ${toolName}; skipping interception.`));
        return false;
      }

      let files: FilePayload[] = [];
      if (toolName === "write_file" && content) {
        files.push({ path: filePath, content: content });
      } else if (toolName === "replace" && oldString && newString) {
        // For replace, we need the original content to create a proper diff/patch
        // For now, we'll just pass the new content as the "target" content for MorphLLM
        // A more robust solution would involve reading the original file content here.
        files.push({ path: filePath, content: newString }); 
      } else if (toolName === "Edit" || toolName === "MultiEdit") {
        // Assuming Edit and MultiEdit tools provide a structure that can be converted to FilePayload[]
        // This part needs to be adapted based on the actual structure of Edit/MultiEdit toolInput
        // For now, let's assume toolInput.files is an array of { path, content }
        if (toolInput.files && Array.isArray(toolInput.files)) {
          files = toolInput.files.map((f: any) => ({ path: f.path, content: f.content }));
        } else if (toolInput.file_path && toolInput.content !== undefined) {
          // Handle single file edit from Edit tool
          files.push({ path: toolInput.file_path, content: toolInput.content });
        }
      } else {
        console.error(pc.yellow(`[morph] PreToolUseHook: Unsupported tool input for ${toolName}; skipping interception.`));
        return false;
      }

      if (files.length === 0) {
        console.error(pc.yellow(`[morph] PreToolUseHook: No valid file payloads for tool ${toolName}; skipping interception.`));
        return false;
      }

      const editRequest: EditRequest = {
        goal: `Apply changes from Claude's ${toolName} tool.`, // Generic goal
        files: files,
      };

      try {
        const editResult: EditResult = await this.morphEditInterceptor.interceptAndApply(editRequest);

        if (editResult.success) {
          console.log(pc.green(`[morph] PreToolUseHook: Successfully applied changes for ${toolName} to ${editResult.modifiedFiles?.map(f => f.path).join(', ')}`));
          return true; // Handled by MorphLLM, Claude's original tool should be skipped
        } else {
          console.error(pc.red(`[morph] PreToolUseHook: MorphLLM failed to apply changes for ${toolName}: ${editResult.error}. Falling back to Claude's original tool.`));
          return false; // MorphLLM failed, Claude's original tool should proceed
        }
      } catch (e: any) {
        console.error(pc.red(`[morph] PreToolUseHook: Error during MorphLLM interception for ${toolName}: ${e?.message ?? String(e)}. Falling back to Claude's original tool.`));
        return false; // Error during interception, Claude's original tool should proceed
      }
    } else {
      // Not a file edit tool, do not intercept
      return false;
    }
  }
}