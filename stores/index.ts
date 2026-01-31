/**
 * Stores 統一匯出 (Stores Barrel Export)
 * 
 * @module stores
 */

export { useTripStore, createNewTrip, createPlaceholderSpot, createManualSpot } from './tripStore';
export { useUIStore } from './uiStore';
export type { ToastState, ConfirmState } from './uiStore';
