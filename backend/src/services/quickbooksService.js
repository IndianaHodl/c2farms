import prisma from '../config/database.js';
import { updateAccountingCell } from './calculationService.js';

// QuickBooks OAuth2 placeholder
export function getAuthUrl(farmId) {
  const clientId = process.env.QB_CLIENT_ID;
  const redirectUri = process.env.QB_REDIRECT_URI;

  if (!clientId) {
    return { fallback: true, message: 'QuickBooks not configured. Please enter actuals manually.' };
  }

  const url = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=com.intuit.quickbooks.accounting&redirect_uri=${encodeURIComponent(redirectUri)}&state=${farmId}`;
  return { url };
}

export async function handleCallback(code, realmId, state) {
  // Placeholder: In production, exchange code for tokens
  // For now, store dummy tokens
  const farmId = state;

  await prisma.qbToken.upsert({
    where: { farm_id: farmId },
    update: {
      access_token: 'placeholder_access_token',
      refresh_token: 'placeholder_refresh_token',
      realm_id: realmId || 'placeholder',
      expires_at: new Date(Date.now() + 3600000),
    },
    create: {
      farm_id: farmId,
      access_token: 'placeholder_access_token',
      refresh_token: 'placeholder_refresh_token',
      realm_id: realmId || 'placeholder',
      expires_at: new Date(Date.now() + 3600000),
    },
  });

  return { success: true };
}

export async function syncExpenses(farmId, startDate, endDate, fiscalYear) {
  // Check if QB tokens exist
  const tokens = await prisma.qbToken.findUnique({ where: { farm_id: farmId } });

  if (!tokens || !process.env.QB_CLIENT_ID) {
    return {
      fallback: true,
      message: 'QuickBooks is not connected. Please enter actuals manually.',
    };
  }

  try {
    // Placeholder: In production, make API call to QB
    // For MVP, return fallback
    throw new Error('QB API not implemented');
  } catch (err) {
    return {
      fallback: true,
      message: `QuickBooks sync failed: ${err.message}. Please enter actuals manually.`,
    };
  }
}

export async function getMappings(farmId) {
  return prisma.qbCategoryMapping.findMany({
    where: { farm_id: farmId },
  });
}

export async function upsertMapping(farmId, qbAccountName, categoryCode, weight = 1.0) {
  return prisma.qbCategoryMapping.upsert({
    where: {
      farm_id_qb_account_name: { farm_id: farmId, qb_account_name: qbAccountName },
    },
    update: { category_code: categoryCode, weight },
    create: { farm_id: farmId, qb_account_name: qbAccountName, category_code: categoryCode, weight },
  });
}
