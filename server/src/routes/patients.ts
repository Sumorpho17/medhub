import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { Permission } from '@medhub/shared';
import { AppError } from '../middleware/errorHandler.js';
import { CreatePatientSchema, PatientSearchSchema } from '@medhub/shared';
import {
    createPatient,
    getPatient,
    searchPatients,
    updatePatient,
} from '../services/patient.service.js';

const router = Router();

const getIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

router.use(authenticate);
router.use(generalLimiter);

// POST /patients — Register a new patient
router.post(
    '/',
    requirePermission(Permission.PATIENT_REGISTER),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = CreatePatientSchema.parse(req.body);
            const patient = await createPatient(
                req.user!.clinicId,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.status(201).json(patient);
        } catch (err) {
            next(err);
        }
    },
);

// GET /patients/search?q=&limit=&offset= — Search patients
router.get(
    '/search',
    requirePermission(Permission.PATIENT_READ_DEMOGRAPHICS),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { q, limit, offset } = PatientSearchSchema.parse(req.query);
            const result = await searchPatients(req.user!.clinicId, q, limit, offset);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
);

// GET /patients/:id — Get single patient
router.get(
    '/:id',
    requirePermission(Permission.PATIENT_READ_DEMOGRAPHICS),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const patient = await getPatient(
                req.user!.clinicId,
                req.params['id']!,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.json(patient);
        } catch (err) {
            next(err);
        }
    },
);

// PUT /patients/:id — Update patient
router.put(
    '/:id',
    requirePermission(Permission.PATIENT_REGISTER),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = CreatePatientSchema.partial().parse(req.body);
            const patient = await updatePatient(
                req.user!.clinicId,
                req.params['id']!,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.json(patient);
        } catch (err) {
            next(err);
        }
    },
);

export default router;
