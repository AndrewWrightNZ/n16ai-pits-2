export const formatShortAddress = (address: string, postcode?: string) => {
  // Return the first two parts of the address, split by commas
  const initialShortAddress = address.split(",").slice(0, 2).join(", ");

  const withPostCodeRemoved = postcode
    ? initialShortAddress.replace(postcode, "")
    : initialShortAddress;

  return withPostCodeRemoved.trim();
};

// Format area size to 2 decimal places
export const formatAreaSize = (size: any) => {
  return size.toFixed(2);
};

// Format area types for display
export const formatAreaTypes = (types: any) => {
  if (!types || types.length === 0) return "None";

  return types
    .map((type: any) =>
      type
        .split("-")
        .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ")
    )
    .join(", ");
};
