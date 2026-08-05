import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { authEnv, getCorsOriginDelegate } from '@repo/auth';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser must stay disabled so Better Auth can read raw request bodies;
  // @thallesp/nestjs-better-auth re-adds the default parsers for other routes.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  // All controllers live under /api (e.g. /api/users) so the web app's dev
  // proxy can forward a single same-origin path prefix to this server. Better
  // Auth's /api/auth/* mount comes from BETTER_AUTH_URL and already matches.
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('System Management EDC API')
    .setDescription('API documentation for System Management EDC backend')
    .setVersion('1.0')
    .addTag('mobile', 'Mobile App Update & Device Tracking endpoints')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  // Node/Express already parse the HTTP QUERY method (RFC 10008), but Nest's
  // router can't map it to a handler yet (RequestMethod has no QUERY entry).
  // Rewrite it to SEARCH — the older safe-method-with-body verb Nest does
  // route — so @Search() handlers serve QUERY requests. Drop this rewrite
  // (and switch the handlers' decorator) once @nestjs/common ships QUERY.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.method === 'QUERY') req.method = 'SEARCH';
    // Native mobile apps (React Native/Expo), curl, Postman, and non-browser clients do not
    // send an Origin or Referer header by default. Better Auth's CSRF protection validates
    // Origin for mutating requests and throws 403 MISSING_OR_NULL_ORIGIN if absent.
    // Populate the Origin header from the Host header so Better Auth can validate the request.
    if (!req.headers.origin && !req.headers.referer && req.headers.host) {
      const protocol =
        req.secure || req.headers['x-forwarded-proto'] === 'https'
          ? 'https'
          : 'http';
      req.headers.origin = `${protocol}://${req.headers.host}`;
    }
    next();
  });
  app.enableCors({
    origin: getCorsOriginDelegate(authEnv.TRUSTED_ORIGINS),
    credentials: true,
    // cors' default method list predates QUERY; without this a browser
    // preflight for QUERY would be rejected.
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'QUERY'],
  });
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
