import { Controller, Get, Header, Query, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { createZodDto } from "nestjs-zod";
import { reportQuerySchema, type ReportOverview } from "@myvisa/shared";
import { RequirePermissions } from "../../common/auth.decorators";
import { ReportsService } from "./reports.service";

class ReportQuery extends createZodDto(reportQuerySchema) {}

@ApiTags("admin · reports")
@Controller("admin/reports")
@RequirePermissions("admin:access")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("live")
  @RequirePermissions("orders:read")
  @ApiOperation({ summary: "What needs attention now: open, overdue, action required, unassigned, files to review, unread messages" })
  live() {
    return this.reports.live();
  }

  @Get("overview")
  @RequirePermissions("finance:read")
  @ApiOperation({ summary: "KPIs vs the previous period, daily series, funnel, statuses, destinations, agent workload (Riyadh days)" })
  overview(@Query() query: ReportQuery): Promise<ReportOverview> {
    return this.reports.overview(query.from, query.to);
  }

  @Get("orders.csv")
  @RequirePermissions("finance:read")
  @Header("content-type", "text/csv; charset=utf-8")
  @ApiOperation({ summary: "Paid orders in the range as CSV (for accounting)" })
  async csv(@Query() query: ReportQuery, @Res({ passthrough: true }) res: Response): Promise<string> {
    res.setHeader("content-disposition", `attachment; filename="myvisa-orders-${query.from}-to-${query.to}.csv"`);
    return this.reports.ordersCsv(query.from, query.to);
  }
}
