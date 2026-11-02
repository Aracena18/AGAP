# AGAP Experiment D — Local Model Package

This archive contains the evaluated AGAP Experiment D LoRA
and its exact pinned Qwen3.5-2B base-model files.

BASE MODEL:
unsloth/Qwen3.5-2B

BASE REVISION:
fffbc0d8711cf87df6d1f97938c5e50ef94aadc7

ADAPTER SHA256:
1df4455fcbd17630a4256a0ea4feb7ee10545ab4a27ec29aec295f70655c7c37

DIRECTORY CONTENTS

base_model/
  Pinned Qwen3.5-2B weights, tokenizer and processor files.

adapter/
  Experiment D LoRA files (not merged into the base model).

evaluation/
  Experiment C/D metrics, comparative graph and schema audit.

environment_versions.json
  Package versions observed during Colab export.

model_manifest.json
  SHA256 hashes and exported-file inventory.

LOCAL LOADING EXAMPLE (compatible GPU Python environment):

    from unsloth import FastVisionModel
    from peft import PeftModel

    base, processor = FastVisionModel.from_pretrained(
        model_name="./base_model",
        load_in_4bit=False,
        use_gradient_checkpointing="unsloth"
    )

    model = PeftModel.from_pretrained(
        base, "./adapter", is_trainable=False
    )
    FastVisionModel.for_inference(model)
    model.eval()

Run from the extracted package directory.

The model requires a compatible local PyTorch, Unsloth,
Transformers and PEFT environment. These libraries are
not bundled in this ZIP.

Important:
- LoRA is unmerged; load base + adapter together.
- No API/server is included.
- This is a research prototype candidate.
- Independent financial-semantic validation is pending.
- Loan approvals or denials must not be automated.
