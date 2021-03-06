export default function getImplicitMediaInterpretation (candidate: any, opName: string,
    options: any) {
  if (!candidate || (typeof candidate !== "object")
      || typeof candidate.extractValue === "undefined") {
    return candidate;
  }
  if (options && options.deprecated) {
    const candidateName = candidate.get("name", Object.create(options));
    console.error("DEPRECATED: implicit media interpretation when performing", opName, "against",
        `'${candidateName}'`,
        "\n\tprefer: explicit media interpretation");
  }
  const actualOptions = options || {};
  if (!actualOptions.hasOwnProperty("immediate")) actualOptions.immediate = true;
  return candidate.extractValue(actualOptions);
}
