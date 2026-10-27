import { RequestMethod, VersioningType } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { AUTH_COOKIES, CSRF_HEADER } from "@myvisa/shared";
import { AppModule } from "./app.module";
import type { Env } from "./config/env";

/** Builds the configured app. Shared by main.ts and the e2e suite so tests exercise the real pipeline. */
export async function createApp(env: Env, options: { logger?: boolean } = {}): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(env), { bufferLogs: true, logger: options.logger === false ? false : undefined });
  if (options.logger !== false) app.useLogger(app.get(Logger));

  app.set("trust proxy", env.TRUST_PROXY ? 1 : false);
  app.disable("x-powered-by");
  app.use((req: { path: string }, res: unknown, next: () => void) =>
    // Swagger UI needs inline scripts/styles; everything else gets the strict default CSP.
    helmet(req.path.startsWith("/docs") ? { contentSecurityPolicy: false } : {})(req as never, res as never, next),
  );
  app.use(cookieParser());
  app.enableCors({
    origin: [env.WEB_URL, ...env.CORS_ORIGINS],
    credentials: true,
    allowedHeaders: ["content-type", "authorization", CSRF_HEADER],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    maxAge: 600,
  });

  app.setGlobalPrefix("api", { exclude: [{ path: "health", method: RequestMethod.GET }, { path: "health/live", method: RequestMethod.GET }] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  const config = new DocumentBuilder()
    .setTitle("myvisa API")
    .setDescription(
      [
        "REST API for the myvisa platform. Errors are `application/problem+json` (RFC 9457) with a stable `code`.",
        `Browser clients authenticate with httpOnly cookies (\`${AUTH_COOKIES.access}\`, \`${AUTH_COOKIES.refresh}\`) and must echo the \`${AUTH_COOKIES.csrf}\` cookie in the \`${CSRF_HEADER}\` header on writes.`,
        "Money is integer halalas (1 SAR = 100).",
      ].join("\n\n"),
    )
    .setVersion("1")
    .addCookieAuth(AUTH_COOKIES.access)
    .addBearerAuth()
    .build();
  SwaggerModule.setup("docs", app, cleanupOpenApiDoc(SwaggerModule.createDocument(app, config)), {
    jsonDocumentUrl: "docs/openapi.json",
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  });

  app.enableShutdownHooks();
  return app;
}
