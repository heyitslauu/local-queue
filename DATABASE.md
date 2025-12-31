# Queue Backend - Database Setup with Drizzle ORM

## PostgreSQL with Docker Compose

### Starting the Database

```bash
# Start PostgreSQL container
docker-compose up -d

# Check if container is running
docker-compose ps

# View logs
docker-compose logs -f postgres
```

### Stopping the Database

```bash
# Stop container
docker-compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker-compose down -v
```

### Database Configuration

- **Host**: localhost
- **Port**: 5432
- **Database**: queue_db
- **User**: queue_user
- **Password**: queue_password

These settings can be changed in `.env` file.

## Drizzle ORM Setup

### Generate Migrations

```bash
# Generate migration files from schema
npm run db:generate
```

### Push Schema to Database (Development)

```bash
# Push schema changes directly to database without migrations
npm run db:push
```

This is the easiest way for development - it will create/update tables based on your schema.

### Run Migrations (Production)

```bash
# Apply migrations to database
npm run db:migrate
```

### Drizzle Studio

```bash
# Open Drizzle Studio (database GUI)
npm run db:studio
```

Access at: https://local.drizzle.studio

## Running the Application

1. Start PostgreSQL:

   ```bash
   docker-compose up -d
   ```

2. Push schema to database (first time or after schema changes):

   ```bash
   npm run db:push
   ```

3. Install dependencies (if not already done):

   ```bash
   npm install
   ```

4. Start the NestJS application:
   ```bash
   npm run start:dev
   ```

The application will automatically connect to PostgreSQL using Drizzle ORM.

### Accessing PostgreSQL Directly

```bash
# Connect to PostgreSQL container
docker exec -it queue-postgres psql -U queue_user -d queue_db

# Common queries
SELECT * FROM queues;
SELECT * FROM queues WHERE status = 'SERVING';
SELECT * FROM queues WHERE counter_type = 'BILLING';
```

## Schema

The `queues` table has the following structure:

- `uuid` - Primary key (UUID)
- `id` - Unique queue identifier (e.g., "BILLING-001")
- `counter_type` - Enum: BILLING, LAB, CASHIER
- `status` - Enum: WAITING, SERVING, DONE
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Production Notes

- Use `npm run db:generate` to create migrations
- Use `npm run db:migrate` to apply migrations in production
- Avoid using `db:push` in production (it's for development only)
- Consider setting up database backups
