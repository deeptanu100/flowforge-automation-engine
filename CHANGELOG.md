# Changelog

All notable changes to FlowForge Automation Engine will be documented in this file.

---

## [v1.3.1] — 2026-04-03

### ✨ Performance & Optimizations

- **Frontend Scalability**: Refactored global canvas state updates by implementing native `@xyflow/react` atomic `updateNodeData` actions. This dramatically reduces React re-renders and eliminates multi-second input lag when editing node parameters in massive dependency graphs.
- **Backend Optimizations**: Added direct SQLite `index=True` flags for critical foreign keys (`workflow_id`, `execution_id`) and status parameters in the database models, drastically speeding up queries for long-term workflow storage and cron metric execution.

---

## [v1.3.0] — 2026-04-02

### ✨ New Features (Tier 1 Implementation)

- **Workflow Persistence**: Implemented SQLite-backed version history with the new `WorkflowBrowser` sidebar panel, allowing users to save, browse, and restore workflow snapshots.
- **Flow Control Nodes**: Introduced **Conditional** (branching) and **Loop** (iterator) graph nodes fully functional in the executor engine to enable logic execution and iteration.
- **Error Resilience**: Added an "Advanced" config panel to API and Compute nodes to configure exponential or linear retries, tracking, and "Continue-on-Error" behavior.
- **Cron Scheduling**: Dedicated `APScheduler` loop running on the backend seamlessly connected to a new schedule user interface in the Workspace dashboard.
- **Liquid Glass Theme Enhancements**: Enhanced the premium aesthetics with glassmorphism tabs, pulsating amber/emerald status dots, and a styled schedule widget.

---

## [v1.2.1] — 2026-03-30

### ✨ UI/UX Enhancements

- **Massive Command Nodes**: Scaled the default node dimensions significantly to exactly match the width of the top navigation toolbar (`600px`). The nodes now feel like substantial desktop panels rather than tiny badges.
- **Proportional Glassmorphism**: Vertically scaled the typography and increased corner rounding to a plush `32px` to ensure the wider nodes retain their ultra-premium Apple-like Liquid Glass proportionality.
- **Auto-Initialization**: Added a smart initialization hook. The canvas now automatically spawns a perfectly-centered `API Request` node the second the application loads, so you never look at a blank grid.
- **Grid Collision Mathematics**: Rewrote the horizontal layout math to correctly offset grids by `640px` for the massive new nodes, preventing any possibility of UI overlap when rapidly creating multiple blocks.

### 🐛 Bug Fixes

- **1:1 Native Scale Rendering (FitView Camera Glitch)**: Fixed a frustrating optical illusion where increasing the physical CSS dimension of a node caused React Flow's `fitView` camera to dynamically zoom out, making the nodes appear visually identical in size. Explicitly stripped `fitView` and enforced `zoom: 1` locking to guarantee the massive 600px width natively renders at 1:1 monitor scale across all machines.

---

## [v1.2.0] — 2026-03-30

### ✨ New Features

- **Liquid Glass Interactive Dot Grid Background**
  - Completely redesigned the canvas background to an ultra-premium "Liquid Glass" dynamic dot grid.
  - Features an evenly distributed base grid faintly visible at a low 15% opacity globally.
  - Introduces a blazing-fast, GPU-accelerated 350px interactive cursor spotlight that smoothly brightens the nearest cyan dots to 100% opacity as the mouse moves across the canvas.
  - Fully synchronized with React Flow pan & zoom mechanics ensuring perfect dot-alignment.

### 🐛 Bug Fixes & Refinements

- **Exclusive Button Zoom Control**: Explicitly disabled mouse scroll wheel zooming, pinch-to-zoom, and double-click zooming. Sizing of the canvas workflow is now strictly controlled by the dedicated zoom (+/-) buttons in the corner, preventing accidental screen re-scaling during panning.
- **Node Connection Overhaul**: Fixed a critical `overflow: hidden` CSS clipping bug on `flow-node` containers that was decapitating the React Flow connection handles, causing failed wire dragging. Handles are now fully exposed, hit-boxing perfectly.
- **Performance Tiers**: Decoupled the cursor glow engine from React `useState` cycles to utilize pure DOM references and `requestAnimationFrame`. This entirely eliminated UI stutter, dropping high-Hz mouse polling lag to zero.

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
