/** Money helpers. Amounts are plain USD numbers (no cents sub-unit here). */

export const formatMoney = (amount) => {
  const n = Number(amount) || 0;
  return `$${n.toLocaleString('en-US', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
};

export default formatMoney;
