/**
 * Replacement for '@/shared/actions' in screen/ViewModel tests: every action is a jest.fn,
 * so tests assert which action a button triggers rather than which path it pushes.
 */
export const goHome = jest.fn();
export const openNewRoutine = jest.fn();
export const openRoutine = jest.fn();
export const goTab = jest.fn();
export const openOnboarding = jest.fn();
export const showOnboardingStep = jest.fn();
export const openLogin = jest.fn();
export const goBack = jest.fn();
/** No navigator to guard in these tests: the screen's own way out is just going back. */
export const useLeaveGuard = () => goBack;
export const openActiveWorkout = jest.fn();
export const openAddExercise = jest.fn();
export const openExerciseLibrary = jest.fn();
export const openExercise = jest.fn();
export const openEquipmentFilter = jest.fn();
export const openCreateExercise = jest.fn();
export const returnToWorkout = jest.fn();
export const openCalendar = jest.fn();
export const openDay = jest.fn();
export const openSession = jest.fn();
export const openWorkoutSaved = jest.fn();
export const openLegal = jest.fn(async () => undefined);
export const openHelpCenter = jest.fn(async () => undefined);
export const sendFeedback = jest.fn(async () => undefined);
export const rateApp = jest.fn(async () => undefined);
