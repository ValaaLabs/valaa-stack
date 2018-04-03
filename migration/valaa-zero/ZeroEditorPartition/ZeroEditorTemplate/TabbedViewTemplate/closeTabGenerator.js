(tab) => {
    const log = this.createLogger("closeTabGenerator");
    const error = this.createLogger("closeTabGenerator", console.error);
    log(0, ["(\n\t", tab, "\n)"]);

    if (!tab) {
        error(1, ["the tab does not exist, returning a no-op"]);
        return () => {};
    }
    return () => {
        const item = tab[Relation.target];
        log(1, ["item is", item]);
        this.closeTab({ item: tab[Relation.target] });
    };
};
