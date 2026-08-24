import request from 'supertest';
import app from '../src/index'; // adjust if your Express app is exported differently

describe('Webhook replay protection', () => {
  it('processes a new event', async () => {
    const event = { event_id: 'abc123', stock_update: 'item42:in-stock' };
    const res = await request(app).post('/webhook').send(event);
    expect(res.body.status).toBe('processed');
  });

  it('ignores duplicate events', async () => {
    const event = { event_id: 'dup123', stock_update: 'item42:in-stock' };
    await request(app).post('/webhook').send(event);
    const res = await request(app).post('/webhook').send(event);
    expect(res.body.status).toBe('duplicate ignored');
  });

  it('rejects invalid payloads', async () => {
    const res = await request(app).post('/webhook').send({});
    expect(res.status).toBe(400); // adjust if you handle errors differently
  });
});
