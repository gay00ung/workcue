---
name: workcue-product-context
description: "Use the WorkCue product plan and local-first architecture constraints as required project context. Use inside this harness when the task requires this capability."
---

# Workcue Product Context

## Purpose

Use the WorkCue product plan and local-first architecture constraints as required project context.

## Required Product Principle

WorkCue is not another todo app or kanban board. WorkCue is the morning intelligence layer over existing work tools.

Preserve these constraints:

- Existing tools remain the source of truth.
- Read-first, write-later.
- Deterministic scoring before optional LLM summaries.
- Every recommendation must have evidence.
- Local-first and self-hostable by default.
- Pluggable sources and outputs.
- The first user value moment is the morning brief.

## Procedure

1. Read `${WORKCUE_PRODUCT_PLAN}`.
2. Extract only product constraints relevant to the current task.
3. Reject changes that turn WorkCue into a full task management replacement unless the user explicitly changes strategy.
4. Prefer connector, scoring, brief, privacy, automation, and MCP work over dashboard-heavy scope in early milestones.
5. Save reusable product decisions to the relevant Obsidian domain file.

## Quality Bar

- Prefer project conventions and existing tools.
- Keep outputs structured and easy to merge with other role outputs.
- Do not hide partial failures; record them with enough detail for a rerun.
- Product decisions must be traceable to the product plan or explicitly recorded as a new decision.
