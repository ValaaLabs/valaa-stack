(signal, data) => {
  const log = this.createLogger("emitSignal");
  log(0, ["({\n\tsignal:", signal, "\n\tdata:", data, "\n})"]);

  const all_listener_relations = this[Relation.getRelations]("Listener");
  log(1, ["all_listener_relations is", all_listener_relations]);
  for (let r = 0; r < all_listener_relations.length; r++) {
    const relation = all_listener_relations[r];
    log(1, ["checking listener", relation, "for signal", relation.signal]);
    if (relation.signal !== signal) {
      log(1, ["Skipping this listener"]);
      continue;
    }

    const listener = relation[Relation.target];
    log(1, ["listener is", listener]);

    log(1, ["signaling <", listener[Valaa.name], "-", relation.slot, ">"]);
    listener[relation.slot](data);
  }

  log(1, ["Done"]);
};