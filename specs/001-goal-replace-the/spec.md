# Feature Specification: Claude-Code Native Integration for Morph Fast-Apply

**Feature Branch**: `001-goal-replace-the`  
**Created**: 2025-09-07
**Status**: Draft  
**Input**: User description: "Goal: Replace the git-hook approach of the current project state with a Claude-Code–native integration that auto-runs Morph Fast-Apply after code edits, plus a manual /morph-apply command and a proactive subagent. The installer must ask whether to install Globally (~/.claude), Project-only (.claude), or Both, and then provision the right files/config for each target. Detailed guideline for this implemntation is here @/Users/bbrenner/Documents/Scripting Projects/mighty-morphin-claude/docs/upgrade-guide.md"

## Execution Flow (main)
```
1. Parse user description from Input
   → If empty: ERROR "No feature description provided"
2. Extract key concepts from description
   → Identify: actors, actions, data, constraints
3. For each unclear aspect:
   → Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
   → If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
   → Each requirement must be testable
   → Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
   → If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
   → If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements
- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation
When creating this spec from a user prompt:
1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies  
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a developer using Claude-Code, I want to have my code edits automatically merged using Morph Fast-Apply so that I don't have to manually resolve conflicts and can maintain a clean code structure. I also want to be able to manually trigger the merge process and be prompted to use it when appropriate.

### Acceptance Scenarios
1. **Given** a developer has installed the integration, **When** they edit a file using a Claude-Code tool (Edit, Write, MultiEdit), **Then** the changes are automatically merged into the file using Morph Fast-Apply.
2. **Given** a developer has installed the integration, **When** they run the `/morph-apply` command with a description and file path, **Then** the described change is merged into the specified file.
3. **Given** a developer has installed the integration, **When** they edit a file, **Then** a subagent proactively suggests using `/morph-apply` to merge the changes.
4. **Given** a developer runs the installer, **When** they choose a project-only installation, **Then** the configuration is written to `.claude/` in the current project.
5. **Given** a developer runs the installer, **When** they choose a global installation, **Then** the configuration is written to `~/.claude/`.
6. **Given** a developer runs the installer, **When** they choose both, **Then** the configuration is written to both locations.

### Edge Cases
- What happens if the `MORPH_LLM_API_KEY` is not set?
- What happens if the merge fails?
- What happens if the user runs the installer with `--noninteractive`?
- What happens if the user runs the installer with `--uninstall`?

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The system MUST provide an interactive installer that allows users to choose between project, global, or both installation scopes.
- **FR-002**: The system MUST automatically trigger a Morph Fast-Apply merge after a user edits a file with `Edit`, `Write`, or `MultiEdit` tools.
- **FR-003**: The system MUST provide a `/morph-apply` slash command for manual merges.
- **FR-004**: The system MUST include a proactive subagent that suggests using `/morph-apply` after code edits.
- **FR-005**: The installer MUST handle `MORPH_LLM_API_KEY` by either using the environment variable or prompting the user to store it securely.
- **FR-006**: The system MUST provide a smoke test to verify the hook functionality.
- **FR-007**: The system MUST update the README with instructions for the new features.
- **FR-008**: [NEEDS CLARIFICATION: The spec mentions removing old git-hook logic as optional. Should this be a requirement?]

### Key Entities *(include if feature involves data)*
- **Configuration**: Represents the settings for the integration, including hooks, commands, and agents. Can be stored at the project or global level.
- **Hook**: A script that is triggered by a Claude-Code event (e.g., `PostToolUse`).
- **Command**: A user-invokable action (e.g., `/morph-apply`).
- **Agent**: A proactive assistant that can suggest actions.

### Dependency/Reference Material
- [Claude-Code Hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Claude-Code Slash Commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [Claude-Code Sub-Agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents)
- [Example of custom sub-agents, hooks and commands working together](https://docs.heysol.ai/providers/claude-code)

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

---

## Execution Status
*Updated by main() during processing*

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed

---