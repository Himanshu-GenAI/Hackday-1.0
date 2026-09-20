export function extractUrls(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s)"']+/gi) ?? [])];
}

export function extractUpiHandles(text: string): string[] {
  return [
    ...new Set(
      text.match(
        /\b[\w.-]+@(upi|ybl|oksbi|okaxis|paytm|ibl|axl|okhdfcbank|icici)\b/gi
      ) ?? []
    ),
  ];
}

export function extractAmounts(text: string): string[] {
  return [
    ...new Set(
      text.match(
        /(₹\s?\d[\d,]*(\.\d{1,2})?)|(rs\.?\s?\d[\d,]*)/gi
      ) ?? []
    ),
  ];
}
