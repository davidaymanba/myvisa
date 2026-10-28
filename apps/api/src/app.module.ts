import { type DynamicModule, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { ZodValidationPipe } from "nestjs-zod";
import { AuthGuard } from "./common/auth.guard";
import { CsrfGuard } from "./common/csrf.guard";
import { ProblemFilter } from "./common/problem.filter";
import { ConfigModule } from "./config/config.module";
import type { Env } from "./config/env";
import { InfraModule } from "./infra/infra.module";
import { RedisThrottlerStorage } from "./infra/throttler-storage";
import { AccountModule } from "./modules/account/account.module";
import { AdminOrdersModule } from "./modules/admin-orders/admin-orders.module";
import { AuditInterceptor } from "./modules/audit/audit.interceptor";
import { AuditModule } from "./modules/audit/audit.module";
import { BlogModule } from "./modules/blog/blog.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { ConsentsModule } from "./modules/consents/consents.module";
import { ContactModule } from "./modules/contact/contact.module";
import { ContentModule } from "./modules/content/content.module";
import { CouponsModule } from "./modules/coupons/coupons.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { HealthModule } from "./modules/health/health.module";
import { InvoicesModule } from "./modules/invoices/invoices.module";
import { MessagesModule } from "./modules/messages/messages.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { RevalidateModule } from "./modules/revalidate/revalidate.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { StaffModule } from "./modules/staff/staff.module";
import { TrackingModule } from "./modules/tracking/tracking.module";

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        LoggerModule.forRoot({
          pinoHttp: {
            level: env.LOG_LEVEL,
            ...(env.NODE_ENV === "development" ? { transport: { target: "pino-pretty", options: { singleLine: true, ignore: "pid,hostname,req,res" } } } : {}),
            redact: ["req.headers.cookie", "req.headers.authorization", 'req.headers["x-csrf-token"]', 'res.headers["set-cookie"]'],
            autoLogging: { ignore: (req) => req.url?.startsWith("/health") ?? false },
            customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
          },
        }),
        InfraModule,
        EventEmitterModule.forRoot({ wildcard: false, ignoreErrors: false }),
        ThrottlerModule.forRootAsync({
          inject: [RedisThrottlerStorage],
          useFactory: (storage: RedisThrottlerStorage) => ({ throttlers: [{ name: "default", ttl: 60_000, limit: 300 }], storage }),
        }),
        RevalidateModule,
        AuthModule,
        SettingsModule,
        CatalogModule,
        ContentModule,
        ContactModule,
        ConsentsModule,
        AuditModule,
        OrdersModule,
        DocumentsModule,
        HealthModule,
        PaymentsModule,
        NotificationsModule,
        InvoicesModule,
        MessagesModule,
        AccountModule,
        TrackingModule,
        AdminOrdersModule,
        CouponsModule,
        CustomersModule,
        StaffModule,
        ReportsModule,
        BlogModule,
      ],
      providers: [
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_FILTER, useClass: ProblemFilter },
        // Guards run in this order: rate limit → CSRF → authentication/permissions.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
      ],
    };
  }
}
