import { Body, Controller, Get, Header, Param, Put, Req } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Settings } from "@myvisa/shared";
import { Audit } from "../../common/audit.decorator";
import { RequirePermissions } from "../../common/auth.decorators";
import type { AuthedRequest } from "../../common/auth.types";
import { SettingsService } from "./settings.service";

@ApiTags("settings")
@Controller()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("settings")
  @Header("cache-control", "public, max-age=60, stale-while-revalidate=600")
  @ApiOperation({ summary: "Public company, support and legal-version settings" })
  all(): Promise<Settings> {
    return this.settings.all();
  }

  @Put("admin/settings/:key")
  @RequirePermissions("admin:access", "settings:write")
  @Audit("setting.update", "Setting")
  @ApiBody({ description: "The full value for this key (validated against SETTING_SCHEMAS[key])" })
  async update(@Param("key") rawKey: string, @Body() body: unknown, @Req() req: AuthedRequest) {
    const key = this.settings.parseKey(rawKey);
    req.audit = { entityId: key, before: await this.settings.get(key) };
    return this.settings.set(key, body);
  }
}
