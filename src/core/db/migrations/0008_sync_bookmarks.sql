CREATE TABLE `sync_bookmarks` (
	`user_id` text NOT NULL,
	`table_name` text NOT NULL,
	`synced_at` text NOT NULL,
	`row_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `table_name`)
);
