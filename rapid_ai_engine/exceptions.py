"""
RAPID AI — Exception Hierarchy

Zen of Python: "Errors should never pass silently. Unless explicitly silenced."
"""


class RapidAIError(Exception):
    """Base exception for all RAPID AI errors."""
    pass


class DataQualityError(RapidAIError):
    """Raised when Module 0 detects data quality issues that block the pipeline."""
    pass


class RuleEvaluationError(RapidAIError):
    """Raised when rule evaluation fails (Module B, C, E)."""
    pass


class PipelineAbortError(RapidAIError):
    """Raised when the pipeline must abort."""
    pass


class ConfigurationError(RapidAIError):
    """Raised when configuration (rules, profiles, thresholds) is invalid."""
    pass
