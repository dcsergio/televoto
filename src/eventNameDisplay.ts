interface SplitEventNameOptions {
  delimiter?: string;
}

export const EVENT_NAME_SEPARATOR = "//";
const LEGACY_EVENT_NAME_SEPARATOR = "***";

export interface SplitEventNameResult {
  prefix: string;
  emphasized: string;
}

export function splitEventNameForDisplay(
  eventName: string,
  options?: SplitEventNameOptions,
): SplitEventNameResult {
  const trimmedName = eventName.trim();
  if (!trimmedName) {
    return {
      prefix: "",
      emphasized: "",
    };
  }

  const delimiter = options?.delimiter ?? EVENT_NAME_SEPARATOR;
    const escapedDelimiter = delimiter.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const splitRegex = new RegExp(String.raw`\s*${escapedDelimiter}\s*`);

  let source = trimmedName;
  if (!trimmedName.includes(delimiter) && trimmedName.includes(LEGACY_EVENT_NAME_SEPARATOR)) {
    source = trimmedName.replaceAll(LEGACY_EVENT_NAME_SEPARATOR, delimiter);
  }

  const parts = source
    .split(splitRegex)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      prefix: "",
      emphasized: trimmedName,
    };
  }

  const emphasized = parts.pop() ?? "";

  return {
    prefix: parts.join(" "),
    emphasized,
  };
}