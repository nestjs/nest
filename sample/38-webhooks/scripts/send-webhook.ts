/**
 * Sends the signed request the payment provider or the carrier would send, for trying the API by hand:
 *
 *   npx tsx scripts/send-webhook.ts payments payment.succeeded '{"paymentId":"pay_1","orderId":"...","amount":4998}'
 *   npx tsx scripts/send-webhook.ts carrier shipment.shipped '{"orderId":"...","trackingNumber":"TRK-0001"}'
 *
 * Signs with PAYMENTS_WEBHOOK_SECRET or CARRIER_WEBHOOK_SECRET, the secrets the API was
 * started with, and posts to API_URL (default http://localhost:3000). WEBHOOK_ID sends a
 * redelivery with a given id; TAMPER=1 changes a byte of the body after signing it.
 */
import { signWebhook } from '@nestjs/webhooks/testing';
import { randomUUID } from 'node:crypto';

const [sender, type, json = '{}'] = process.argv.slice(2);
if (sender !== 'payments' && sender !== 'carrier') {
  console.error(
    'usage: send-webhook.ts <payments|carrier> <type> <data as JSON>',
  );
  process.exit(2);
}
const data: unknown = JSON.parse(json);
const id = process.env.WEBHOOK_ID;

function secret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Set ${name}`);
  }
  return value;
}

const signed =
  sender === 'payments'
    ? signWebhook({
        scheme: 'standard',
        secret: secret('PAYMENTS_WEBHOOK_SECRET'),
        id,
        payload: { type, timestamp: new Date().toISOString(), data },
      })
    : signWebhook({
        scheme: 'stripe',
        header: 'Carrier-Signature',
        secret: secret('CARRIER_WEBHOOK_SECRET'),
        payload: {
          id: id ?? `evt_${randomUUID().replaceAll('-', '')}`,
          type,
          data,
        },
      });

const body = process.env.TAMPER ? `${signed.body.slice(0, -1)} }` : signed.body;
const response = await fetch(
  `${process.env.API_URL ?? 'http://localhost:3000'}/webhooks/${sender}`,
  {
    method: 'POST',
    headers: signed.headers,
    body,
  },
);
console.log(`${response.status} ${await response.text()}`);
