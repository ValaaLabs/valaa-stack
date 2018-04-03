(resource) => {
    const log = this.createLogger("removeResourceFactory");
    log(0, ["(\n\t", resource, "\n)"]);
    return () => {
        const log = this.createLogger("removeResource");
        log(0, ["(\n\t", resource, "\n)"]);
        Valaa.Resource.destroy(resource);
    };
};
