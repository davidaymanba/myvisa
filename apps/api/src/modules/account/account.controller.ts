import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { profileUpdateSchema, travelerInputSchema, type AccountSummary, type ProfileView, type SavedTravelerView, type TravelerInput } from "@myvisa/shared";
import { Authenticated, CurrentUser } from "../../common/auth.decorators";
import type { AuthedRequest, RequestUser } from "../../common/auth.types";
import { requestMeta } from "../../common/request-meta";
import { AccountService } from "./account.service";

class ProfileDto extends createZodDto(profileUpdateSchema) {}
class TravelerDto extends createZodDto(travelerInputSchema) {}

@ApiTags("account")
@Controller("me")
@Authenticated()
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get("profile")
  profile(@CurrentUser() user: RequestUser): Promise<ProfileView> {
    return this.account.profile(user);
  }

  @Put("profile")
  @ApiOperation({ summary: "Update name, email, language and marketing consent" })
  update(@Body() body: ProfileDto, @CurrentUser() user: RequestUser, @Req() req: AuthedRequest): Promise<ProfileView> {
    return this.account.updateProfile(user, body, requestMeta(req));
  }

  @Get("summary")
  @ApiOperation({ summary: "Dashboard counters (orders, family, documents, unread)" })
  summary(@CurrentUser() user: RequestUser): Promise<AccountSummary> {
    return this.account.summary(user);
  }

  @Get("travelers")
  @ApiOperation({ summary: "Saved travellers (passport numbers masked)" })
  travelers(@CurrentUser() user: RequestUser): Promise<SavedTravelerView[]> {
    return this.account.travelers(user);
  }

  @Get("travelers/:id")
  @ApiOperation({ summary: "One saved traveller in full, for editing" })
  traveler(@Param("id") id: string, @CurrentUser() user: RequestUser): Promise<TravelerInput> {
    return this.account.traveler(user, id);
  }

  @Post("travelers")
  create(@Body() body: TravelerDto, @CurrentUser() user: RequestUser): Promise<SavedTravelerView> {
    return this.account.createTraveler(user, body);
  }

  @Put("travelers/:id")
  updateTraveler(@Param("id") id: string, @Body() body: TravelerDto, @CurrentUser() user: RequestUser): Promise<SavedTravelerView> {
    return this.account.updateTraveler(user, id, body);
  }

  @Delete("travelers/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id") id: string, @CurrentUser() user: RequestUser) {
    return this.account.removeTraveler(user, id);
  }
}
