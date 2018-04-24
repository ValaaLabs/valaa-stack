export default function createProcessCommandVersionMiddleware (version) {
  // Naive versioning which accepts versions given in or uses the supplied version as default
  return (/* store */) => next => (command, ...rest: any[]) => {
    if (!command.hasOwnProperty("version")) command.version = version;
    return next(command, ...rest);
  };
}
