"""One-time source transfer. Regular builds use only this repository."""
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import tarfile
import tempfile

root = Path.cwd().resolve()
staging = root / '.github/import'
ready = json.loads((staging / 'READY.json').read_text())
parts = []
for item in ready['parts']:
    name = item['name']
    if not name.startswith('part-') or '/' in name or '\\' in name:
        raise RuntimeError('Invalid transfer part name')
    data = (staging / name).read_bytes()
    if hashlib.sha256(data).hexdigest() != item['sha256']:
        raise RuntimeError('Transfer checksum failed: ' + name)
    parts.append(data)
packed = b''.join(parts)
if hashlib.sha256(packed).hexdigest() != ready['sha256']:
    raise RuntimeError('Archive checksum failed')
data = lzma.decompress(packed)
if len(data) > 16 * 1024 * 1024:
    raise RuntimeError('Source archive exceeds limit')
with tarfile.open(fileobj=io.BytesIO(data), mode='r:') as archive:
    manifest = json.load(archive.extractfile('IMPORT-MANIFEST.json'))
    if manifest['commonRepository'] != 'wieslawsoltes/TesseraStudio' or manifest['commonCommit'] != 'c5db1f3ddfbb04c1e1dee7347644ba771398c5ab':
        raise RuntimeError('Unexpected scaffold source')
    entries = manifest['common'] + manifest['files']
    names = set()
    for item in entries:
        name = item['path']
        path = PurePosixPath(name)
        if path.is_absolute() or '..' in path.parts or '\\' in name or path.parts[0] in ('.git', '.github') or name in names:
            raise RuntimeError('Unsafe or duplicate source path: ' + name)
        names.add(name)
    expected = {item['path']: item['sha256'] for item in manifest['files']}
    for member in archive.getmembers():
        if member.name == 'IMPORT-MANIFEST.json':
            continue
        if not member.isfile() or member.name not in expected:
            raise RuntimeError('Unexpected archive entry: ' + member.name)
        content = archive.extractfile(member).read()
        if hashlib.sha256(content).hexdigest() != expected[member.name]:
            raise RuntimeError('Source checksum failed: ' + member.name)
        target = root / member.name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        os.chmod(target, 0o755 if member.name.endswith('.sh') else 0o644)

# These scaffold files were verified byte-for-byte identical to the recovered
# archive before transfer. Copy only the manifest-listed files, never the other app.
with tempfile.TemporaryDirectory(prefix='veyra-scaffold-') as temp:
    subprocess.run(['git', 'init', '--quiet', temp], check=True)
    subprocess.run(['git', '-C', temp, 'fetch', '--quiet', '--depth=1', 'https://github.com/' + manifest['commonRepository'] + '.git', manifest['commonCommit']], check=True)
    subprocess.run(['git', '-C', temp, 'checkout', '--quiet', '--detach', 'FETCH_HEAD'], check=True)
    for item in manifest['common']:
        source = Path(temp) / item['path']
        if source.is_symlink() or not source.is_file():
            raise RuntimeError('Invalid scaffold file: ' + item['path'])
        content = source.read_bytes()
        if hashlib.sha256(content).hexdigest() != item['sha256']:
            raise RuntimeError('Scaffold checksum failed: ' + item['path'])
        target = root / item['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        os.chmod(target, 0o755 if item['path'].endswith('.sh') else 0o644)

for item in entries:
    if hashlib.sha256((root / item['path']).read_bytes()).hexdigest() != item['sha256']:
        raise RuntimeError('Final verification failed: ' + item['path'])
report = {'sourceArchiveSHA256': ready['sha256'], 'verifiedFiles': len(entries), 'commonScaffoldCommit': manifest['commonCommit'], 'note': 'One-time import provenance. All source is vendored; regular builds do not fetch another repository.', 'files': entries}
(root / 'docs/SOURCE-IMPORT.json').write_text(json.dumps(report, indent=2) + '\n')
print('Restored and verified', len(entries), 'source and sample files')
shutil.rmtree(staging)
