import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { Permission } from '@medhub/shared';
import { UpdateClinicSettingsSchema, AuditLogQuerySchema } from '@medhub/shared';
import {
    getClinicSettings,
    updateClinicSettings,
    listDevices,
    revokeDevice,
    getAuditLogs,
    getDashboardStats,
} from '../services/clinic.service.js';

const router = Router();

const getIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

router.use(authenticate);
router.use(generalLimiter);

// GET /clinic — Get clinic settings
router.get(
    '/',
    requirePermission(Permission.SETTINGS_FULL),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const clinic = await getClinicSettings(req.user!.clinicId);
            res.json(clinic);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /clinic — Update clinic settings
router.put(
    '/',
    requirePermission(Permission.SETTINGS_FULL),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = UpdateClinicSettingsSchema.parse(req.body);
            const clinic = await updateClinicSettings(
                req.user!.clinicId,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.json(clinic);
        } catch (err) {
            next(err);
        }
    },
);

// GET /clinic/devices — List devices
router.get(
    '/devices',
    requirePermission(Permission.DEVICE_MANAGE),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const devices = await listDevices(req.user!.clinicId);
            res.json(devices);
        } catch (err) {
            next(err);
        }
    },
);

// POST /clinic/devices/:id/revoke — Revoke a device
router.post(
    '/devices/:id/revoke',
    requirePermission(Permission.DEVICE_MANAGE),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await revokeDevice(
                req.params['id']!,
                req.user!.clinicId,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.json({ message: 'Device revoked successfully' });
        } catch (err) {
            next(err);
        }
    },
);

// GET /clinic/audit-log — View audit logs
router.get(
    '/audit-log',
    requirePermission(Permission.AUDIT_LOG_READ),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { page, limit, action, userId, startDate, endDate } = AuditLogQuerySchema.parse(req.query);
            const result = await getAuditLogs(
                req.user!.clinicId,
                page,
                limit,
                action,
                userId,
                startDate,
                endDate,
            );
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
);

// GET /clinic/dashboard — Dashboard stats
router.get(
    '/dashboard',
    requirePermission(Permission.REPORTS_FULL),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const stats = await getDashboardStats(req.user!.clinicId);
            res.json(stats);
        } catch (err) {
            next(err);
        }
    },
);

export default router;
