# Changelog

All notable changes to FlowForge Automation Engine will be documented in this file.

---

## [v1.1.0] — 2026-03-30

### ✨ New Features

- **Node Deletion with Two-Step Confirmation**
  - Each workflow node (API Request, Local Compute, Tutorial) now has a **delete button** (🗑️ trash icon) visible on hover in the node header.
  - Clicking the delete button opens a **confirmation panel** with:
    - ⚠️ A warning header and a description of the destructive action.
    - ☑️ A **mandatory confirmation checkbox** — the user must explicitly tick _"I confirm I want to delete this node"_ before the delete button activates.
    - **Cancel** and **Delete** action buttons — Delete remains disabled until the checkbox is ticked.
  - Confirmation panel **auto-dismisses** after 8 seconds of inactivity or on outside click.
  - Deleting a node **also removes all connected edges** (both incoming and outgoing connections).

### 🎨 UI/UX Enhancements

- Delete button uses a subtle, non-intrusive design — hidden by default, appears only on node hover.
- Confirmation panel uses the existing **Liquid Glass design system** with animated entry, custom checkbox glow effect, and color-coded warning states.
- Delete button smoothly transitions to a red highlight on hover for clear destructive-action signaling.

### 🏗️ Technical Changes

- **New Component**: `NodeDeleteButton.tsx` — A reusable two-step delete confirmation widget with outside-click detection and auto-timeout.
- **Updated Hook**: `useWorkflow.ts` — Added `deleteNode` callback that removes the target node and all connected edges from the React Flow state.
- **Updated Nodes**: `ApiRequestNode.tsx`, `LocalComputeNode.tsx`, `TutorialNode.tsx` — Integrated `NodeDeleteButton` into each node's header bar.
- **Updated Styles**: `index.css` — Added comprehensive CSS for delete button, confirmation popup, custom checkbox, and animated transitions.

---

## [v1.0.0] — 2026-03-28

### 🎉 Initial Release

- Visual DAG-based workflow canvas powered by React Flow.
- API Request nodes with full HTTP method support and JSON templating.
- Local Compute nodes with CPU/GPU/NPU hardware acceleration.
- Tutorial/Note nodes with in-canvas markdown documentation.
- Secure Credentials Manager with AES-256 encryption.
- Real-time token consumption monitoring and execution metrics.
- Execution Output panel with per-node results display.
- Side panel dashboard with token usage statistics.
- Liquid Glass UI design system with dark mode aesthetics.
- GitHub Pages auto-deployment via GitHub Actions.
- Proprietary license with Indian legal jurisdiction.
