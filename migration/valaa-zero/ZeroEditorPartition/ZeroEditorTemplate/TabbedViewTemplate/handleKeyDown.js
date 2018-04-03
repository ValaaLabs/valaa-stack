(event) => {
  const log = this.createLogger("handleKeyDown");
  log(0, ["(", event, ")"]);

  const keyboardEvent = event.nativeEvent;
  log(1, ["key code is is", keyboardEvent.code]);
  log(1, ["shift pressed?", keyboardEvent.shiftKey]);
  log(1, ["alt pressed?  ", keyboardEvent.shiftKey]);

  // Tab cycling
  if (keyboardEvent.code === "KeyT" && keyboardEvent.altKey) {
    event.stopPropagation();
    if (keyboardEvent.shiftKey) {
      log(1, ["Switch to previous tab"]);
      this.focusTabByIndex(this.tabIndex - 1);
    } else {
      log(1, ["Switch to next tab"]);
      this.focusTabByIndex(this.tabIndex + 1);
    }
  }

  // Direct tab selection
  if (keyboardEvent.code.indexOf("Digit") === 0) {
    const digit = Number(keyboardEvent.code.slice("Digit".length));
    if (digit && keyboardEvent.altKey && keyboardEvent.shiftKey) {
      event.stopPropagation();
      log(1, ["Switch to tab", digit - 1]);
      this.focusTabByIndex(digit - 1);
    }
  }

  log(1, ["Done"]);
};