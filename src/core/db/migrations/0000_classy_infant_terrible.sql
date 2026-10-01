CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`email` text,
	`display_name` text,
	`username` text,
	`avatar_url` text,
	`provider` text NOT NULL,
	`time_zone` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workout_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`volume_kg` real NOT NULL,
	`sets` integer NOT NULL,
	`workouts` integer NOT NULL,
	`level` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workout_days_owner_date` ON `workout_days` (`user_id`,`date`);