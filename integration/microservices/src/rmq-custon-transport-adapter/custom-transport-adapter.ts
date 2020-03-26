import * as crypto from 'crypto';
import { TransportAdapter } from '@nestjs/microservices/interfaces';

const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32);
const iv = crypto.randomBytes(16);

class CustomTransportAdapter implements TransportAdapter<Buffer> {

  encrypt(message: string): Buffer {
    let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
    let encrypted = cipher.update(message);
    return Buffer.concat([encrypted, cipher.final()]);
  }

  decrypt(message: Buffer) {
    let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
    let decrypted = decipher.update(message);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  encode(value: {}) {
    return this.encrypt(JSON.stringify(value));
  }

  decode(body: Buffer) {
    return JSON.parse(this.decrypt(body));
  }
}

export const customTransportAdapter = new CustomTransportAdapter();
