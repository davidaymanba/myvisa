import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { staffInviteSchema, staffUpdateSchema, type StaffMember } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { CurrentUser, RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { StaffService } from "./staff.service";

class InviteDto extends createZodDto(staffInviteSchema) {}
class UpdateDto extends createZodDto(staffUpdateSchema) {}

@ApiTags("admin · staff")
@Controller("admin/staff")
@RequirePermissions("admin:access", "staff:manage")
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(): Promise<StaffMember[]> {
    return this.staff.list();
  }

  @Post()
  @Audit("staff.invite", "User")
  invite(@Body() body: InviteDto) {
    return this.staff.invite(body);
  }

  @Put(":id")
  @Audit("staff.update", "User")
  async update(@Param("id") id: string, @Body() body: UpdateDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest) {
    req.audit = { before: (await this.staff.list()).find((m) => m.id === id) };
    return this.staff.update(user, id, body);
  }
}
