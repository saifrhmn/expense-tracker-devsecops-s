import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

async function withServer(run) {
  const server = app.listen(0);
  try {
    await new Promise(resolve => server.once('listening', resolve));
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  }
}

test('GET /api/health returns service health', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/health`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.service, 'expense-tracker-api');
    assert.equal(typeof body.mongoState, 'number');
  });
});

test('unknown API path returns 404', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/not-a-route`);
    assert.equal(response.status, 404);
    assert.equal((await response.json()).success, false);
  });
});

test('POST /api/expenses rejects missing required fields without MongoDB', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/expenses`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Coffee' })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).message, /required/);
  });
});

test('POST /api/expenses rejects invalid category without MongoDB', async () => {
  await withServer(async base => {
    const response = await fetch(`${base}/api/expenses`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Coffee', amount: 5, category: 'Unknown' })
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, 'Invalid category');
  });
});
