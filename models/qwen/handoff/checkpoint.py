"""Inspect a supported PEFT LoRA safetensors layout without loading tensors."""
import math
import hashlib
import re
import struct
from .files import JSON_LIMIT, loads, read_json, require, finite, sha256

DTYPES = {"F16": 2, "BF16": 2, "F32": 4, "F64": 8}
# Exact inspected Unsloth language-only expression from the supplied D export.
# Do not execute arbitrary user-supplied regular expressions.
UNSLOTH_TARGET_SHA = "901b5029e24f0486939f2ed5d78033e6a5470500bad26f02bcaf414c4077a1f3"


def inspect_adapter(config_path, weights_path, base, revision):
    config = read_json(config_path)
    require(config.get("peft_type") == "LORA" and config.get("base_model_name_or_path") == base,
            "Adapter type/base differs from declared LoRA run")
    require(config.get("revision") in (None, revision), "Adapter base revision differs")
    require(finite(config.get("r"), integer=True, positive=True) and finite(config.get("lora_alpha"), positive=True)
            and finite(config.get("lora_dropout")) and config["lora_dropout"] < 1, "Invalid LoRA parameters")
    targets = config.get("target_modules")
    expression = isinstance(targets, str) and hashlib.sha256(targets.encode()).hexdigest() == UNSLOTH_TARGET_SHA
    require(expression or (isinstance(targets, list) and targets and all(isinstance(m, str) and m for m in targets)
            and len(set(targets)) == len(targets)), "Explicit unique modules or the inspected Unsloth target expression required")
    require(not config.get("use_dora") and not config.get("rank_pattern") and not config.get("alpha_pattern")
            and not config.get("modules_to_save") and config.get("bias", "none") == "none", "Unsupported adapter variant; preserve original and review separately")
    require(weights_path.suffix == ".safetensors", "Only safetensors is supported; pickle loading is never performed")
    total = weights_path.stat().st_size
    with weights_path.open("rb") as stream:
        first = stream.read(8)
        require(len(first) == 8, "Truncated safetensors header")
        length = struct.unpack("<Q", first)[0]
        require(2 <= length <= JSON_LIMIT and length + 8 <= total, "Invalid safetensors header length")
        header = loads(stream.read(length).decode("utf-8"))
    require(isinstance(header, dict), "Invalid tensor inventory")
    tensors, offsets, names = 0, [], set()
    for name, value in header.items():
        if name == "__metadata__":
            require(isinstance(value, dict) and all(isinstance(k, str) and isinstance(v, str) for k, v in value.items()), "Invalid safetensors metadata")
            continue
        require(isinstance(value, dict) and set(value) == {"dtype", "shape", "data_offsets"}, "Invalid tensor descriptor")
        shape, span, dtype = value["shape"], value["data_offsets"], value["dtype"]
        require(dtype in DTYPES and isinstance(shape, list) and len(shape) == 2 and all(finite(x, integer=True, positive=True) for x in shape), "Only 2D floating LoRA weights are supported")
        require(isinstance(span, list) and len(span) == 2 and all(finite(x, integer=True) for x in span)
                and span[1] - span[0] == math.prod(shape) * DTYPES[dtype] and span[1] <= total - length - 8, "Invalid tensor byte span")
        require(name.endswith((".lora_A.weight", ".lora_B.weight")), "Unsupported tensor key in LoRA-only export")
        module, kind = name.rsplit(".lora_", 1)
        require(len(module) <= 512, "Unsupported tensor name length")
        require(bool(re.fullmatch(targets, module)) if expression else module.split(".")[-1] in targets,
                "Tensor target module differs from adapter configuration")
        require(shape[0 if kind == "A.weight" else 1] == config["r"], "LoRA tensor rank differs")
        names.add(name); offsets.append(tuple(span)); tensors += 1
    require(tensors > 0, "Empty LoRA adapter")
    for name in names:
        other = name.replace(".lora_A.weight", ".lora_B.weight") if name.endswith(".lora_A.weight") else name.replace(".lora_B.weight", ".lora_A.weight")
        require(other in names, "Unpaired LoRA A/B tensor")
    cursor = 0
    for start, end in sorted(offsets):
        require(start == cursor and end > start, "Overlapping or gapped safetensors payload")
        cursor = end
    require(cursor == total - length - 8, "Unclaimed safetensors payload bytes")
    return {"weightsSha256": sha256(weights_path), "configSha256": sha256(config_path), "tensorCount": tensors,
            "r": config["r"], "alpha": config["lora_alpha"], "dropout": config["lora_dropout"], "targetModules": config["target_modules"],
            "validation": "structure_only_not_model_execution"}
