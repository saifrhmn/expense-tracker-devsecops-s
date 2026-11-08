import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const nginx = readFileSync(new URL('../nginx/default.conf', import.meta.url), 'utf8');
test('frontend includes a mount element', () => assert.match(html, /id="root"/));
test('nginx routes API traffic to backend service', () => assert.match(nginx, /proxy_pass http:\/\/backend:5000\/api\//));
test('nginx supports SPA fallback', () => assert.match(nginx, /try_files \$uri \$uri\/ \/index\.html/));
