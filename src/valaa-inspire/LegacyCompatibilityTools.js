// This is obsolete, but not removing quite yet.

export function convertLegacyCommandInPlace (event: Object) {
  if (event.resourceType) {
    event.typeName = event.resourceType;
    delete event.resourceType;
  }
  if (event.owner) {
    (event.initialState || (event.initialState = {})).owner =
        [event.owner.id, event.owner.property];
    delete event.owner;
  }
  if (event.type === "TRANSACTED") {
    if (event.id && !event.commandId) {
      event.commandId = event.id;
      delete event.id;
    }
  }
  if (event.actions) event.actions.forEach(convertLegacyCommandInPlace);
  if (event.typeName === "MediaType") {
    if (event.initialState) {
      delete event.initialState.text;
    }
  } else if (["Image", "Audio", "GenericMedia"].indexOf(event.typeName) !== -1) {
    event.typeName = "Media";
    ["initialState", "sets", "adds", "removes", "splices"].forEach(opName => {
      if (event[opName]) {
        delete event[opName].imageFormat;
        delete event[opName].audioFormat;
        delete event[opName].start;
        delete event[opName].duration;
        delete event[opName].origin;
        delete event[opName].dimensions;
        delete event[opName].sourceUrl;
        if (event[opName].content) {
          event[opName].sourceURL = `valaa-legacy:?blobId=${event[opName].content}`;
          delete event[opName].content;
        }
      }
    });
  }
  ["initialState", "sets", "adds", "removes", "splices"].forEach(opName => {
    const block = event[opName];
    if (!block) return;
    if (block.value && block.value.resourceType) {
      block.value.typeName = block.value.resourceType;
      delete block.value.resourceType;
    }
    ["contentHash", "tagURI", "expressionText", "literal", "text"].forEach(generated => {
      if (block.hasOwnProperty(generated) && !block[generated]) delete block[generated];
    });
  });
}
