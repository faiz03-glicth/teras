CREATE TABLE `exercise_favourites` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`exercise_id` text NOT NULL,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exercise_favourites_exercise` ON `exercise_favourites` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`equipment` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`type` text NOT NULL,
	`is_compound` integer NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exercises_primary_muscle` ON `exercises` (`primary_muscle`);--> statement-breakpoint
CREATE INDEX `exercises_equipment` ON `exercises` (`equipment`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`target_sets` integer NOT NULL,
	`target_reps` integer,
	`target_seconds` integer,
	`start_weight_kg` real,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `routine_exercises_routine` ON `routine_exercises` (`routine_id`,`position`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bodyweight_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bodyweight_logs_date` ON `bodyweight_logs` (`date`);--> statement-breakpoint
CREATE TABLE `workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`rest_seconds` integer NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workout_exercises_workout` ON `workout_exercises` (`workout_id`,`position`);--> statement-breakpoint
CREATE INDEX `workout_exercises_exercise` ON `workout_exercises` (`exercise_id`);--> statement-breakpoint
CREATE TABLE `workout_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`weight_kg` real,
	`reps` integer,
	`seconds` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`set_type` text DEFAULT 'normal' NOT NULL,
	`rpe` real,
	`note` text,
	`completed_at` text,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workout_sets_workout_exercise` ON `workout_sets` (`workout_exercise_id`,`position`);--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`dirty` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`routine_id` text,
	`date` text NOT NULL,
	`started_at` text NOT NULL,
	`ended_at` text,
	`bodyweight_kg` real NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routines`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `workouts_date` ON `workouts` (`date`);
--> statement-breakpoint
-- Built-in exercise library (104 exercises, from docs/prototype). Add new ones in a later migration.
INSERT INTO `exercises` (`id`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `dirty`, `name`, `equipment`, `primary_muscle`, `secondary_muscles`, `type`, `is_compound`, `is_custom`) VALUES
('bench-press-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bench Press (Barbell)', 'barbell', 'chest', '["triceps","shoulders"]', 'weighted', 1, 0),
('bench-press-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bench Press (Dumbbell)', 'dumbbell', 'chest', '["triceps","shoulders"]', 'weighted', 1, 0),
('incline-bench-press-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Incline Bench Press (Barbell)', 'barbell', 'chest', '["shoulders","triceps"]', 'weighted', 1, 0),
('incline-bench-press-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Incline Bench Press (Dumbbell)', 'dumbbell', 'chest', '["shoulders","triceps"]', 'weighted', 1, 0),
('decline-bench-press-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Decline Bench Press (Barbell)', 'barbell', 'chest', '["triceps"]', 'weighted', 1, 0),
('chest-press-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Chest Press (Machine)', 'machine', 'chest', '["triceps","shoulders"]', 'weighted', 1, 0),
('chest-fly-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Chest Fly (Dumbbell)', 'dumbbell', 'chest', '["shoulders"]', 'weighted', 0, 0),
('cable-fly-crossover-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Cable Fly Crossover (Cable)', 'cable', 'chest', '["shoulders"]', 'weighted', 0, 0),
('pec-deck-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Pec Deck (Machine)', 'machine', 'chest', '[]', 'weighted', 0, 0),
('push-up', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Push Up', 'bodyweight', 'chest', '["triceps","shoulders","abs"]', 'bodyweight', 1, 0),
('chest-dip', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Chest Dip', 'bodyweight', 'chest', '["triceps","shoulders"]', 'bodyweight', 1, 0),
('lat-pulldown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Lat Pulldown (Cable)', 'cable', 'lats', '["biceps","upper_back"]', 'weighted', 1, 0),
('wide-grip-lat-pulldown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Wide Grip Lat Pulldown (Cable)', 'cable', 'lats', '["biceps"]', 'weighted', 1, 0),
('close-grip-lat-pulldown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Close Grip Lat Pulldown (Cable)', 'cable', 'lats', '["biceps"]', 'weighted', 1, 0),
('pull-up', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Pull Up', 'bodyweight', 'lats', '["biceps","upper_back"]', 'bodyweight', 1, 0),
('chin-up', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Chin Up', 'bodyweight', 'lats', '["biceps"]', 'bodyweight', 1, 0),
('assisted-pull-up-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Assisted Pull Up (Machine)', 'machine', 'lats', '["biceps"]', 'weighted', 1, 0),
('straight-arm-pulldown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Straight Arm Pulldown (Cable)', 'cable', 'lats', '["triceps"]', 'weighted', 0, 0),
('bent-over-row-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bent Over Row (Barbell)', 'barbell', 'upper_back', '["lats","biceps","lower_back"]', 'weighted', 1, 0),
('bent-over-row-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bent Over Row (Dumbbell)', 'dumbbell', 'upper_back', '["lats","biceps"]', 'weighted', 1, 0),
('single-arm-row-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Single Arm Row (Dumbbell)', 'dumbbell', 'upper_back', '["lats","biceps"]', 'weighted', 1, 0),
('seated-cable-row-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Seated Cable Row (Cable)', 'cable', 'upper_back', '["lats","biceps"]', 'weighted', 1, 0),
('t-bar-row-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'T Bar Row (Barbell)', 'barbell', 'upper_back', '["lats","biceps"]', 'weighted', 1, 0),
('chest-supported-row-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Chest Supported Row (Machine)', 'machine', 'upper_back', '["lats","biceps"]', 'weighted', 1, 0),
('inverted-row', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Inverted Row', 'bodyweight', 'upper_back', '["biceps","lats"]', 'bodyweight', 1, 0),
('deadlift-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Deadlift (Barbell)', 'barbell', 'lower_back', '["glutes","hamstrings","traps","forearms"]', 'weighted', 1, 0),
('rack-pull-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Rack Pull (Barbell)', 'barbell', 'lower_back', '["traps","glutes"]', 'weighted', 1, 0),
('good-morning-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Good Morning (Barbell)', 'barbell', 'lower_back', '["hamstrings","glutes"]', 'weighted', 1, 0),
('back-extension', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Back Extension', 'bodyweight', 'lower_back', '["glutes","hamstrings"]', 'bodyweight', 0, 0),
('overhead-press-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Overhead Press (Barbell)', 'barbell', 'shoulders', '["triceps","traps"]', 'weighted', 1, 0),
('shoulder-press-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Shoulder Press (Dumbbell)', 'dumbbell', 'shoulders', '["triceps"]', 'weighted', 1, 0),
('shoulder-press-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Shoulder Press (Machine)', 'machine', 'shoulders', '["triceps"]', 'weighted', 1, 0),
('arnold-press-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Arnold Press (Dumbbell)', 'dumbbell', 'shoulders', '["triceps"]', 'weighted', 1, 0),
('lateral-raise-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Lateral Raise (Dumbbell)', 'dumbbell', 'shoulders', '[]', 'weighted', 0, 0),
('single-arm-lateral-raise-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Single Arm Lateral Raise (Cable)', 'cable', 'shoulders', '[]', 'weighted', 0, 0),
('lateral-raise-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Lateral Raise (Machine)', 'machine', 'shoulders', '[]', 'weighted', 0, 0),
('front-raise-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Front Raise (Dumbbell)', 'dumbbell', 'shoulders', '["chest"]', 'weighted', 0, 0),
('rear-delt-reverse-fly-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Rear Delt Reverse Fly (Dumbbell)', 'dumbbell', 'shoulders', '["upper_back"]', 'weighted', 0, 0),
('rear-delt-reverse-fly-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Rear Delt Reverse Fly (Machine)', 'machine', 'shoulders', '["upper_back"]', 'weighted', 0, 0),
('face-pull-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Face Pull (Cable)', 'cable', 'shoulders', '["upper_back","traps"]', 'weighted', 0, 0),
('upright-row-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Upright Row (Barbell)', 'barbell', 'shoulders', '["traps","biceps"]', 'weighted', 1, 0),
('band-pull-apart-band', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Band Pull Apart (Band)', 'band', 'shoulders', '["upper_back"]', 'weighted', 0, 0),
('shrug-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Shrug (Barbell)', 'barbell', 'traps', '["forearms"]', 'weighted', 0, 0),
('shrug-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Shrug (Dumbbell)', 'dumbbell', 'traps', '["forearms"]', 'weighted', 0, 0),
('farmer-s-walk-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Farmer''s Walk (Dumbbell)', 'dumbbell', 'traps', '["forearms","abs"]', 'timed', 1, 0),
('bicep-curl-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bicep Curl (Barbell)', 'barbell', 'biceps', '["forearms"]', 'weighted', 0, 0),
('bicep-curl-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bicep Curl (Dumbbell)', 'dumbbell', 'biceps', '["forearms"]', 'weighted', 0, 0),
('bicep-curl-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bicep Curl (Cable)', 'cable', 'biceps', '["forearms"]', 'weighted', 0, 0),
('hammer-curl-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hammer Curl (Dumbbell)', 'dumbbell', 'biceps', '["forearms"]', 'weighted', 0, 0),
('preacher-curl-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Preacher Curl (Machine)', 'machine', 'biceps', '[]', 'weighted', 0, 0),
('ez-bar-curl-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'EZ Bar Curl (Barbell)', 'barbell', 'biceps', '["forearms"]', 'weighted', 0, 0),
('incline-curl-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Incline Curl (Dumbbell)', 'dumbbell', 'biceps', '[]', 'weighted', 0, 0),
('concentration-curl-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Concentration Curl (Dumbbell)', 'dumbbell', 'biceps', '[]', 'weighted', 0, 0),
('21s-bicep-curl-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, '21s Bicep Curl (Barbell)', 'barbell', 'biceps', '[]', 'weighted', 0, 0),
('triceps-pushdown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Triceps Pushdown (Cable)', 'cable', 'triceps', '[]', 'weighted', 0, 0),
('triceps-rope-pushdown-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Triceps Rope Pushdown (Cable)', 'cable', 'triceps', '[]', 'weighted', 0, 0),
('skull-crusher-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Skull Crusher (Barbell)', 'barbell', 'triceps', '[]', 'weighted', 0, 0),
('overhead-triceps-extension-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Overhead Triceps Extension (Dumbbell)', 'dumbbell', 'triceps', '[]', 'weighted', 0, 0),
('overhead-triceps-extension-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Overhead Triceps Extension (Cable)', 'cable', 'triceps', '[]', 'weighted', 0, 0),
('close-grip-bench-press-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Close Grip Bench Press (Barbell)', 'barbell', 'triceps', '["chest","shoulders"]', 'weighted', 1, 0),
('triceps-dip', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Triceps Dip', 'bodyweight', 'triceps', '["chest","shoulders"]', 'bodyweight', 1, 0),
('bench-dip', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bench Dip', 'bodyweight', 'triceps', '["shoulders"]', 'bodyweight', 0, 0),
('triceps-kickback-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Triceps Kickback (Dumbbell)', 'dumbbell', 'triceps', '[]', 'weighted', 0, 0),
('wrist-curl-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Wrist Curl (Dumbbell)', 'dumbbell', 'forearms', '[]', 'weighted', 0, 0),
('reverse-curl-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Reverse Curl (Barbell)', 'barbell', 'forearms', '["biceps"]', 'weighted', 0, 0),
('dead-hang', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Dead Hang', 'bodyweight', 'forearms', '["lats"]', 'timed', 0, 0),
('squat-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Squat (Barbell)', 'barbell', 'quads', '["glutes","hamstrings","lower_back"]', 'weighted', 1, 0),
('front-squat-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Front Squat (Barbell)', 'barbell', 'quads', '["glutes","abs"]', 'weighted', 1, 0),
('goblet-squat-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Goblet Squat (Dumbbell)', 'dumbbell', 'quads', '["glutes"]', 'weighted', 1, 0),
('goblet-squat-kettlebell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Goblet Squat (Kettlebell)', 'kettlebell', 'quads', '["glutes"]', 'weighted', 1, 0),
('leg-press-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Leg Press (Machine)', 'machine', 'quads', '["glutes","hamstrings"]', 'weighted', 1, 0),
('hack-squat-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hack Squat (Machine)', 'machine', 'quads', '["glutes"]', 'weighted', 1, 0),
('leg-extension-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Leg Extension (Machine)', 'machine', 'quads', '[]', 'weighted', 0, 0),
('bulgarian-split-squat-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bulgarian Split Squat (Dumbbell)', 'dumbbell', 'quads', '["glutes","hamstrings"]', 'weighted', 1, 0),
('lunge-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Lunge (Dumbbell)', 'dumbbell', 'quads', '["glutes","hamstrings"]', 'weighted', 1, 0),
('walking-lunge-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Walking Lunge (Dumbbell)', 'dumbbell', 'quads', '["glutes"]', 'weighted', 1, 0),
('step-up-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Step Up (Dumbbell)', 'dumbbell', 'quads', '["glutes"]', 'weighted', 1, 0),
('bodyweight-squat', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Bodyweight Squat', 'bodyweight', 'quads', '["glutes"]', 'bodyweight', 1, 0),
('romanian-deadlift-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Romanian Deadlift (Barbell)', 'barbell', 'hamstrings', '["glutes","lower_back"]', 'weighted', 1, 0),
('romanian-deadlift-dumbbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Romanian Deadlift (Dumbbell)', 'dumbbell', 'hamstrings', '["glutes","lower_back"]', 'weighted', 1, 0),
('lying-leg-curl-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Lying Leg Curl (Machine)', 'machine', 'hamstrings', '[]', 'weighted', 0, 0),
('seated-leg-curl-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Seated Leg Curl (Machine)', 'machine', 'hamstrings', '[]', 'weighted', 0, 0),
('nordic-curl', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Nordic Curl', 'bodyweight', 'hamstrings', '["glutes"]', 'bodyweight', 0, 0),
('hip-thrust-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hip Thrust (Barbell)', 'barbell', 'glutes', '["hamstrings"]', 'weighted', 1, 0),
('hip-thrust-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hip Thrust (Machine)', 'machine', 'glutes', '["hamstrings"]', 'weighted', 1, 0),
('glute-bridge', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Glute Bridge', 'bodyweight', 'glutes', '["hamstrings"]', 'bodyweight', 0, 0),
('glute-kickback-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Glute Kickback (Cable)', 'cable', 'glutes', '["hamstrings"]', 'weighted', 0, 0),
('sumo-deadlift-barbell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Sumo Deadlift (Barbell)', 'barbell', 'glutes', '["hamstrings","quads","adductors"]', 'weighted', 1, 0),
('kettlebell-swing-kettlebell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Kettlebell Swing (Kettlebell)', 'kettlebell', 'glutes', '["hamstrings","lower_back"]', 'weighted', 1, 0),
('standing-calf-raise-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Standing Calf Raise (Machine)', 'machine', 'calves', '[]', 'weighted', 0, 0),
('seated-calf-raise-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Seated Calf Raise (Machine)', 'machine', 'calves', '[]', 'weighted', 0, 0),
('calf-raise', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Calf Raise', 'bodyweight', 'calves', '[]', 'bodyweight', 0, 0),
('hip-adduction-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hip Adduction (Machine)', 'machine', 'adductors', '[]', 'weighted', 0, 0),
('hip-abduction-machine', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hip Abduction (Machine)', 'machine', 'abductors', '["glutes"]', 'weighted', 0, 0),
('crunch', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Crunch', 'bodyweight', 'abs', '[]', 'bodyweight', 0, 0),
('cable-crunch-cable', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Cable Crunch (Cable)', 'cable', 'abs', '[]', 'weighted', 0, 0),
('hanging-leg-raise', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Hanging Leg Raise', 'bodyweight', 'abs', '["forearms"]', 'bodyweight', 0, 0),
('plank', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Plank', 'bodyweight', 'abs', '["shoulders"]', 'timed', 0, 0),
('side-plank', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Side Plank', 'bodyweight', 'abs', '[]', 'timed', 0, 0),
('russian-twist', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Russian Twist', 'bodyweight', 'abs', '[]', 'bodyweight', 0, 0),
('ab-wheel-rollout', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Ab Wheel Rollout', 'bodyweight', 'abs', '["lats"]', 'bodyweight', 0, 0),
('sit-up', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Sit Up', 'bodyweight', 'abs', '[]', 'bodyweight', 0, 0),
('mountain-climber', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Mountain Climber', 'bodyweight', 'abs', '["shoulders"]', 'bodyweight', 1, 0),
('turkish-get-up-kettlebell', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Turkish Get Up (Kettlebell)', 'kettlebell', 'shoulders', '["abs","glutes"]', 'weighted', 1, 0);
--> statement-breakpoint
-- Starter routines (from docs/prototype). They are ordinary routines: the owner can edit or delete them.
INSERT INTO `routines` (`id`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `dirty`, `name`, `position`) VALUES
('push', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Push Day', 0),
('pull', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Pull Day', 1),
('legs', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'Leg Day', 2);
--> statement-breakpoint
INSERT INTO `routine_exercises` (`id`, `user_id`, `created_at`, `updated_at`, `deleted_at`, `dirty`, `routine_id`, `exercise_id`, `position`, `target_sets`, `target_reps`, `target_seconds`, `start_weight_kg`) VALUES
('push-1', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'push', 'bench-press-barbell', 0, 4, 8, NULL, 60),
('push-2', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'push', 'overhead-press-barbell', 1, 3, 8, NULL, 40),
('push-3', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'push', 'incline-bench-press-dumbbell', 2, 3, 10, NULL, 22),
('push-4', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'push', 'lateral-raise-dumbbell', 3, 3, 12, NULL, 8),
('push-5', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'push', 'triceps-pushdown-cable', 4, 3, 12, NULL, 25),
('pull-1', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'pull', 'deadlift-barbell', 0, 3, 5, NULL, 120),
('pull-2', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'pull', 'bent-over-row-barbell', 1, 4, 8, NULL, 60),
('pull-3', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'pull', 'lat-pulldown-cable', 2, 3, 10, NULL, 50),
('pull-4', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'pull', 'face-pull-cable', 3, 3, 15, NULL, 20),
('pull-5', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'pull', 'bicep-curl-dumbbell', 4, 3, 10, NULL, 14),
('legs-1', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'squat-barbell', 0, 4, 6, NULL, 95),
('legs-2', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'romanian-deadlift-barbell', 1, 3, 8, NULL, 80),
('legs-3', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'leg-press-machine', 2, 3, 10, NULL, 140),
('legs-4', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'leg-extension-machine', 3, 3, 12, NULL, 45),
('legs-5', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'standing-calf-raise-machine', 4, 3, 12, NULL, 60),
('legs-6', NULL, '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z', NULL, 0, 'legs', 'plank', 5, 3, NULL, 45, NULL);
