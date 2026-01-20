# Database Migration Instructions

## Problem

The `device_thresholds` table has a CHECK constraint that only allows the old 8 threshold parameters. The new implementation adds 18 parameter groups, which violates this constraint.

**Error Message:**
```
ERROR: new row for relation "device_thresholds" violates check constraint "device_thresholds_parameter_check"
```

## Solution

You need to update the database constraint to allow the new threshold parameters.

---

## Method 1: Using psql (Recommended)

### Step 1: Connect to your PostgreSQL database

```bash
psql -U postgres -d generator_db
```

Replace `postgres` with your database username and `generator_db` with your database name.

### Step 2: Run the migration script

From the psql prompt:

```sql
\i UPDATE_DATABASE_CONSTRAINTS.sql
```

Or run it directly from the command line:

```bash
psql -U postgres -d generator_db -f UPDATE_DATABASE_CONSTRAINTS.sql
```

---

## Method 2: Using pgAdmin or Any PostgreSQL Client

1. Open your PostgreSQL client (pgAdmin, DBeaver, etc.)
2. Connect to your database
3. Open the `UPDATE_DATABASE_CONSTRAINTS.sql` file
4. Execute the SQL script

---

## Method 3: Manual SQL Execution

Copy and paste the following SQL commands into your PostgreSQL client:

```sql
-- Drop the old constraint
ALTER TABLE device_thresholds DROP CONSTRAINT IF EXISTS device_thresholds_parameter_check;

-- Add new constraint with all 18 parameters
ALTER TABLE device_thresholds ADD CONSTRAINT device_thresholds_parameter_check
CHECK (parameter IN (
    'RPM',
    'GENERATOR_FREQUENCY',
    'MAINS_BUS_FREQUENCY',
    'GENERATOR_VOLTAGE_LN',
    'GENERATOR_VOLTAGE_LL',
    'MAINS_BUS_VOLTAGE_LN',
    'MAINS_BUS_VOLTAGE_LL',
    'GENERATOR_CURRENT',
    'REAL_POWER',
    'REACTIVE_POWER',
    'POWER_FACTOR',
    'EARTH_FAULT_CURRENT',
    'ROCOF',
    'OIL_PRESSURE',
    'OIL_TEMPERATURE',
    'FUEL_LEVEL',
    'BATTERY_VOLTAGE',
    'E_STOP'
));
```

---

## Verification

After running the migration, verify it was successful:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'device_thresholds'::regclass
AND conname = 'device_thresholds_parameter_check';
```

You should see the constraint definition with all 18 parameters.

---

## Additional Notes

### Option A: Keep Existing Thresholds

The migration script will preserve your existing threshold data. The old parameters (VOLTAGE, CURRENT, etc.) will continue to work via the backward compatibility layer.

### Option B: Start Fresh (Optional)

If you want to remove all old thresholds and let the system create new ones with default values, you can add this command after the constraint update:

```sql
DELETE FROM device_thresholds;
```

Then restart your backend. The system will automatically create default thresholds for all registered devices with the new 18 parameter groups.

---

## Docker PostgreSQL

If you're using Docker for PostgreSQL:

```bash
# Copy the SQL file into the container
docker cp UPDATE_DATABASE_CONSTRAINTS.sql <container_name>:/tmp/

# Execute it
docker exec -it <container_name> psql -U postgres -d generator_db -f /tmp/UPDATE_DATABASE_CONSTRAINTS.sql
```

---

## Railway PostgreSQL

If you're using Railway:

1. Go to your Railway dashboard
2. Click on your PostgreSQL service
3. Click on "Data" tab
4. Click on "Query" to open the SQL editor
5. Paste the SQL commands from `UPDATE_DATABASE_CONSTRAINTS.sql`
6. Click "Run"

---

## Troubleshooting

### Error: "permission denied"

Make sure you're connected as a user with ALTER TABLE privileges (usually the database owner or superuser).

### Error: "constraint does not exist"

This is fine - it means the constraint doesn't exist yet. The script will still create the new constraint.

### Existing Data Issues

If you have existing threshold records with old parameter names that are no longer valid, you may need to delete them first:

```sql
-- Check for old parameters
SELECT DISTINCT parameter FROM device_thresholds;

-- Delete old parameters (if needed)
DELETE FROM device_thresholds WHERE parameter IN ('VOLTAGE', 'CURRENT', 'FREQUENCY', 'POWER', 'TEMPERATURE');
```

---

## After Migration

1. Restart your backend application
2. The system will automatically create default thresholds for all devices
3. You can configure thresholds via the Settings page (`/device/{deviceId}/settings`)

---

## Need Help?

If you encounter any issues:

1. Check that you have the correct database connection details
2. Verify you have ALTER TABLE privileges
3. Check the PostgreSQL logs for more detailed error messages
4. Contact support with the error message

---

**Once the migration is complete, your system will support all 18 threshold parameter groups!**
