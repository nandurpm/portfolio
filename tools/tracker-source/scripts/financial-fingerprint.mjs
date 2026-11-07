import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
/** Hash engine source bytes and model/validation source, never a user's financial records. */
export function financialFingerprints(root = process.cwd()) {
  const domain = fs.readdirSync(path.join(root, 'src/domain')).filter(name => name.endsWith('.ts')).sort().map(name => `src/domain/${name}`);
  const hash = files => {
    const digest = createHash('sha256');
    for (const file of files) digest.update(file + '\0').update(fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n')).update('\0');
    return digest.digest('hex');
  };
  return {financialLogicSha256: hash(domain), dataModelSha256: hash(['src/domain/types.ts', 'src/domain/validation.ts', 'src/cloud/model.ts'])};
}
