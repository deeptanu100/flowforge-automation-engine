# FlowForge Features

FlowForge is a high-performance local automation engine designed for developers and AI engineers.

## Core Canvas (Visual Programming)

- **Directed Acyclic Graph (DAG) Editor**:
  - Drag-and-drop React Flow canvas.
  - Interactive nodes for API requests, Local Compute, and Tutorials.
  - Real-time connection validation.
  - Auto-layout support and MiniMap for complex flows.

## Hybrid Execution Engine

- **API Request Nodes**:
  - Full support for standard HTTP methods (GET, POST, PUT, DELETE).
  - Dynamic JSON body and header templating with dependency injection.
  - Timeout management and retry logic.

- **Local Compute Nodes**:
  - High-performance execution on **CPU**, **NVIDIA (CUDA)**, or **Apple Silicon (MPS)**.
  - Isolated process pools for heavy AI model execution (like `Sentiment Analysis`).
  - Native performance metrics (latency, data throughput).

## Security & Privacy (Local-First)

- **Secure Credentials Manager**:
  - All API keys are encrypted with **AES-256** using the `cryptography` library.
  - No cloud-side storage; all data stays on your local filesystem.
  - Secure injection of credentials into execution context.

## Performance & Token Tracking

- **Token Consumption Monitoring**:
  - Real-time **LLM Token Estimation** for LLM-based API calls.
  - Metrics for request and response byte sizes.
  - Execution duration logging (in milliseconds) for bottleneck detection.

## Hardware Acceleration (HAL)

- **Automatic Device Detection**:
  - Seamlessly detects and leverages native AI accelerators.
  - Supports **CUDA (NVIDIA GPU)**, **MPS (Apple Metal)**, and **NPU** platforms.
  - Optimizes execution based on your local system's capabilities.

## Tutorials & Documentation

- **In-Canvas Notes**:
  - Built-in `TutorialNode` with full markdown support.
  - Persistent documentation within the workflow file.
  - Integrated "Quick Start" nodes for new users.

## Node Management *(v1.1)*

- **Node Deletion with Two-Step Confirmation**:
  - Delete any node from the canvas via a trash icon button in the node header.
  - Two-step safety confirmation: tick a mandatory checkbox before the delete action is enabled.
  - Automatically removes all connected edges when a node is deleted.
  - Confirmation panel auto-dismisses after 8 seconds of inactivity.
  - Non-intrusive design — delete button only appears on node hover.

