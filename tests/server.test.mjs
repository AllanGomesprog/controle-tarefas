import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createStaticServer } from '../scripts/serve.mjs';

test('servidor publica apenas artefatos, protege caminhos e aceita somente leitura', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(),'controle-server-'));
  await writeFile(path.join(dir,'index.html'),'<h1>Controle</h1>');
  const server = createStaticServer({directory:dir});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base);
    assert.equal(home.status,200); assert.match(await home.text(),/Controle/);
    assert.equal(home.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await fetch(base+'/.env')).status,403);
    assert.equal((await fetch(base+'/%2e%2e%2fpackage.json')).status,403);
    assert.equal((await fetch(base+'/missing.js')).status,404);
    assert.equal((await fetch(base,{method:'POST'})).status,405);
    assert.equal((await fetch(base,{method:'HEAD'})).status,200);
  } finally {
    await new Promise(resolve => server.close(resolve));
    assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.ok(path.basename(dir).startsWith('controle-server-'));
    await rm(dir,{recursive:true,force:true});
  }
});
