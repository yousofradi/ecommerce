const Employee = require('../models/Employee');

/**
 * Admin authentication middleware.
 * Authenticates either Master Admin (via ADMIN_API_KEY) or Employee (via active token).
 */
const adminAuth = async (req, res, next) => {
  const key = req.headers['x-admin-key'] || req.query.ADMIN_API_KEY || req.query.adminKey || req.query.key;
  const adminKey = process.env.ADMIN_API_KEY || 'sundura_secret_admin_key';

  if (!key) {
    return res.status(401).json({ error: 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة' });
  }

  // 1. Check Master Admin Key
  if (key === adminKey) {
    req.adminUser = {
      id: 'superadmin',
      name: 'المدير العام',
      username: process.env.ADMIN_USERNAME || 'admin',
      role: 'superadmin',
      isSuperAdmin: true,
      permissions: {
        dashboard: 'full',
        orders: 'full',
        abandoned_carts: 'full',
        customers: 'full',
        products: 'full',
        collections: 'full',
        homepage: 'full',
        promotions: 'full',
        expenses: 'full',
        settings: 'full',
        shipment: 'full',
        webhooks: 'full',
        whatsapp: 'full',
        employees: 'full'
      }
    };
    return next();
  }

  // 2. Check Employee Session Token
  try {
    const employee = await Employee.findOne({ token: key, isActive: true });
    if (!employee) {
      return res.status(401).json({ error: 'جلسة الدخول غير صالحة أو منتهية، يرجى تسجيل الدخول مجدداً' });
    }

    if (employee.tokenExpiresAt && employee.tokenExpiresAt < new Date()) {
      return res.status(401).json({ error: 'انتهت صلاحية جلسة الدخول، يرجى تسجيل الدخول مجدداً' });
    }

    req.adminUser = {
      id: employee._id,
      name: employee.name,
      username: employee.username,
      role: employee.role || 'employee',
      isSuperAdmin: false,
      permissions: employee.permissions ? employee.permissions.toObject() : {}
    };

    return next();
  } catch (err) {
    console.error('adminAuth error:', err);
    return res.status(500).json({ error: 'خطأ أثناء التحقق من بيانات الدخول' });
  }
};

/**
 * Permission guard middleware.
 * Verifies that the authenticated user has at least `minLevel` ('read' or 'full') for the given `section`.
 */
const requirePermission = (section, minLevel = 'read') => {
  return (req, res, next) => {
    if (!req.adminUser) {
      return res.status(401).json({ error: 'غير مصرح به' });
    }

    // Super Admin bypasses all checks
    if (req.adminUser.isSuperAdmin) {
      return next();
    }

    const perms = req.adminUser.permissions || {};
    const userPerm = perms[section] || 'none';

    if (userPerm === 'full') {
      return next();
    }

    if (minLevel === 'read' && userPerm === 'read') {
      return next();
    }

    return res.status(403).json({
      error: 'عفواً، لا تملك الصلاحية الكافية للوصول إلى هذا القسم أو إجراء هذا التعديل',
      requiredSection: section,
      requiredLevel: minLevel
    });
  };
};

module.exports = adminAuth;
module.exports.requirePermission = requirePermission;
