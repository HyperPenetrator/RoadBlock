import { renderHook, act } from '@testing-library/react';
import { PermissionService } from '../services/PermissionService';
import { usePermissionStore } from '../store/usePermissionStore';

// Note: describe, it, expect, vi, beforeEach are accessed globally via --globals
describe('Permission Grid - Operational Integrity Tests', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        act(() => {
            usePermissionStore.getState().resetPermissions();
        });
    });

    it('Scenario 1: Full Tactical Clearance (Granted)', async () => {
        const queryMock = vi.fn().mockResolvedValue({ state: 'granted' });
        vi.stubGlobal('navigator', {
            permissions: { query: queryMock },
            geolocation: { getCurrentPosition: vi.fn() },
            wakeLock: { request: vi.fn() }
        });
        
        const { result } = renderHook(() => usePermissionStore());
        
        await act(async () => {
            await result.current.checkPermissions();
        });

        expect(result.current.geolocationStatus).toBe('granted');
    });

    it('Scenario 2: Denied Link (Manual Override Req)', async () => {
        const getCurrentPositionMock = vi.fn().mockImplementation((_success, error) => {
            error({ code: 1, message: 'User Denied Geolocation' });
        });
        
        vi.stubGlobal('navigator', {
            geolocation: { getCurrentPosition: getCurrentPositionMock }
        });

        const { result } = renderHook(() => usePermissionStore());
        
        let success = true;
        await act(async () => {
            success = await result.current.requestGeolocation();
        });

        expect(success).toBe(false);
        expect(result.current.geolocationStatus).toBe('denied');
    });

    it('Scenario 3: Wake Lock Engagement & Failure Tolerance', async () => {
        const mockSentinel = { release: vi.fn(), addEventListener: vi.fn() };
        const requestMock = vi.fn().mockResolvedValue(mockSentinel);
        
        vi.stubGlobal('navigator', {
            wakeLock: { request: requestMock }
        });

        const { result } = renderHook(() => usePermissionStore());
        
        let success = false;
        await act(async () => {
            success = await result.current.requestWakeLock();
        });
        
        expect(success).toBe(true);
        expect(result.current.wakeLockStatus).toBe('granted');

        // Test failure (NotSupported)
        requestMock.mockRejectedValue(new Error('NotSupportedError'));
        await act(async () => {
            success = await result.current.requestWakeLock();
        });
        expect(success).toBe(false);
        expect(result.current.wakeLockStatus).toBe('denied');
    });

    it('Scenario 4: Onboarding Persistent State', () => {
        const { result } = renderHook(() => usePermissionStore());
        
        expect(result.current.isOnboarded).toBe(false);

        act(() => {
            result.current.completeOnboarding();
        });
        
        expect(result.current.isOnboarded).toBe(true);
        expect(localStorage.getItem('onboarded')).toBe('true');
    });
});
