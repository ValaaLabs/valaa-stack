(signal, listener, slot) => {
  const log = this.createLogger("registerListener");
  const info = this.createLogger("registerListener", console.info);
  const error = this.createLogger("registerListener", console.error);
  log(0, [
    "({\n\tsignal:  ", signal,
    "\n\tlistener:", listener,
    "\n\tslot:  ", slot,
    "\n})"]);

  // Check whether the signal exists at all
  if (signal === undefined) {
    error(1, ["Attempted to listen to an undefined value as a signal"]);
    return;
  }

  // Check whether signal is actually a signal
  if (typeof(signal) !== "string" || signal.indexOf("SIGNAL ") !== 0) {
    error(1, ["Attempted to listen to a non-signal value"]);
    return;
  }

  // HACK: Block slots from being functions for the moment
  if (typeof(slot) === "function") {
    error(1, ["Registering a slot by the function directly is not currently supported.",
      "Use its name instead for now"]);
    return;
  }

  // Checks whether our listener actually contains the given slot
  if (!listener[slot]) {
    error(1, ["Slot", slot, "does not exist in", listener[Valaa.name]])
    return;
  }

  // Checks whether the signal is already connected to that (listener, slot) pair
  // TODO, filter the relation.signal & relation.listener with getRelationsOf
  const all_listener_relations = this[Relation.getRelations]("Listener");
  log(1, ["all_listener_relations is", all_listener_relations]);
  for (let r = 0; r < all_listener_relations.length; r++) {
    const relation = all_listener_relations[r];
    log(1, ["checking listener", relation, "for signal", relation.signal]);
    if (relation.signal !== signal) {
      log(1, ["Skipping this listener"]);
      continue;
    }
    if (relation[Relation.target] === listener &&
      relation.signal === signal &&
      relation.slot === slot
    ) {
      info(1, ["Signal", signal, "already connected to <", listener[Valaa.name], "-", slot, ">"]);
      return;
    }
  }
  log(1, ["Passed all checks"]);
  
  // Create the new listener relation
  const newListenerRelation = new Valaa.Relation({
    name: "Listener",
    target: listener,
    owner: this,
    properties: {
      signal: signal,
      slot: slot,
    },
  });
  log(1, "newListenerRelation is", newListenerRelation);

  log(1, ["Done"]);
};