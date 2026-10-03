import { router } from 'expo-router';

import { NEW_ROUTINE } from './params';
import { routes } from './routes';
import type { AddExerciseTarget, AuthIntent, ISODate, OnboardingStep, Tab } from './types';

/** Auth-flow screens either push (forward) or replace (so Back never returns to the screen left behind). */
interface FlowOptions {
  replace?: boolean;
}

export function goHome(): void {
  router.dismissTo(routes.home());
}

export function goTab(tab: Tab): void {
  router.navigate(routes.tab(tab));
}

export function openOnboarding(step: OnboardingStep, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.onboarding(step));
  else router.push(routes.onboarding(step));
}

/** Moves between Welcome and Set up INSIDE the onboarding screen, so neither is left on the back stack. */
export function showOnboardingStep(step: OnboardingStep): void {
  router.setParams({ step: String(step) });
}

export function openLogin(intent: AuthIntent, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.login(intent));
  else router.push(routes.login(intent));
}

/** The workout in progress, pushed over the tabs. */
export function openActiveWorkout({ replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.activeWorkout());
  else router.push(routes.activeWorkout());
}

/** The full training wave, with every workout listed by month (opened from Home's wave). */
export function openCalendar(): void {
  router.push(routes.calendar());
}

/** A day's detail, as a sheet over the wave it was tapped on. */
export function openDay(date: ISODate): void {
  router.push(routes.day(date));
}

/**
 * A logged workout. Opened from a day's sheet it takes the sheet's place (`replace`), as in the
 * prototype: Back then returns to the wave the day was tapped on, not to the sheet.
 */
export function openSession(id: string, { replace = false }: FlowOptions = {}): void {
  if (replace) router.replace(routes.session(id));
  else router.push(routes.session(id));
}

/**
 * What a just-finished workout came to. It takes the workout's place, so Back never returns to a workout
 * that is over.
 */
export function openWorkoutSaved(id: string): void {
  router.replace(routes.workoutSaved(id));
}

/** The exercise library, for adding one to the workout in progress, or to the routine being edited. */
export function openAddExercise(target: AddExerciseTarget = 'workout'): void {
  router.push(routes.addExercise(target));
}

/** Edit routine, for a new one. */
export function openNewRoutine(): void {
  router.push(routes.routine(NEW_ROUTINE));
}

/** Edit routine: its name, and its exercises in order. */
export function openRoutine(id: string): void {
  router.push(routes.routine(id));
}

/** Every exercise, to browse and open one (from the Workout tab). */
export function openExerciseLibrary(): void {
  router.push(routes.exerciseLibrary());
}

/** One exercise: what it works, its records and its history. */
export function openExercise(id: string): void {
  router.push(routes.exercise(id));
}

/** Form sheet over the exercise browser: narrow it to one kind of equipment. */
export function openEquipmentFilter(): void {
  router.push(routes.equipmentFilter());
}

/** Form sheet over the exercise browser: add an exercise of their own. */
export function openCreateExercise(): void {
  router.push(routes.createExercise());
}

/**
 * Back to the workout in progress: the screens opened over it close, so Back from the workout never
 * returns to them. Opened from somewhere else, the workout takes this screen's place.
 */
export function returnToWorkout(): void {
  router.dismissTo(routes.activeWorkout());
}

/** Pops the current screen; when there is nothing to pop, runs `fallback` (default: Home). */
export function goBack(fallback: () => void = goHome): void {
  if (router.canGoBack()) router.back();
  else fallback();
}
