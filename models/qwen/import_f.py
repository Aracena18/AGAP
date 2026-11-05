"""Import the checksum-bound Experiment F and pinned base without executing exports.

Only stdlib is needed. Weights remain local ignored artifacts; original Downloads
are never renamed, removed, chmodded or overwritten. The large base may be linked.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import tempfile
from zipfile import ZipFile

from .handoff.files import EvidenceError, file_under, read_json, require, serialize, sha256

HERE = Path(__file__).resolve().parent
IDENTITY = HERE / 'experiment_f' / 'identity.json'
MAX_ENTRY = 110_000_000
PACKAGE = 'AGAP_F_Integration_Adapter_v1/'
BASE = 'pretrained_base_qwen3_5_2b/'


def members(archive):
    infos = archive.infolist()
    require(len(infos) <= 500, 'Archive member limit exceeded')
    require(len({info.filename for info in infos}) == len(infos), 'Duplicate archive members')
    for info in infos:
        path = PurePosixPath(info.filename)
        require(not path.is_absolute() and '..' not in path.parts and '\\' not in info.filename
                and ':' not in info.filename, 'Unsafe archive path')
        require(not stat.S_ISLNK(info.external_attr >> 16), 'Archive links are not allowed')
        require(0 <= info.file_size <= MAX_ENTRY, 'Archive entry exceeds limit')
    return infos


def nested_files(path):
    """Read only named nested model ZIPs; reject ZIP traversal and ZIP bombs."""
    require(Path(path).is_file() and not Path(path).is_symlink(), 'Bundle must be a regular file')
    with ZipFile(path) as outer:
        selected = [info for info in members(outer) if info.filename.endswith('.zip') and
                    ('AGAP_F_Integration_Adapter_v1.zip' in info.filename or 'pretrained_base_qwen3_5_2b-' in info.filename)]
        require(0 < len(selected) <= 3 and sum(info.file_size for info in selected) <= 150_000_000, 'Unexpected nested model inventory')
        for info in selected:
            raw = outer.read(info)
            with ZipFile(io.BytesIO(raw)) as nested:
                entries = members(nested)
                require(sum(item.file_size for item in entries) <= 150_000_000, 'Nested archive exceeds limit')
                yield info.filename, raw, {item.filename: nested.read(item) for item in entries if not item.is_dir()}


def commitment(data):
    return {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}


def checked(data, expected, name):
    require(commitment(data) == expected, 'Artifact checksum or size mismatch: ' + name)
    return data


def verify(root, expected_sha):
    manifest_file = file_under(root, 'model_manifest.json')
    require(sha256(manifest_file) == expected_sha, 'Imported manifest checksum mismatch')
    manifest = read_json(manifest_file)
    identity = read_json(IDENTITY)
    require(manifest['base_repository'] == identity['baseModel'] and manifest['base_revision'] == identity['baseRevision']
            and manifest['adapter_sha256'] == identity['artifactSha256'], 'Unexpected model identity')
    for name, expected in manifest['files'].items():
        path = file_under(root, name)
        require(path.stat().st_size == expected['bytes'] and sha256(path) == expected['sha256'], 'Imported file differs: ' + name)
    return {'manifestSha256': expected_sha, 'filesVerified': len(manifest['files']), 'modelExecuted': False,
            'scope': 'fictional_human_review_pilot', 'promotion': 'not_promoted'}


def import_artifacts(bundles, weights, destination):
    require(1 <= len(bundles) <= 3, 'Supply at most three explicit model bundle parts')
    identity, baseline = read_json(IDENTITY), read_json(HERE / 'model_manifest.json')
    require(identity['baseModel'] == baseline['base_repository'] and identity['baseRevision'] == baseline['base_revision'], 'Base pin differs')
    destination, weights = Path(destination).absolute(), Path(weights).absolute()
    require(not destination.exists() and not destination.is_symlink(), 'Destination already exists; verify it instead')
    require(weights.is_file() and not weights.is_symlink(), 'Base weights must be a regular file')
    package_files, base_files = None, {}
    for bundle in bundles:
        for name, raw, files in nested_files(bundle):
            if name.endswith('AGAP_F_Integration_Adapter_v1.zip'):
                require(hashlib.sha256(raw).hexdigest() == identity['packageSha256'], 'Unexpected F package checksum')
                require(set(files) == {PACKAGE + name for name in identity['files']} | {PACKAGE + 'package_manifest.json'}, 'Unexpected F package inventory')
                for name, expected in identity['files'].items():
                    checked(files[PACKAGE + name], expected, name)
                package_files = files
            else:
                for name, value in files.items():
                    if name.startswith(BASE) and '/.cache/' not in name:
                        relative = 'base_model/' + name[len(BASE):]
                        require(relative not in base_files or base_files[relative] == value, 'Conflicting base archive parts')
                        base_files[relative] = value
    require(package_files is not None, 'F integration package missing')
    weight_name = 'base_model/model.safetensors-00001-of-00001.safetensors'
    expected_weight = baseline['files'][weight_name]
    require(weights.stat().st_size == expected_weight['bytes'] and sha256(weights) == expected_weight['sha256'], 'Base weight checksum mismatch')
    expected_base = {name: value for name, value in baseline['files'].items() if name.startswith('base_model/') and name != weight_name}
    require(set(base_files) == set(expected_base), 'Incomplete or unexpected base metadata inventory')
    for name, expected in expected_base.items():
        checked(base_files[name], expected, name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    require(not any(path.is_symlink() for path in (destination.parent, *destination.parent.parents)), 'Destination parent cannot be a symlink')
    with tempfile.TemporaryDirectory(prefix='.agap-import-', dir=destination.parent) as staging:
        root = Path(staging) / 'artifact'
        root.mkdir()
        files = dict(base_files)
        for name, value in package_files.items():
            short = name[len(PACKAGE):]
            if short.startswith('__pycache__/'):
                continue  # Compiled foreign code is neither needed nor executed.
            files[short if short.startswith('adapter/') else 'upstream/' + short] = value
        files['environment_versions.json'] = (HERE / 'environment_versions.json').read_bytes()
        files['experiment_f_identity.json'] = IDENTITY.read_bytes()
        for name, data in files.items():
            path = root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
        linked = True
        try:
            os.link(weights, root / weight_name)
        except OSError:
            linked = False
            shutil.copyfile(weights, root / weight_name)
        inventory = {name: commitment(data) for name, data in files.items()}
        inventory[weight_name] = expected_weight
        manifest = {'schemaVersion': 'agap-f-import/v1', 'base_repository': identity['baseModel'],
                    'base_revision': identity['baseRevision'], 'adapter_sha256': identity['artifactSha256'],
                    'scope': identity['scope'], 'promotion': 'not_promoted', 'files': inventory}
        (root / 'model_manifest.json').write_text(serialize(manifest))
        manifest_sha = sha256(root / 'model_manifest.json')
        report = verify(root, manifest_sha)
        report['baseWeightsHardlinked'] = linked
        (root / 'import-report.json').write_text(serialize(report))
        # Atomic publication; existing destinations are never merged or replaced.
        require(not destination.exists(), 'Destination appeared during import')
        root.rename(destination)
    return report


def candidate(destination):
    identity = read_json(IDENTITY)
    def artifact(tuned):
        return {'baseModel': identity['baseModel'], 'baseRevision': identity['baseRevision'],
                'artifactSha256': identity['artifactSha256'] if tuned else None,
                'promptVersion': sha256(HERE / ('experiment_f/prompt.txt' if tuned else 'service/prompt.txt')),
                'schemaVersion': sha256(HERE / ('service/review.schema.json' if tuned else 'service/finding.schema.json')),
                'datasetManifestSha256': None, 'evaluationReference': 'fictional-pilot-not-independent-not-promoted'}
    data = {'schemaVersion': 'agap-fictional-model-candidate/v1', 'approved': False, 'fictionalOnly': True,
            'scope': 'fictional_human_review_pilot', 'extractionArtifact': artifact(False), 'reviewArtifact': artifact(True)}
    path = Path(destination) / 'fictional-candidate.json'
    require(not path.exists(), 'Candidate file already exists')
    path.write_text(serialize(data))
    return {'candidateFile': str(path), 'candidateSha256': sha256(path)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    importing = sub.add_parser('import')
    importing.add_argument('--bundle', action='append', required=True)
    importing.add_argument('--weights', required=True)
    importing.add_argument('--destination', required=True)
    checking = sub.add_parser('verify')
    checking.add_argument('--directory', required=True)
    checking.add_argument('--manifest-sha256', required=True)
    creating = sub.add_parser('candidate')
    creating.add_argument('--directory', required=True)
    args = parser.parse_args()
    try:
        if args.command == 'import':
            result = import_artifacts(args.bundle, args.weights, args.destination)
        elif args.command == 'candidate':
            result = candidate(args.directory)
        else:
            result = verify(args.directory, args.manifest_sha256)
        print(serialize(result), end='')
    except (EvidenceError, OSError, KeyError, ValueError) as error:
        parser.exit(1, 'Model import unavailable: ' + str(error) + '\n')


if __name__ == '__main__':
    main()
