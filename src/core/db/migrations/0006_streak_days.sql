CREATE TABLE `streak_days` (
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	PRIMARY KEY(`user_id`, `date`)
);
--> statement-breakpoint
CREATE TABLE `streak_sync` (
	`user_id` text PRIMARY KEY NOT NULL,
	`changed_at` text NOT NULL,
	`date` text NOT NULL,
	`pulled_at` text NOT NULL
);
