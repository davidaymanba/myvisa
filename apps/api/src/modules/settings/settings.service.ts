import { HttpStatus, Injectable } from "@nestjs/common";
import { DEFAULT_SETTINGS, SETTING_KEYS, SETTING_SCHEMAS, isSettingKey, type SettingKey, type Settings } from "@myvisa/shared";
import type { Prisma } from "@myvisa/db";
import { Problem } from "../../common/problem";
import { PrismaService } from "../../infra/prisma.service";
import { RevalidateService } from "../revalidate/revalidate.service";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: RevalidateService,
  ) {}

  /** Every key, falling back to defaults for keys never saved (or saved in an outdated shape). */
  all(): Promise<Settings> {
    return this.cache.cached("settings", async () => {
      const rows = await this.prisma.setting.findMany({ where: { key: { in: SETTING_KEYS } } });
      const settings = { ...DEFAULT_SETTINGS } as Record<SettingKey, unknown>;
      for (const row of rows) {
        if (!isSettingKey(row.key)) continue;
        const parsed = SETTING_SCHEMAS[row.key].safeParse(row.value);
        if (parsed.success) settings[row.key] = parsed.data;
      }
      return settings as Settings;
    });
  }

  parseKey(key: string): SettingKey {
    if (!isSettingKey(key)) throw new Problem(HttpStatus.NOT_FOUND, "not_found", `Unknown setting "${key}"`);
    return key;
  }

  async get<K extends SettingKey>(key: K): Promise<Settings[K]> {
    return (await this.all())[key];
  }

  async set<K extends SettingKey>(key: K, value: unknown): Promise<{ key: K; value: Settings[K] }> {
    const parsed = SETTING_SCHEMAS[key].safeParse(value);
    if (!parsed.success) {
      throw new Problem(HttpStatus.UNPROCESSABLE_ENTITY, "validation_failed", "The setting value is invalid.", {
        errors: parsed.error.issues.map((i) => ({ path: i.path.join("."), code: i.code, message: i.message })),
      });
    }
    const data = parsed.data as Prisma.InputJsonObject;
    await this.prisma.setting.upsert({ where: { key }, create: { key, value: data }, update: { value: data } });
    await this.cache.invalidate("settings");
    return { key, value: parsed.data as Settings[K] };
  }
}
