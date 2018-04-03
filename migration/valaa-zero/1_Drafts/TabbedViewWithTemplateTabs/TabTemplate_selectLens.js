(tab) => {
    (data) => {
        const value = data.target.value;
        const builtin = value.split("VALAA Builtin - ")[1];

        if (builtin) {
            tab.builtinLens = builtin;
            tab.customLens = null;
        } else {
            tab.builtinLens = null;
            tab.customLens = value;
        }
    };
};
