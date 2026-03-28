"""DAG parser — converts React Flow JSON into an executable directed acyclic graph."""

from collections import defaultdict, deque
from typing import Any


class DAGValidationError(Exception):
    """Raised when the workflow graph is invalid (e.g., contains cycles)."""
    pass


class DAGNode:
    """Represents a single node in the execution DAG."""

    def __init__(self, node_id: str, node_type: str, data: dict):
        self.id = node_id
        self.type = node_type
        self.data = data
        self.dependencies: list[str] = []  # IDs of nodes that must run before this one

    def __repr__(self):
        return f"DAGNode(id={self.id}, type={self.type}, deps={self.dependencies})"


def parse_flow_to_dag(workflow_json_data: dict) -> list[DAGNode]:
    """
    Parse React Flow JSON (nodes + edges) into an ordered list of DAGNodes
    using topological sort (Kahn's algorithm).

    Args:
        workflow_json_data: Dict with "nodes" and "edges" keys from React Flow.

    Returns:
        List of DAGNode in execution order (dependencies first).

    Raises:
        DAGValidationError: If the graph contains a cycle.
    """
    raw_nodes = workflow_json_data.get("nodes", [])
    raw_edges = workflow_json_data.get("edges", [])

    # Build node lookup
    nodes: dict[str, DAGNode] = {}
    for n in raw_nodes:
        nodes[n["id"]] = DAGNode(
            node_id=n["id"],
            node_type=n.get("type", "default"),
            data=n.get("data", {}),
        )

    # Build adjacency list and in-degree counts
    adjacency: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {nid: 0 for nid in nodes}

    for edge in raw_edges:
        src = edge["source"]
        tgt = edge["target"]
        adjacency[src].append(tgt)
        in_degree[tgt] = in_degree.get(tgt, 0) + 1
        if tgt in nodes:
            nodes[tgt].dependencies.append(src)

    # Kahn's algorithm — topological sort
    queue: deque[str] = deque()
    for nid, deg in in_degree.items():
        if deg == 0:
            queue.append(nid)

    execution_order: list[DAGNode] = []
    visited = 0

    while queue:
        current_id = queue.popleft()
        if current_id in nodes:
            execution_order.append(nodes[current_id])
        visited += 1
        for neighbor in adjacency[current_id]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited != len(nodes):
        raise DAGValidationError(
            "Workflow contains a cycle — cannot determine execution order. "
            "Please remove circular connections."
        )

    return execution_order
