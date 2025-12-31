import { ConfigService } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl: boolean;
}

export const DATABASE_CONNECTION = 'database_connection';

export const getDatabaseConfig = (
  configService: ConfigService<Record<string, string>>,
): DatabaseConfig => ({
  host: configService.getOrThrow('POSTGRES_HOST'),
  port: parseInt(configService.getOrThrow('POSTGRES_PORT'), 10),
  user: configService.getOrThrow('POSTGRES_USER'),
  password: configService.getOrThrow('POSTGRES_PASSWORD'),
  database: configService.getOrThrow('POSTGRES_DB'),
  ssl: configService.get('POSTGRES_SSL') !== 'false',
});
