"""Verify the exact published 2.10.15 APK's bytes and bundled renderer inventory.
This does not replace Android signature verification, emulator or device tests.
"""
import hashlib
import json
import sys
import zipfile
from pathlib import Path, PurePosixPath

apk = Path(sys.argv[1])
expected = 'b8dd61988720ef8979f994de15fcbff579214beaf3232a875009f1cc3566c45e'
assert hashlib.sha256(apk.read_bytes()).hexdigest() == expected, 'APK SHA-256 mismatch'
with zipfile.ZipFile(apk) as archive:
    assert archive.testzip() is None, 'ZIP CRC failure'
    manifest = json.loads(archive.read('assets/public/build.json'))
    assert manifest['version'] == '2.10.15'
    assert manifest['sourceCommit'] == '6c80d4fc8451f12892351e4ceda4d8978d7b5413'
    assert manifest['mode'] == 'release' and manifest['dirty'] is False
    for name, digest in manifest['files'].items():
        path = PurePosixPath(name)
        assert not path.is_absolute() and '..' not in path.parts, 'Unsafe asset path'
        assert hashlib.sha256(archive.read('assets/public/' + name)).hexdigest() == digest, name
print(json.dumps({'apkSha256': expected, 'version': manifest['version'],
                  'sourceCommit': manifest['sourceCommit'], 'verifiedFiles': len(manifest['files']),
                  'financialLogicSha256': manifest['financialLogicSha256'],
                  'dataModelSha256': manifest['dataModelSha256'], 'verified': True}))
