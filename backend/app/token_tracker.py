"""Token usage estimation and tracking for FlowForge."""

from typing import Optional
import json


def estimate_tokens(
    response_headers: dict,
    response_body: bytes,
    request_body: bytes = b"",
) -> int:
    """
    Estimate token usage from an API response.

    Strategy:
    1. Check for OpenAI-style usage headers/body (x-ratelimit-*, usage.total_tokens)
    2. Check for Anthropic-style usage
    3. Fall back to byte-based estimation (~4 chars per token)
    """

    # 1. Try to parse usage from response body (OpenAI, Anthropic, etc.)
    try:
        body_json = json.loads(response_body)
        if isinstance(body_json, dict):
            # OpenAI format
            usage = body_json.get("usage", {})
            if usage and "total_tokens" in usage:
                return int(usage["total_tokens"])

            # Anthropic format
            if "usage" in body_json:
                u = body_json["usage"]
                input_t = u.get("input_tokens", 0)
                output_t = u.get("output_tokens", 0)
                if input_t or output_t:
                    return input_t + output_t
    except (json.JSONDecodeError, ValueError, TypeError):
        pass

    # 2. Check response headers for rate limit info
    headers_lower = {k.lower(): v for k, v in response_headers.items()}
    if "x-ratelimit-remaining-tokens" in headers_lower:
        try:
            return max(0, int(headers_lower.get("x-ratelimit-limit-tokens", 0)) -
                       int(headers_lower["x-ratelimit-remaining-tokens"]))
        except (ValueError, TypeError):
            pass

    # 3. Fallback: estimate from content size (~4 chars per token)
    total_chars = len(request_body) + len(response_body)
    return max(1, total_chars // 4)


def estimate_cost(tokens: int, model: str = "unknown") -> float:
    """
    Rough cost estimation based on token count.
    Rates are approximate and will vary by provider.
    """
    rates = {
        "gpt-4": 0.00006,       # $0.06 per 1K tokens (blended)
        "gpt-3.5": 0.000002,    # $0.002 per 1K tokens
        "claude-3": 0.000015,   # $0.015 per 1K tokens (blended)
        "gemini": 0.0000005,    # $0.0005 per 1K tokens
        "unknown": 0.00001,     # Default conservative estimate
    }
    rate = rates.get(model.lower(), rates["unknown"])
    return round(tokens * rate, 6)
