/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('venues', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.integer('capacity').unsigned();
      table.text('equipment');
      table.string('location').notNullable();
      table.timestamps(true, true); // Adds created_at and updated_at
    })
    .createTable('venue_availability', function(table) {
      table.increments('id').primary();
      table.integer('venue_id').unsigned().notNullable();
      table.datetime('start_time').notNullable();
      table.datetime('end_time').notNullable();
      table.boolean('is_available').defaultTo(true);
      table.timestamps(true, true);
      
      // Foreign key constraint
      table.foreign('venue_id').references('id').inTable('venues').onDelete('CASCADE');
      
      // Unique constraint to prevent overlapping availability
      table.unique(['venue_id', 'start_time', 'end_time']);
    })
    .createTable('venue_bookings', function(table) {
      table.increments('id').primary();
      table.integer('venue_id').unsigned().notNullable();
      table.integer('user_id').unsigned().notNullable();
      table.integer('course_id').unsigned();
      table.integer('session_id').unsigned();
      table.datetime('start_time').notNullable();
      table.datetime('end_time').notNullable();
      table.string('booking_status').defaultTo('confirmed');
      table.text('notes');
      table.timestamps(true, true);
      
      // Foreign key constraints
      table.foreign('venue_id').references('id').inTable('venues').onDelete('RESTRICT');
      table.foreign('user_id').references('id').inTable('users').onDelete('RESTRICT');
      table.foreign('course_id').references('id').inTable('courses').onDelete('SET NULL');
      table.foreign('session_id').references('id').inTable('sessions').onDelete('SET NULL');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('venue_bookings')
    .dropTableIfExists('venue_availability')
    .dropTableIfExists('venues');
};

