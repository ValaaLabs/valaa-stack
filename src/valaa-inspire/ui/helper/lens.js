// @flow
import { asyncConnectToPartitionsIfMissingAndRetry }
    from "~/valaa-core/tools/denormalized/partitions";
import VALEK from "~/valaa-engine/VALEK";

import Vrapper from "~/valaa-engine/Vrapper";

import wrapError from "~/valaa-tools/wrapError";

export const getLensByName = asyncConnectToPartitionsIfMissingAndRetry(
    // eslint-disable-next-line
    function getLensByName (focus: ?any, lensProperty?: string | string[]): ?Object {
      if (!lensProperty || !(focus instanceof Vrapper)
          || (focus.isActive() && !focus.hasInterface("Scope"))) {
        return undefined;
      }
      const propertyNames = Array.isArray(lensProperty) ? lensProperty : [lensProperty];
      try {
        for (const name of propertyNames) {
          const vProperty = focus.get(VALEK.property(name));
          if (vProperty) {
            return vProperty.get(VALEK.toValueTarget({ optional: true })
                .or(VALEK.toValueLiteral({ optional: true })));
          }
        }
        if (!focus.hasInterface("Relation")) return undefined;
        const target = focus.get("target");
        if (!target || !target.isActive()) return undefined;
        for (const name of propertyNames) {
          const vProperty = target.get(VALEK.property(name));
          if (vProperty) {
            return vProperty.get(VALEK.toValueTarget({ optional: true })
                .or(VALEK.toValueLiteral({ optional: true })));
          }
        }
        return undefined;
      } catch (error) {
        throw wrapError(error, `During getLensByName(), with:`,
            "\n\tfocus", focus,
            "\n\tlens property names", propertyNames);
      }
    }
);
