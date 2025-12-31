import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

const connectionString = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Hash passwords
    const defaultPassword = await bcrypt.hash('password123', 10);

    // Seed users
    const usersToInsert = [
      {
        email: 'cashier@hospital.local',
        password: defaultPassword,
        counterType: 'CASHIER' as const,
      },
      {
        email: 'billing@hospital.local',
        password: defaultPassword,
        counterType: 'BILLING' as const,
      },
      {
        email: 'lab@hospital.local',
        password: defaultPassword,
        counterType: 'LAB' as const,
      },
    ];

    for (const user of usersToInsert) {
      await db
        .insert(schema.users)
        .values(user)
        .onConflictDoNothing({ target: schema.users.email });
    }

    console.log('✅ Database seeded successfully!');
    console.log('📝 Default accounts:');
    console.log(
      '   Cashier: email=cashier@hospital.local, password=password123',
    );
    console.log(
      '   Billing: email=billing@hospital.local, password=password123',
    );
    console.log('   Lab: email=lab@hospital.local, password=password123');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed();
