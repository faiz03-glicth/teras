/**
 * Replacement for '@/shared/actions' in screen/ViewModel tests: every action is a jest.fn,
 * so tests assert which action a button triggers rather than which path it pushes.
 */
export const goHome = jest.fn();
export const goTab = jest.fn();
export const openOnboarding = jest.fn();
export const showOnboardingStep = jest.fn();
export const openLogin = jest.fn();
export const goBack = jest.fn();
export const openLegal = jest.fn(async () => undefined);
export const openHelpCenter = jest.fn(async () => undefined);
export const sendFeedback = jest.fn(async () => undefined);
export const rateApp = jest.fn(async () => undefined);
