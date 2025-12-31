# Queue Backend - Database Setup

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

### Running the Application

1. Start PostgreSQL:

   ```bash
   docker-compose up -d
   ```

2. Install dependencies (if not already done):

   ```bash
   npm install
   ```

3. Start the NestJS application:
   ```bash
   npm run start:dev
   ```

The application will automatically:

- Connect to PostgreSQL
- Create the `queues` table (synchronize: true)
- Initialize counter IDs from existing data

### Accessing PostgreSQL Directly

```bash
# Connect to PostgreSQL container
docker exec -it queue-postgres psql -U queue_user -d queue_db

# Common queries
SELECT * FROM queues;
SELECT * FROM queues WHERE status = 'SERVING';
SELECT * FROM queues WHERE "counterType" = 'BILLING';
```

### Production Notes

- Set `synchronize: false` in `app.module.ts` for production
- Use TypeORM migrations instead of synchronize
- Use environment variables for database credentials
- Consider setting up database backups
