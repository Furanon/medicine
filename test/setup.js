import { env } from 'cloudflare:test';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Required environment variables that should be mocked
const REQUIRED_ENV_VARS = [
  'DB', // Database connection
  'API_KEY', // If your app needs an API key
  'JWT_SECRET', // If your app uses JWT authentication
  // Add any other required environment variables here
];

// Function to verify Cloudflare environment
function verifyCloudflareEnvironment() {
  // Check if environment is initialized
  if (!env) {
    throw new Error('Cloudflare environment not initialized');
  }
  
  // Verify required environment variables
  const missingVars = [];
  for (const varName of REQUIRED_ENV_VARS) {
    if (!(varName in env)) {
      missingVars.push(varName);
    }
  }
  
  // Warn about missing environment variables
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingVars.join(', ')}`);
    console.warn('Tests may fail due to missing environment configuration');
  }
  
  // Verify DB is properly initialized
  if (!env.DB) {
    throw new Error('Database environment not properly initialized');
  }
}

// Verify Cloudflare environment before running tests
try {
  verifyCloudflareEnvironment();
  console.log('✅ Cloudflare environment initialized and verified');
} catch (error) {
  console.error('❌ Failed to initialize Cloudflare environment:', error.message);
  throw error;
}
// Initialize test database before running tests
beforeAll(async () => {
  try {
    // Begin transaction for all setup operations
    await env.DB.prepare('BEGIN TRANSACTION').run();
    
    console.log('Setting up test database...');
    
    try {
      // Add Recurring_Events tables
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS Recurring_Events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly', 'yearly')) NOT NULL,
          interval INTEGER DEFAULT 1,
          days_of_week TEXT,
          start_time TIME,
          end_time TIME,
          location TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log('Created Recurring_Events table');

    } catch (error) {
      console.error('Error creating Recurring_Events table:', error);
      throw error;
    }
    
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS Event_Instances (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recurring_event_id INTEGER NOT NULL,
          instance_date DATE NOT NULL,
          start_time TIME,
          end_time TIME,
          title TEXT NOT NULL,
          description TEXT,
          location TEXT,
          is_cancelled BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recurring_event_id) REFERENCES Recurring_Events(id) ON DELETE CASCADE
        )
      `).run();
      console.log('Created Event_Instances table');

    } catch (error) {
      console.error('Error creating Event_Instances table:', error);
      throw error;
    }
    
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS Event_Exceptions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recurring_event_id INTEGER NOT NULL,
          exception_date DATE NOT NULL,
          reason TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (recurring_event_id) REFERENCES Recurring_Events(id) ON DELETE CASCADE
        )
      `).run();
      console.log('Created Event_Exceptions table');

    } catch (error) {
      console.error('Error creating Event_Exceptions table:', error);
      throw error;
    }
    
    try {
      // Add Variables table
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS Variables (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `).run();
      console.log('Created Variables table');

    } catch (error) {
      console.error('Error creating Variables table:', error);
      throw error;
    }
    
    try {
      // Create indexes
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_recurring_events_dates ON Recurring_Events(start_date, end_date)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_event_instances_date ON Event_Instances(instance_date)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_event_instances_recurring ON Event_Instances(recurring_event_id)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_event_exceptions_date ON Event_Exceptions(exception_date)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_event_exceptions_recurring ON Event_Exceptions(recurring_event_id)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_variables_name ON Variables(name)').run();
      console.log('Created indexes');

    } catch (error) {
      console.error('Error creating indexes:', error);
      throw error;
    }
    
    try {
      // Add triggers
      await env.DB.prepare(`
        CREATE TRIGGER IF NOT EXISTS update_recurring_events_timestamp 
        AFTER UPDATE ON Recurring_Events
        BEGIN
          UPDATE Recurring_Events SET updated_at = CURRENT_TIMESTAMP 
          WHERE id = NEW.id;
        END
      `).run();

      await env.DB.prepare(`
        CREATE TRIGGER IF NOT EXISTS update_event_instances_timestamp 
        AFTER UPDATE ON Event_Instances
        BEGIN
          UPDATE Event_Instances SET updated_at = CURRENT_TIMESTAMP 
          WHERE id = NEW.id;
        END
      `).run();

      await env.DB.prepare(`
        CREATE TRIGGER IF NOT EXISTS update_variables_timestamp 
        AFTER UPDATE ON Variables
        BEGIN
          UPDATE Variables SET updated_at = CURRENT_TIMESTAMP 
          WHERE id = NEW.id;
        END
      `).run();
      console.log('Created triggers');
    } catch (error) {
      console.error('Error creating triggers:', error);
      throw error;
    }
    
    // Commit the transaction after all setup operations
    await env.DB.prepare('COMMIT').run();
    console.log('Database setup complete');
  } catch (error) {
    // Roll back the transaction if any setup operation fails
    try {
      await env.DB.prepare('ROLLBACK').run();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    console.error('Database setup failed:', error);
    throw error;
  }
});

// Clean up database state after each test
afterEach(async () => {
  try {
    // Start a transaction for cleanup
    await env.DB.prepare('BEGIN TRANSACTION').run();
    
    // Clean up test data - delete all rows but keep structure
    await env.DB.prepare('DELETE FROM Event_Instances').run();
    await env.DB.prepare('DELETE FROM Event_Exceptions').run();
    await env.DB.prepare('DELETE FROM Recurring_Events').run();
    await env.DB.prepare('DELETE FROM Variables').run();
    
    // Reset auto-increment counters
    await env.DB.prepare('DELETE FROM sqlite_sequence WHERE name IN (\'Recurring_Events\', \'Event_Instances\', \'Event_Exceptions\', \'Variables\')').run();
    
    // Commit the cleanup transaction
    await env.DB.prepare('COMMIT').run();
    console.log('Test database cleaned up');
  } catch (error) {
    // Roll back if cleanup fails
    try {
      await env.DB.prepare('ROLLBACK').run();
    } catch (rollbackError) {
      console.error('Error rolling back cleanup transaction:', rollbackError);
    }
    console.error('Database cleanup failed:', error);
    throw error;
  }
});

// Clean up environment mocks after all tests
afterAll(async () => {
  try {
    console.log('Cleaning up environment mocks...');
    
    // Close database connections if needed
    if (env.DB) {
      // If DB has a close method, call it
      if (typeof env.DB.close === 'function') {
        await env.DB.close();
      }
    }
    
    // Reset any modified environment variables to their initial state
    for (const varName of REQUIRED_ENV_VARS) {
      if (varName in env && varName !== 'DB') {
        // Reset to original value or null if applicable
        // This depends on how your environment mocks are implemented
        // env[varName] = null;
      }
    }
    
    console.log('✅ Environment cleanup complete');
  } catch (error) {
    console.error('❌ Error during environment cleanup:', error);
    throw error;
  }
});
