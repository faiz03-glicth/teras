ALTER TABLE `routines` ADD `is_starter` integer DEFAULT false NOT NULL;--> statement-breakpoint
-- Every routine without an owner so far is a seeded starter: nothing let a guest build one before this.
UPDATE `routines` SET `is_starter` = 1 WHERE `user_id` IS NULL;
