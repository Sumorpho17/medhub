import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { Permission } from '@medhub/shared';
import { AppError } from '../middleware/errorHandler.js';
import { InviteStaffSchema, UpdateStaffSchema, StaffListQuerySchema } from '@medhub/shared';
import { inviteStaff, acceptInvite, listStaff, updateStaff } from '../services/staff.service.js';

const router = Router();

const getIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

// ─── Invite endpoints (authenticated) ──────────────────────────────────────────

router.use('/invite', authenticate, generalLimiter);

// POST /staff/invite — Generate staff invite link (Clinic Admin only)
router.post(
    '/invite',
    requirePermission(Permission.STAFF_FULL),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = InviteStaffSchema.parse(req.body);
            const result = await inviteStaff(
                input,
                req.user!.clinicId,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    },
);

// GET /staff — List staff (authenticated with permission)
router.get(
    '/',
    authenticate,
    requirePermission(Permission.STAFF_FULL),
    generalLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit, role, search } = StaffListQuerySchema.parse(req.query);
            const result = await listStaff(req.user!.clinicId, page, limit, role, search);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
);

// PATCH /staff/:id — Update staff role / deactivate
router.patch(
    '/:id',
    authenticate,
    requirePermission(Permission.STAFF_FULL),
    generalLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = UpdateStaffSchema.parse(req.body);
            const updated = await updateStaff(
                req.params['id']!,
                req.user!.clinicId,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.json(updated);
        } catch (err) {
            next(err);
        }
    },
);

// ─── Public invite acceptance endpoint ─────────────────────────────────────────

// POST /staff/accept — Accept invite (no auth — user creating their account)
router.post(
    '/accept',
    generalLimiter,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, password, deviceFingerprint, deviceName } = req.body as Record<string, string>;
            if (!token || !password || !deviceFingerprint) {
                throw new AppError(400, 'MISSING_FIELDS', 'token, password, and deviceFingerprint are required');
            }
            if (password.length < 10) {
                throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 10 characters');
            }
            const result = await acceptInvite(token, password, deviceFingerprint, deviceName, getIp(req));
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    },
);

export default router;
