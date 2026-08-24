import request from 'supertest';
import app from '../src/index';

describe('Webhook replay protection', () => {
  it('ignores duplicate events', async () => {
    const event = { event_id: 'abc123', stock_update: 'item42:in-stock' };

    // First call should process
    const res1 = await request(app).post('/webhook').send(event);
    expect(res1.body.status).toBe('processed');

    // Second call should be ignored
    const res2 = await request(app).post('/webhook').send(event);
    expect(res2.body.status).toBe('duplicate ignored');
  });
});
