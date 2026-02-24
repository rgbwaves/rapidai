"""
YAML Rule Loader — loads externalized rules at startup and caches them.
"""
import os
from typing import Any, Dict, List
from functools import lru_cache

import yaml

from ..exceptions import ConfigurationError

_RULES_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_yaml(filename: str) -> Dict[str, Any]:
    """Load a YAML file from the rules directory."""
    path = os.path.join(_RULES_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        raise ConfigurationError(f"Rule file not found: {path}")
    except yaml.YAMLError as e:
        raise ConfigurationError(f"Invalid YAML in {path}: {e}")


@lru_cache(maxsize=1)
def load_actions() -> Dict[str, Any]:
    """Load action catalog and diagnosis mapping."""
    data = _load_yaml("actions.yaml")
    result = dict(data.get("actions", {}))
    result["diagnosis_map"] = data.get("diagnosis_map", {})
    return result


@lru_cache(maxsize=1)
def load_profiles() -> Dict[str, Any]:
    """Load system profiles with weights."""
    return _load_yaml("profiles.yaml")


@lru_cache(maxsize=1)
def load_block_scores() -> List[Dict[str, Any]]:
    """Load block score rules (priority-ordered)."""
    data = _load_yaml("block_scores.yaml")
    return data.get("rules", [])
