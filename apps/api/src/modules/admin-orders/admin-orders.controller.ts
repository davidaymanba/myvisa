import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import {
  adminOrderQuerySchema,
  appointmentSchema,
  assignSchema,
  documentReviewSchema,
  noteSchema,
  refundSchema,
  shipmentSchema,
  shipmentUpdateSchema,
  statusChangeSchema,
  type AdminOrderDetail,
  type AdminOrderPage,
} from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { CurrentUser, RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { AdminOrdersService } from "./admin-orders.service";

class OrderQuery extends createZodDto(adminOrderQuerySchema) {}
class StatusDto extends createZodDto(statusChangeSchema) {}
class AssignDto extends createZodDto(assignSchema) {}
class NoteDto extends createZodDto(noteSchema) {}
class ReviewDto extends createZodDto(documentReviewSchema) {}
class AppointmentDto extends createZodDto(appointmentSchema) {}
class ShipmentDto extends createZodDto(shipmentSchema) {}
class ShipmentUpdateDto extends createZodDto(shipmentUpdateSchema) {}
class RefundDto extends createZodDto(refundSchema) {}

/** Before-state for the audit log: the order's status, assignee and SLA. */
const auditBefore = (req: AuthedRequest, detail: AdminOrderDetail) => {
  req.audit = { before: { status: detail.order.status, assigneeId: detail.assignee?.id ?? null, slaDueAt: detail.slaDueAt } };
};

@ApiTags("admin · orders")
@Controller("admin")
@RequirePermissions("admin:access", "orders:read")
export class AdminOrdersController {
  constructor(private readonly orders: AdminOrdersService) {}

  @Get("orders")
  @ApiOperation({ summary: "Order queue (views: open, mine, unassigned, overdue, closed, all) with per-status counts" })
  list(@Query() query: OrderQuery, @CurrentUser() user: RequestUser): Promise<AdminOrderPage> {
    return this.orders.list(user, query);
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Order desk: the order, customer, timeline, notes, payments, invoices and allowed next statuses" })
  detail(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<AdminOrderDetail> {
    return this.orders.detail(user, id);
  }

  @Get("agents")
  @ApiOperation({ summary: "Staff who can be assigned orders" })
  agents() {
    return this.orders.agents();
  }

  @Post("orders/:id/status")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("orders:write")
  @Audit("order.status", "Order")
  async status(@Param("id") id: string, @Body() body: StatusDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest) {
    auditBefore(req, await this.orders.detail(user, id));
    return this.orders.changeStatus(user, id, body);
  }

  @Post("orders/:id/assign")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("orders:write")
  @Audit("order.assign", "Order")
  async assign(@Param("id") id: string, @Body() body: AssignDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest) {
    auditBefore(req, await this.orders.detail(user, id));
    return this.orders.assign(user, id, body.assigneeId);
  }

  @Post("orders/:id/notes")
  @RequirePermissions("orders:write")
  @Audit("order.note", "InternalNote")
  note(@Param("id") id: string, @Body() body: NoteDto, @CurrentUser() user: RequestUser) {
    return this.orders.addNote(user, id, body.body);
  }

  @Post("order-documents/:id/review")
  @HttpCode(HttpStatus.OK)
  @RequirePermissions("orders:write")
  @Audit("document.review", "OrderDocument")
  review(@Param("id") id: string, @Body() body: ReviewDto, @CurrentUser() user: RequestUser) {
    return this.orders.reviewDocument(user, id, body);
  }

  @Put("orders/:id/appointment")
  @RequirePermissions("orders:write")
  @Audit("order.appointment", "Appointment")
  appointment(@Param("id") id: string, @Body() body: AppointmentDto, @CurrentUser() user: RequestUser) {
    return this.orders.setAppointment(user, id, body);
  }

  @Post("orders/:id/shipments")
  @RequirePermissions("orders:write")
  @Audit("order.shipment", "Shipment")
  shipment(@Param("id") id: string, @Body() body: ShipmentDto, @CurrentUser() user: RequestUser) {
    return this.orders.addShipment(user, id, body);
  }

  @Put("shipments/:id")
  @RequirePermissions("orders:write")
  @Audit("shipment.update", "Shipment")
  updateShipment(@Param("id") id: string, @Body() body: ShipmentUpdateDto, @CurrentUser() user: RequestUser) {
    return this.orders.updateShipment(user, id, body);
  }

  @Post("orders/:id/refunds")
  @RequirePermissions("payments:refund")
  @Audit("order.refund", "Refund")
  @ApiOperation({ summary: "Refund through the gateway, issue the ZATCA credit note, close the order when fully refunded" })
  async refund(@Param("id") id: string, @Body() body: RefundDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest) {
    auditBefore(req, await this.orders.detail(user, id));
    return this.orders.refund(user, id, body);
  }
}
