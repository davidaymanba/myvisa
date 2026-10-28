import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { InvoiceSummary, InvoiceView } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { RequestUser } from "../../common/auth.types";
import { InvoicesService } from "./invoices.service";

@ApiTags("invoices")
@Controller()
@Authenticated()
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get("me/invoices")
  @ApiOperation({ summary: "My tax invoices, newest first" })
  mine(@CurrentUser() user: RequestUser): Promise<InvoiceSummary[]> {
    return this.invoices.listMine(user);
  }

  @Get("invoices/:id")
  @ApiOperation({ summary: "One invoice with its lines and ZATCA QR payload (owner, or staff with finance:read)" })
  view(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<InvoiceView> {
    return this.invoices.view(user, id);
  }

  @Get("invoices/:id/xml")
  @ApiOperation({ summary: "Short-lived URL to the UBL 2.1 XML" })
  xml(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.invoices.xmlUrl(user, id);
  }
}
