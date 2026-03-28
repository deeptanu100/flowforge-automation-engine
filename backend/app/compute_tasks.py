"""Isolated compute tasks for FlowForge."""

import logging

logger = logging.getLogger(__name__)

def run_sentiment_analysis(text: str, device: str) -> dict:
    """
    Proof of Concept: Heavy compute task using HuggingFace Transformers.
    Forces execution on the specified device with fallback to CPU.
    """
    import torch
    from transformers import pipeline
    
    # Translate our device naming to PyTorch's format
    torch_device = "cpu"
    if device == "cuda" and torch.cuda.is_available():
        torch_device = "cuda:0"
    elif device == "mps" and hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        torch_device = "mps"
        
    fallback_triggered = False
    
    try:
        logger.info(f"Loading sentiment analysis pipeline on {torch_device}")
        
        # Load the pipeline on the requested device
        classifier = pipeline("sentiment-analysis", device=torch_device)
        
        # Execute the pipeline with the input text
        results = classifier(text)
        
        return {
            "status": "success",
            "device_used": torch_device,
            "fallback_triggered": fallback_triggered,
            "results": results,
            "input": text
        }
    except Exception as e:
        logger.error(f"Failed to run pipeline on {torch_device}: {e}")
        # Trigger Fallback
        if torch_device != "cpu":
            logger.info("Triggering fallback to CPU execution.")
            try:
                fallback_triggered = True
                classifier_fallback = pipeline("sentiment-analysis", device="cpu")
                results = classifier_fallback(text)
                
                return {
                    "status": "success",
                    "device_used": "cpu",
                    "fallback_triggered": fallback_triggered,
                    "results": results,
                    "warning": f"Requested {device} failed, fell back to CPU. Original error: {str(e)}",
                    "input": text
                }
            except Exception as e2:
                logger.error(f"Fallback to CPU also failed: {e2}")
                raise RuntimeError(f"Pipeline failed on both {device} and cpu. Error: {str(e2)}")
        else:
            # If we were already on CPU there's nowhere to fall back to
            raise RuntimeError(f"Pipeline failed on CPU. Error: {str(e)}")
