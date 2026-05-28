import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate, requirePermission } from '../middleware/authenticate.js';
import { generalLimiter } from '../middleware/rateLimiter.js';
import { Permission } from '@medhub/shared';
import { CreateInvoiceSchema, RecordPaymentSchema, RevenueReportSchema } from '@medhub/shared';
import { createInvoice, recordPayment, listInvoices, getRevenueReport } from '../services/billing.service.js';

const router = Router();

const getIp = (req: Request): string =>
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
    req.socket.remoteAddress ??
    'unknown';

router.use(authenticate);
router.use(generalLimiter);

// POST /billing/invoices — Create invoice
router.post(
    '/invoices',
    requirePermission(Permission.INVOICE_CREATE),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = CreateInvoiceSchema.parse(req.body);
            const invoice = await createInvoice(
                req.user!.clinicId,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.status(201).json(invoice);
        } catch (err) {
            next(err);
        }
    },
);

// GET /billing/invoices — List invoices
router.get(
    '/invoices',
    requirePermission(Permission.INVOICE_READ),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const patientId = req.query['patientId'] as string | undefined;
            const status = req.query['status'] as string | undefined;
            const page = parseInt(req.query['page'] as string) || 1;
            const limit = parseInt(req.query['limit'] as string) || 20;
            const result = await listInvoices(req.user!.clinicId, patientId, status, page, limit);
            res.json(result);
        } catch (err) {
            next(err);
        }
    },
);

// POST /billing/payments — Record payment
router.post(
    '/payments',
    requirePermission(Permission.PAYMENT_RECORD),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const input = RecordPaymentSchema.parse(req.body);
            const payment = await recordPayment(
                req.user!.clinicId,
                input,
                req.user!.sub,
                req.user!.role,
                getIp(req),
                req.headers['user-agent'] ?? null,
            );
            res.status(201).json(payment);
        } catch (err) {
            next(err);
        }
    },
);

// GET /billing/reports/revenue — Revenue report
router.get(
    '/reports/revenue',
    requirePermission(Permission.REPORTS_FULL),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { startDate, endDate } = RevenueReportSchema.parse(req.query);
            const report = await getRevenueReport(req.user!.clinicId, startDate, endDate);
            res.json(report);
        } catch (err) {
            next(err);
        }
    },
);

export default router;
