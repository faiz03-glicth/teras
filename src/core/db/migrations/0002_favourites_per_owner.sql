DROP INDEX `exercise_favourites_exercise`;--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_favourites_owner_exercise` ON `exercise_favourites` (`user_id`,`exercise_id`);