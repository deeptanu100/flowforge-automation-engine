"""DAG parser — converts React Flow JSON into an executable directed acyclic graph."""

from collections import defaultdict, deque
from typing import Any


class DAGValidationError(Exception):
    """Raised when the workflow graph is invalid (e.g., contains cycles)."""
    pass


class DAGEdge:
    """Represents a connection between two nodes with optional handle info."""

    def __init__(self, source: str, target: str, source_handle: str | None = None):
        self.source = source
        self.target = target
        self.source_handle = source_handle  # e.g., "true-output", "false-output"


class DAGNode:
    """Represents a single node in the execution DAG."""

    def __init__(self, node_id: str, node_type: str, data: dict):
        self.id = node_id
        self.type = node_type
        self.data = data
        self.dependencies: list[str] = []  # IDs of nodes that must run before this one
        self.incoming_handles: dict[str, str] = {}  # {source_node_id: source_handle}
        self.is_loop = node_type == "loop"

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

    # Build edge list with handle info
    edges: list[DAGEdge] = []
    for edge in raw_edges:
        edges.append(DAGEdge(
            source=edge["source"],
            target=edge["target"],
            source_handle=edge.get("sourceHandle"),
        ))

    # Build adjacency list and in-degree counts
    adjacency: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {nid: 0 for nid in nodes}

    for edge in edges:
        adjacency[edge.source].append(edge.target)
        in_degree[edge.target] = in_degree.get(edge.target, 0) + 1
        if edge.target in nodes:
            nodes[edge.target].dependencies.append(edge.source)
            nodes[edge.target].incoming_handles[edge.source] = edge.source_handle

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


def get_downstream_nodes(node_id: str, edges: list[DAGEdge], source_handle: str | None = None) -> set[str]:
    """Get all node IDs downstream of a given node, optionally filtered by source handle."""
    downstream = set()
    queue = deque()

    # Find direct children matching the handle filter
    for edge in edges:
        if edge.source == node_id:
            if source_handle is None or edge.source_handle == source_handle:
                queue.append(edge.target)

    while queue:
        current = queue.popleft()
        if current in downstream:
            continue
        downstream.add(current)
        for edge in edges:
            if edge.source == current:
                queue.append(edge.target)

    return downstream


def build_edge_list(workflow_json_data: dict) -> list[DAGEdge]:
    """Build a list of DAGEdge from raw workflow JSON."""
    return [
        DAGEdge(
            source=e["source"],
            target=e["target"],
            source_handle=e.get("sourceHandle"),
        )
        for e in workflow_json_data.get("edges", [])
    ]
