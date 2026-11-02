"""Bounded local, non-executable evidence I/O."""
import hashlib
import json
import math
import os
import re
from pathlib import Path, PurePosixPath

JSON_LIMIT = 16 * 1024 * 1024


class EvidenceError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise EvidenceError(message)


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def loads(text):
    def floating(value):
        number = float(value)
        require(math.isfinite(number), "Nonfinite JSON number")
        return number
    try:
        return json.loads(text, object_pairs_hook=_pairs, parse_float=floating,
                          parse_constant=lambda value: (_ for _ in ()).throw(EvidenceError(f"Nonfinite JSON number: {value}")))
    except (json.JSONDecodeError, UnicodeError, RecursionError) as error:
        raise EvidenceError("Invalid JSON evidence") from error


def read_json(path):
    path = Path(path)
    require(path.is_file() and not path.is_symlink(), "Evidence must be a regular file")
    require(path.stat().st_size <= JSON_LIMIT, "JSON evidence exceeds size limit")
    return loads(path.read_text(encoding="utf-8"))


def check_export_text(path):
    """Reject recognizable credentials in explicitly selected text exports.

    This is a limited accidental-disclosure check, not a privacy certification.
    Never redact/overwrite the original run; export a reviewed new version.
    """
    path = Path(path)
    require(path.stat().st_size <= JSON_LIMIT, "Text export exceeds inspection limit")
    text = path.read_text(encoding="utf-8")
    require(not re.search(r"(?:hf_|sk-|gh[pousr]_)[A-Za-z0-9_-]{20,}", text), "Possible credential in selected export")
    if path.suffix in {".json", ".ipynb"}:
        sensitive = {"token", "hf_token", "hub_token", "access_token", "api_key", "secret", "password", "authorization", "push_to_hub_token", "wandb_api_key"}
        def visit(value):
            if isinstance(value, dict):
                for key, item in value.items():
                    require(key.lower() not in sensitive or item in (None, ""), "Credential field in selected JSON export")
                    visit(item)
            elif isinstance(value, list):
                for item in value:
                    visit(item)
        visit(loads(text))


def serialize(value):
    return json.dumps(value, sort_keys=True, indent=2, ensure_ascii=False, allow_nan=False) + "\n"


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def file_under(root, relative):
    require(isinstance(relative, str) and relative, "A relative evidence path is required")
    p = PurePosixPath(relative)
    require(not p.is_absolute() and ".." not in p.parts and "\\" not in relative and ":" not in relative,
            "Evidence path escapes its root")
    root = Path(root).resolve(strict=True)
    path = root
    for part in p.parts:
        path = path / part
        require(not path.is_symlink(), "Symbolic-link evidence is unsupported")
    require(path.is_file() and path.resolve().is_relative_to(root), "Evidence file is missing or outside its root")
    return path


def outside_git(path):
    path = Path(path).resolve()
    require(not any((p / ".git").exists() for p in (path, *path.parents)), "Weight bundles must be outside every Git checkout")
    return path


def write_new(path, value):
    path = Path(path)
    require(not path.exists() and not path.is_symlink(), "Refusing to overwrite existing evidence")
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("x", encoding="utf-8") as stream:
        stream.write(serialize(value))


def finite(value, *, integer=False, positive=False):
    return (not isinstance(value, bool) and isinstance(value, (int, float)) and 0 <= value <= 2**53 - 1
            and (not isinstance(value, float) or math.isfinite(value))
            and (not integer or isinstance(value, int)) and value >= (1 if positive else 0))


def inventory(root):
    """Only model export metadata/weights; no notebook execution or broad data scan."""
    root = Path(root)
    require(root.is_dir() and not root.is_symlink(), "Inventory root must be an existing directory")
    names = {"adapter_config.json", "adapter_model.safetensors", "trainer_state.json", "run.json",
             "environment.json", "training_config.json", "baseline.json", "tuned.json", "smoke.json"}
    files = []
    for parent, dirs, children in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if not (Path(parent) / d).is_symlink() and d not in {".git", "node_modules", "__pycache__"})
        require(len(Path(parent).relative_to(root).parts) <= 8, "Inventory depth limit exceeded")
        for name in sorted(children):
            if name not in names:
                continue
            relative = (Path(parent) / name).relative_to(root).as_posix()
            path = file_under(root, relative)
            files.append({"path": relative, "bytes": path.stat().st_size, "sha256": sha256(path)})
            require(len(files) <= 1000, "Inventory file limit exceeded")
    return {"schemaVersion": "agap-qwn-inventory/v1", "files": files,
            "modelExecutionAttested": False, "promotion": "not_assessed"}
