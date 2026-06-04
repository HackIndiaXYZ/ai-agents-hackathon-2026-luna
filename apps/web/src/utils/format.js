/**
 * Format helper to format numbers into INR format: e.g. ₹6,42,000
 * @param {number|string} n 
 * @returns {string}
 */
export const formatINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

/**
 * Format quantity with units
 * @param {number|string} n 
 * @param {string} unit 
 * @returns {string}
 */
export const formatQty = (n, unit) => {
  const qty = Number(n);
  const u = unit ? unit.trim().toLowerCase() : 'quintal';
  return `${isNaN(qty) ? 0 : qty} ${u}`;
};

/**
 * Format dates into DD MMM YYYY: e.g. 15 Jun 2026
 * @param {string} isoString 
 * @returns {string}
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options); // en-GB outputs: 15 Jun 2026
};

/**
 * Format PnL values with sign: e.g. +₹47,200 or -₹12,400
 * @param {number|string} n 
 * @returns {string}
 */
export const formatPnL = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  const prefix = num >= 0 ? '+' : '-';
  const absVal = Math.abs(num);
  return `${prefix}₹${absVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

/**
 * Get color class for PnL values
 * @param {number|string} n 
 * @returns {string}
 */
export const getPnLColor = (n) => {
  const num = Number(n);
  if (isNaN(num) || num === 0) return 'text-slate-500';
  return num > 0 ? 'text-green-600' : 'text-red-600';
};

/**
 * Get badge variant or color classes based on contract status
 * @param {string} status 
 * @returns {string} Badge variant name
 */
export const getStatusColor = (status) => {
  const s = String(status).toLowerCase().trim().replace(/_/g, ' ');
  switch (s) {
    case 'draft':
      return 'neutral';
    case 'confirmed':
      return 'info';
    case 'in transit':
    case 'intransit':
    case 'in-transit':
      return 'warning';
    case 'delivered':
      return 'success';
    case 'settled':
      return 'success';
    default:
      return 'neutral';
  }
};

/**
 * Get color variant based on contract type
 * @param {string} type 
 * @returns {string} Badge variant name (green for sell/success, blue for buy/info)
 */
export const getContractTypeColor = (type) => {
  const t = String(type).toLowerCase().trim();
  if (t === 'sell') {
    return 'success';
  }
  return 'info';
};
