import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  getDatabaseConfig,
  DATABASE_CONNECTION,
} from 'src/config/database.config';
import postgres from 'postgres';
import * as schema from './schema';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const dbConfig = getDatabaseConfig(configService);

        const connectionString = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

        const client = postgres(connectionString, {
          ssl: dbConfig.ssl,
        });

        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
