// @flow

Object.defineProperty(exports, "__esModule", { value: true });

exports.default = function isPromise (promiseCandidate: any) {
  return (typeof promiseCandidate === "object")
      && (promiseCandidate !== null)
      && (typeof promiseCandidate.then !== "undefined")
      && (Promise.resolve(promiseCandidate) === promiseCandidate);
};
