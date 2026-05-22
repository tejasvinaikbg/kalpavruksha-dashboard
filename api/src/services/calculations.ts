export type CartEntryNumbers = {
  openingStock: number;
  restock: number;
  damagedStock: number;
  normalOnlineQty: number;
  normalOnlinePrice: number;
  addOnOnlineQty: number;
  addOnOnlinePrice: number;
  discountedOnlineQty: number;
  discountedOnlinePrice: number;
  normalCashQty: number;
  normalCashPrice: number;
  addOnCashQty: number;
  addOnCashPrice: number;
  discountedCashQty: number;
  discountedCashPrice: number;
  miscellaneousAmount: number;
};

export type CartEntryCalculations = {
  availableStock: number;
  totalSold: number;
  expectedClosing: number;
  normalOnlineAmount: number;
  addOnOnlineAmount: number;
  discountedOnlineAmount: number;
  totalOnlineAmount: number;
  normalCashAmount: number;
  addOnCashAmount: number;
  discountedCashAmount: number;
  totalCashAmount: number;
  totalAmount: number;
  hasMismatch: boolean;
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateCartEntry(
  input: CartEntryNumbers
): CartEntryCalculations {
  const availableStock = input.openingStock + input.restock;
  const totalSold =
    input.normalOnlineQty +
    input.addOnOnlineQty +
    input.discountedOnlineQty +
    input.normalCashQty +
    input.addOnCashQty +
    input.discountedCashQty;
  const expectedClosing = availableStock - totalSold - input.damagedStock;
  const normalOnlineAmount = money(
    input.normalOnlineQty * input.normalOnlinePrice
  );
  const addOnOnlineAmount = money(input.addOnOnlineQty * input.addOnOnlinePrice);
  const discountedOnlineAmount = money(
    input.discountedOnlineQty * input.discountedOnlinePrice
  );
  const totalOnlineAmount = money(
    normalOnlineAmount + addOnOnlineAmount + discountedOnlineAmount
  );
  const normalCashAmount = money(input.normalCashQty * input.normalCashPrice);
  const addOnCashAmount = money(input.addOnCashQty * input.addOnCashPrice);
  const discountedCashAmount = money(
    input.discountedCashQty * input.discountedCashPrice
  );
  const totalCashAmount = money(
    normalCashAmount + addOnCashAmount + discountedCashAmount
  );
  const totalAmount = money(
    totalOnlineAmount + totalCashAmount - input.miscellaneousAmount
  );

  return {
    availableStock,
    totalSold,
    expectedClosing,
    normalOnlineAmount,
    addOnOnlineAmount,
    discountedOnlineAmount,
    totalOnlineAmount,
    normalCashAmount,
    addOnCashAmount,
    discountedCashAmount,
    totalCashAmount,
    totalAmount,
    hasMismatch: false
  };
}
