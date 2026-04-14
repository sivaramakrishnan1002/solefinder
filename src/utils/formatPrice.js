export const formatPrice = (price) => {
  const numericPrice = Number(price);

  if (!numericPrice || numericPrice <= 0) {
    return "N/A";
  }

  return `\u20B9${numericPrice.toLocaleString("en-IN")}`;
};
