import { Map } from "immutable";

import { CREATED, DESTROYED, MODIFIED, FIELDS_SET, ADDED_TO, REMOVED_FROM, REPLACED_WITHIN, SPLICED,
    DUPLICATED, FROZEN, RECOMBINED, TIMED, TRANSACTED } from "~/valaa-core/command";
import create from "~/valaa-core/redux/reducers/create";
import duplicate from "~/valaa-core/redux/reducers/duplicate";
import destroy from "~/valaa-core/redux/reducers/destroy";
import modify from "~/valaa-core/redux/reducers/modify";
import freeze from "~/valaa-core/redux/reducers/freeze";
import recombine from "~/valaa-core/redux/reducers/recombine";
import transact from "~/valaa-core/redux/reducers/transact";
import { createBardReducer } from "~/valaa-core/redux/Bard";

const EMPTY_MAP = Map();

export default function createValaaCoreReducers () {
  return {
    [CREATED]: createBardReducer(create),
    [DESTROYED]: createBardReducer(destroy, { skipPostPassageStateUpdate: true }),
    [DUPLICATED]: createBardReducer(duplicate),
    [MODIFIED]: createBardReducer(modify),
    [FIELDS_SET]: createBardReducer(modify),
    [ADDED_TO]: createBardReducer(modify),
    [REMOVED_FROM]: createBardReducer(modify),
    [REPLACED_WITHIN]: createBardReducer(modify),
    [SPLICED]: createBardReducer(modify),
    [FROZEN]: createBardReducer(freeze),
    [RECOMBINED]: createBardReducer(recombine, { skipPostPassageStateUpdate: true }),
    [TRANSACTED]: createBardReducer(transact),
    // TIMED events will be expanded to actions and resulting events/sub-events by appropriate
    // FalseProphet engines and cogs
    [TIMED]: (state = EMPTY_MAP) => state,
    // TODO(iridian): This might not be a correct place for this. What is, though?
    ["@@redux/INIT"]: state => state,//eslint-disable-line
  };
}
