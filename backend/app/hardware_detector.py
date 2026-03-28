"""Hardware detection logic for FlowForge.

Detects available local compute capabilities: CPUs, CUDA GPUs, Apple MPS, and NPUs.
"""

import logging

logger = logging.getLogger(__name__)

def get_hardware_status() -> dict[str, bool]:
    """Check for local execution environments/devices."""
    devices = {
        "cpu": True,
        "cuda": False,
        "mps": False,
        "npu": False,
    }

    # 1. Check for CUDA
    try:
        import torch
        if torch.cuda.is_available():
            devices["cuda"] = True
    except ImportError:
        logger.warning("torch not installed, skipping CUDA check.")
    except Exception as e:
        logger.error(f"Error checking CUDA: {e}")

    # 2. Check for MPS (Apple Silicon)
    try:
        import torch
        # 'mps' backend typically needs to be built with MPS support
        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            devices["mps"] = True
    except ImportError:
        pass
    except Exception as e:
        logger.error(f"Error checking MPS: {e}")

    # 3. Check for NPU/Specialized via ONNX
    try:
        import onnxruntime as ort
        providers = ort.get_available_providers()
        
        # OpenVINO, DirectML, QNN correspond mostly to NPU/integrated accelerators
        npu_providers = [
            "OpenVINOExecutionProvider",
            "DmlExecutionProvider",
            "QNNExecutionProvider",
            "VitisAIExecutionProvider",
            "CoreMLExecutionProvider",
            "ArmNNExecutionProvider",
        ]
        
        if any(p in providers for p in npu_providers):
            devices["npu"] = True
    except ImportError:
        logger.warning("onnxruntime not installed, skipping NPU check.")
    except Exception as e:
        logger.error(f"Error checking NPU/ONNX providers: {e}")

    return devices
