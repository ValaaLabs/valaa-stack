export function encodeDataURI (unicodeString: string, type:
    string = "text", subtype: string = "plain") {
  return `data:${type}/${subtype};charset=UTF-8;base64,${base64FromUnicode(content)}`;
}

export function base64FromUnicode (unicodeString: string) {
  return btoa(encodeURIComponent(unicodeString).replace(/%([0-9A-F]{2})/g,
    (match: any, p1: any) => String.fromCharCode(parseInt(p1, 16))
  ));
}

export function unicodeFromBase64 (base64String: string) {
  return decodeURIComponent(atob(base64String).split("").map(
    (c) => `%${`${"00"}${c.charCodeAt(0).toString(16)}`.slice(-2)}`
  ).join(""));
}
