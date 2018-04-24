// @flow
import isMatchWith from "lodash/isMatchWith";
import GraphQLObjectType from "graphql/type";

import MediaTypeData from "~/tools/MediaTypeData";
import ImportBoard from "~/core/tools/graphql/ImportBoard";
import ImportError from "~/core/tools/graphql/ImportError";
import wrapError from "~/tools/wrapError";

/**
 * The Content Resolver API.
 * Resolver parameter for a particular content entry is an object with following (optional) fields:
 * Resolvable {
 *   name: string
 *   mediaType: { type: string, subtype: string }
 *   async getContent: { (): Resolvable }
 *   async getFiles: { (): { string: Resolvable, ... } }
 * }
 */

export function objectTypeRecognizers (objectType: GraphQLObjectType) {
  return typeof objectType._typeConfig.recognizers !== "function"
      ? objectType._typeConfig.recognizers
      : objectType._typeConfig.recognizers();
}

export async function recognize (recognizer: any, importBoard: Object,
    mediaTypeKey: ?string = null) {
  const errors = [];
  try {
    if (typeof recognizer === "function") {
      return await recognize(await recognizer(importBoard), importBoard);
    }
    if (!recognizer || typeof recognizer !== "object") return recognizer;
    if (Array.isArray(recognizer)) {
      for (const rule of recognizer) {
        try {
          const key = await recognize(rule, importBoard);
          if (key) return key;
        } catch (error) {
          errors.push(error);
        }
      }
    } else if (mediaTypeKey) {
      const recognizerKey = importBoard.mediaType[mediaTypeKey];
      const subRecognizer = recognizerKey && recognizer[recognizerKey];
      console.log("recognize.mediaTypeKey", mediaTypeKey, recognizerKey, "->", subRecognizer);
      return subRecognizer && await recognize(
          subRecognizer, importBoard, mediaTypeKey === "type" ? "subtype" : null);
    }
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new ImportError(`No recognizer found for file ${importBoard.name} in list of ${
          recognizer.length} rules.`);
    }
    return false;
  } catch (error) {
    throw wrapError(error, `During recognize(`, recognizer, importBoard, mediaTypeKey, `):`,
        `\n\taccumulated errors:`, errors.map(innerError => innerError.message));
  }
}

function customizer (candidate, matcher) {
  return typeof matcher === "function"
      ? matcher(candidate)
      : matcher;
}

export function jsonRecognizer (matcher: any, resultOnRecognize: any,
    { validate }: { validate?: ?boolean } = {}) {
  return async function _jsonRecognizer ({ name, getContent, mediaType }:
      { name: string, getContent: Function, mediaType: MediaTypeData }) {
    let content = getContent && await getContent();
    if (typeof content === "string") {
      if (mediaType.text === "text/plain") {
        throw new ImportError(`Got string with mime other than text/plain (${
            mediaType.text}) when parsing JSON file ${name}. Only parsing text/plain as JSON.`);
      }
      content = JSON.parse(content);
    }
    if (!content) {
      if (validate) throw new ImportError(`No content when trying to recognize JSON file ${name}`);
      return false;
    }
    if (typeof content !== "object") {
      throw new ImportError(`Expected JSON when recognizing file ${name}`);
    }
    const match = isMatchWith(content, matcher, customizer);
    if (!match) {
      if (validate) {
        throw new ImportError(`Unrecognized JSON contents for file ${name}, looking for ${
          JSON.stringify(matcher)}`);
      }
      return false;
    }
    mediaType.type = "application";
    mediaType.subtype = "json";
    mediaType.fullType = "application/json";
    return resultOnRecognize;
  };
}

export function csvRecognizer (matchFieldName: string, resultOnRecognize: any,
    { validate }: { validate?: ?boolean } = {}) {
  return async function _csvRecognizer ({ name, getContent }:
      { name: string, getContent: Function }) {
    const content = getContent && await getContent();
    if (content && !Array.isArray(content)) {
      throw new ImportError(`INTERNAL ERROR: CSV recognizer expects an array for file ${
          name}, instead got:>>>${JSON.stringify(content)}<<<`);
    }
    if (!content || !content.length) {
      if (validate) throw new ImportError(`No content when trying to recognize CSV file ${name}`);
      return false;
    }
    const match = typeof content[0][matchFieldName] !== "undefined";
    if (!match) {
      if (validate) {
        throw new ImportError(`Unrecognized CSV contents for file ${name}, looking for field ${
          matchFieldName}`);
      }
      return false;
    }
    return resultOnRecognize;
  };
}

/**
 * directoryMatchRules is a map of rules like regex -> recognizer.
 * All rule regexes must must have at least one matching file, and all matching files for each of
 * the rules must be recognized for the nameRecognizer to return resultOnRecognize.
 */
export function nameRecognizer (directoryMatchRules: Object, resultOnRecognize: any,
    { validate }: { validate?: ?boolean } = {}) {
  return async function _nameRecognizer (importBoard: ImportBoard) {
    const files
        = (importBoard.isDirectoryBoard && importBoard.getFiles && await importBoard.getFiles())
        || (importBoard.getContent
            && { [importBoard.name]: { getContent: importBoard.getContent } })
        || {};
    const fileNames = Object.keys(files);
    let matchedPrimaryName;
    for (const regexText of Object.keys(directoryMatchRules)) {
      const ruleRecognizer = directoryMatchRules[regexText];
      let matchCount = 0;
      for (const fileName of fileNames) {
        const match = new RegExp(regexText).exec(fileName);
        if (match) {
          ++matchCount;
          if (!await recognize(ruleRecognizer, {
            ...importBoard,
            name: fileName,
            getContent: files[fileName].getContent.bind(files[fileName]),
          })) {
            return false;
          }
          if (match.length > 1) {
            if (match.length > 2) {
              throw new ImportError(`INTERNAL ERROR: regex '${
                regexText}' has too many capturing groups, only 0-1 expected. ${
                ""}Use non-capturing (?:) groups for other purposes than capturing primary name.`);
            }
            matchedPrimaryName = match[1];
          }
        }
      }
      // All matching
      if (!matchCount) {
        if (validate) throw new ImportError(`No matches found for rule '${regexText}'`);
        return false;
      }
      // If the file match pattern is a capturing regex, use the capture as the primary
      // directory import name
    }
    const result = await recognize(resultOnRecognize, importBoard);
    if (result && matchedPrimaryName) importBoard.name = matchedPrimaryName;
    return result;
  };
}

function createFileExtensionRecognizer (extension, resultOnRecognize, { validate } = {}) {
  return async (importBoard: ImportBoard) => {
    // TODO: see if there is a better way to do this from js
    if (importBoard.name.toLowerCase().endsWith(extension)) {
      return resultOnRecognize;
    }
    if (validate) {
      throw new ImportError(`File '${importBoard.name}' doesn't end with '${extension}'`);
    }
    return false;
  };
}

export function gzipRecognizer (resultOnRecognize: any, options: { validate?: ?boolean } = {}) {
  return createFileExtensionRecognizer(".tar.gz", resultOnRecognize, options);
}

export function zipRecognizer (resultOnRecognize: any, options: { validate?: ?boolean } = {}) {
  return createFileExtensionRecognizer(".zip", resultOnRecognize, options);
}
