// @flow

export default function addExportsContainerToScope (scope: Object, exports: Object = {}) {
  scope.exports = exports;
  Object.defineProperty(exports, "__esModule", { value: true });
  return exports;
}
