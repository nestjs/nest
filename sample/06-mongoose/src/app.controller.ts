import { Body, Controller, Get, Headers, HttpException, HttpStatus, Post } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { getRuntimeStatus } from './runtime';

function getKeycloakConfig() {
  const issuer = process.env.KEYCLOAK_ISSUER || '';

  return {
    enabled: Boolean(issuer && process.env.KEYCLOAK_CLIENT_ID),
    issuer,
    clientId: process.env.KEYCLOAK_CLIENT_ID || '',
    realm: process.env.KEYCLOAK_REALM || '',
    authUrl: process.env.KEYCLOAK_AUTH_URL || issuer,
  };
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split('.');
  if (!payload) {
    return null;
  }

  const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(normalizedPayload, 'base64').toString('utf-8');
  return JSON.parse(json);
}

async function introspectToken(token: string) {
  const introspectionUrl = process.env.KEYCLOAK_INTROSPECTION_URL;
  const clientId = process.env.KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;

  if (!introspectionUrl || !clientId || !clientSecret) {
    return null;
  }

  const response = await fetch(introspectionUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new HttpException(
      {
        message: 'Keycloak token introspection failed',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  return response.json();
}

@Controller()
export class AppController {
  @Public()
  @Get()
  getRoot() {
    return this.getHealth();
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      ok: true,
      service: 'nest-06-mongoose',
      ...getRuntimeStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('auth/keycloak/config')
  getKeycloak() {
    return getKeycloakConfig();
  }

  @Public()
  @Get('auth/me')
  async getCurrentUser(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return {
        authenticated: false,
        user: null,
      };
    }

    try {
      const introspection = await introspectToken(token);
      if (introspection) {
        return {
          authenticated: Boolean(introspection.active),
          verified: true,
          user: introspection,
        };
      }

      return {
        authenticated: true,
        verified: false,
        user: decodeJwtPayload(token),
      };
    } catch (error) {
      throw new HttpException(
        {
          message: 'Invalid bearer token payload',
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Post('ai/chat')
  async chat(@Body() body: Record<string, unknown>) {
    const apiUrl = process.env.AI_API_URL;
    const apiKey = process.env.AI_API_KEY;

    if (!apiUrl) {
      return {
        configured: false,
        message: 'Set AI_API_URL and optional AI_API_KEY to proxy AI requests.',
        request: body,
      };
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body || {}),
    });

    const text = await response.text();

    try {
      return JSON.parse(text);
    } catch {
      return {
        status: response.status,
        body: text,
      };
    }
  }
}
