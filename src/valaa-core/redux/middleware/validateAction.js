import wrapError, { dumpObject } from "~/valaa-tools/wrapError";

export default function createValidateActionMiddleware (validators) {
  function validateAction (action) {
    try {
      if (!action.type) throw new Error(`Action has no type`);
      const validator = validators[action.type];
      if (!validator) {
        throw new Error(`INTERNAL ERROR: validator missing for type ${action.type}`);
      }
      const validatedAction = validator(action, validateAction);
      if (!validatedAction || (typeof validatedAction !== "object")) {
        throw new Error(`Validator for ${action.type} returned a non-object`);
      }
      return validatedAction;
    } catch (error) {
      throw wrapError(error, `During validateAction, with:`,
          "\n\taction:", ...dumpObject(action));
    }
  }
  return (/* store */) => next => (action, ...rest: any[]) => next(validateAction(action), ...rest);
}
