"""Small fail-closed JSON Schema consumer for the producer's finding schema.

The field/type registry remains Earl/Robert's generated schema, not a Python copy.
Unsupported schema vocabulary requires review instead of silently passing.
"""
import datetime
import re
from .files import EvidenceError, require

SUPPORTED = {"$schema", "$id", "$defs", "$ref", "title", "description", "default", "examples", "type", "properties", "required",
             "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum",
             "exclusiveMinimum", "exclusiveMaximum", "pattern", "format", "enum", "const", "anyOf", "oneOf", "allOf"}


def check_schema(schema, depth=0):
    require(depth < 64 and isinstance(schema, (dict, bool)), "Unsupported/deep JSON Schema")
    if isinstance(schema, bool):
        return
    require(not set(schema) - SUPPORTED, "Unsupported producer schema vocabulary")
    for name in ("properties", "$defs"):
        for sub in schema.get(name, {}).values():
            check_schema(sub, depth + 1)
    for name in ("anyOf", "oneOf", "allOf"):
        for sub in schema.get(name, []):
            check_schema(sub, depth + 1)
    for name in ("items", "additionalProperties"):
        if name in schema:
            check_schema(schema[name], depth + 1)


def validate(value, schema, root=None, depth=0):
    require(depth < 64 and isinstance(schema, (dict, bool)), "Unsupported/deep JSON Schema")
    if isinstance(schema, bool):
        require(schema, "Schema rejects value")
        return
    if root is None:
        check_schema(schema)
    root = schema if root is None else root
    require(not set(schema) - SUPPORTED, "Unsupported producer schema vocabulary")
    if "$ref" in schema:
        ref = schema["$ref"]
        require(isinstance(ref, str) and ref.startswith("#/"), "Only local schema references are supported")
        target = root
        for key in ref[2:].split("/"):
            target = target[key.replace("~1", "/").replace("~0", "~")]
        validate(value, target, root, depth + 1)
    for keyword in ("anyOf", "oneOf", "allOf"):
        if keyword in schema:
            matches = 0
            for sub in schema[keyword]:
                try:
                    validate(value, sub, root, depth + 1)
                    matches += 1
                except EvidenceError:
                    pass
            require(matches == len(schema[keyword]) if keyword == "allOf" else matches == 1 if keyword == "oneOf" else matches > 0,
                    "Value fails producer union schema")
    if "const" in schema:
        require(type(value) is type(schema["const"]) and value == schema["const"], "Value differs from schema constant")
    if "enum" in schema:
        require(any(type(value) is type(item) and value == item for item in schema["enum"]), "Value is outside schema enum")
    kind = schema.get("type")
    types = {"object": isinstance(value, dict), "array": isinstance(value, list), "string": isinstance(value, str),
             "integer": isinstance(value, int) and not isinstance(value, bool),
             "number": isinstance(value, (int, float)) and not isinstance(value, bool), "boolean": isinstance(value, bool), "null": value is None}
    require(kind is None or kind in types and types[kind], "Value has incorrect schema type")
    if isinstance(value, dict):
        require(set(schema.get("required", [])) <= value.keys(), "Required finding fields missing")
        properties = schema.get("properties", {})
        for key, item in value.items():
            sub = properties.get(key, schema.get("additionalProperties", True))
            validate(item, sub, root, depth + 1)
    elif isinstance(value, list):
        require(schema.get("minItems", 0) <= len(value) <= schema.get("maxItems", 100000), "Array size outside schema")
        for item in value:
            validate(item, schema.get("items", True), root, depth + 1)
    elif isinstance(value, str):
        require(schema.get("minLength", 0) <= len(value) <= schema.get("maxLength", 1000000), "Text length outside schema")
        if "pattern" in schema:
            require(re.search(schema["pattern"], value), "Text differs from producer schema pattern")
        if schema.get("format") == "date":
            try:
                datetime.date.fromisoformat(value)
            except ValueError as error:
                raise EvidenceError("Invalid calendar date") from error
        elif schema.get("format") == "date-time":
            require(datetime.datetime.fromisoformat(value.replace("Z", "+00:00")).tzinfo is not None, "Instant needs a timezone")
        else:
            require(schema.get("format") in (None, "uuid"), "Unsupported schema format")
            if schema.get("format") == "uuid":
                require(re.fullmatch(r"[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}", value), "Invalid UUID")
    elif isinstance(value, (int, float)) and not isinstance(value, bool):
        require(schema.get("minimum", float("-inf")) <= value <= schema.get("maximum", float("inf")), "Number outside schema bounds")
        require(value > schema.get("exclusiveMinimum", float("-inf")) and value < schema.get("exclusiveMaximum", float("inf")), "Number outside exclusive schema bounds")
