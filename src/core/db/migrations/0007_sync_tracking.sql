CREATE TABLE `sync_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`applying` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_tombstones` (
	`table_name` text NOT NULL,
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`deleted_at` text NOT NULL,
	PRIMARY KEY(`table_name`, `id`)
);
--> statement-breakpoint
-- Hand-written below drizzle-kit's tables (it doesn't model triggers). Sync tracking for teras-detail
-- (decision 22): every write to a detail table marks the row dirty and moves updated_at past its last
-- value (the server keeps the newest updated_at), and deleting an owned row leaves a tombstone, cascaded
-- children included; a row written again under the same id drops its tombstone. While sync_state.applying is 1 (the sync engine writing the server's rows or marking
-- pushed rows clean) the triggers do nothing. An update that itself turns dirty on is a marking, not an
-- edit (the insert trigger's, which would otherwise fire the update trigger), so it keeps updated_at. With
-- SQLite's default recursive_triggers = OFF, the update trigger's own UPDATE doesn't fire it again. Rows the person already owns start dirty: the first upload.
-- Built-in exercises and the starter routines have no owner, so they are never sent.
INSERT INTO `sync_state` (`id`, `applying`) VALUES (1, 0);
--> statement-breakpoint
UPDATE `exercises` SET `dirty` = 1 WHERE `user_id` IS NOT NULL AND `is_custom` = 1;
--> statement-breakpoint
UPDATE `exercise_favourites` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `routines` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `routine_exercises` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `workouts` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `workout_exercises` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `workout_sets` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
UPDATE `bodyweight_logs` SET `dirty` = 1 WHERE `user_id` IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER `exercises_sync_insert` AFTER INSERT ON `exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `exercises` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'exercises' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `exercises_sync_update` AFTER UPDATE ON `exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `exercises` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `exercises_sync_delete` AFTER DELETE ON `exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL AND OLD.`is_custom` = 1
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('exercises', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `exercise_favourites_sync_insert` AFTER INSERT ON `exercise_favourites`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `exercise_favourites` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'exercise_favourites' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `exercise_favourites_sync_update` AFTER UPDATE ON `exercise_favourites`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `exercise_favourites` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `exercise_favourites_sync_delete` AFTER DELETE ON `exercise_favourites`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('exercise_favourites', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `routines_sync_insert` AFTER INSERT ON `routines`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `routines` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'routines' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `routines_sync_update` AFTER UPDATE ON `routines`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `routines` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `routines_sync_delete` AFTER DELETE ON `routines`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('routines', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `routine_exercises_sync_insert` AFTER INSERT ON `routine_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `routine_exercises` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'routine_exercises' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `routine_exercises_sync_update` AFTER UPDATE ON `routine_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `routine_exercises` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `routine_exercises_sync_delete` AFTER DELETE ON `routine_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('routine_exercises', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `workouts_sync_insert` AFTER INSERT ON `workouts`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `workouts` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'workouts' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workouts_sync_update` AFTER UPDATE ON `workouts`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `workouts` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workouts_sync_delete` AFTER DELETE ON `workouts`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('workouts', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `workout_exercises_sync_insert` AFTER INSERT ON `workout_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `workout_exercises` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'workout_exercises' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workout_exercises_sync_update` AFTER UPDATE ON `workout_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `workout_exercises` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workout_exercises_sync_delete` AFTER DELETE ON `workout_exercises`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('workout_exercises', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `workout_sets_sync_insert` AFTER INSERT ON `workout_sets`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `workout_sets` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'workout_sets' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workout_sets_sync_update` AFTER UPDATE ON `workout_sets`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `workout_sets` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `workout_sets_sync_delete` AFTER DELETE ON `workout_sets`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('workout_sets', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
--> statement-breakpoint
CREATE TRIGGER `bodyweight_logs_sync_insert` AFTER INSERT ON `bodyweight_logs`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0
BEGIN
	UPDATE `bodyweight_logs` SET `dirty` = 1 WHERE `id` = NEW.`id`;
	DELETE FROM `sync_tombstones` WHERE `table_name` = 'bodyweight_logs' AND `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `bodyweight_logs_sync_update` AFTER UPDATE ON `bodyweight_logs`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND NOT (OLD.`dirty` = 0 AND NEW.`dirty` = 1)
BEGIN
	UPDATE `bodyweight_logs` SET `dirty` = 1,
		`updated_at` = CASE WHEN NEW.`updated_at` > OLD.`updated_at` THEN NEW.`updated_at` ELSE strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)) END
	WHERE `id` = NEW.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `bodyweight_logs_sync_delete` AFTER DELETE ON `bodyweight_logs`
WHEN IFNULL((SELECT `applying` FROM `sync_state` WHERE `id` = 1), 0) = 0 AND OLD.`user_id` IS NOT NULL
BEGIN
	INSERT OR REPLACE INTO `sync_tombstones` (`table_name`, `id`, `user_id`, `deleted_at`)
	VALUES ('bodyweight_logs', OLD.`id`, OLD.`user_id`, strftime('%Y-%m-%dT%H:%M:%fZ', max(julianday('now'), julianday(OLD.`updated_at`) + 0.001 / 86400.0)));
END;
