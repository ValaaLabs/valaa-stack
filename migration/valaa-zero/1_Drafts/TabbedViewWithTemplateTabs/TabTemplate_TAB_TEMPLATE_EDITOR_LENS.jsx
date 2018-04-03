<div className={VS`VSS(head.stylesheet, "tabContent column")`}>
    <pre>
        builtinLens: {VS`head.builtinLens`}
    </pre>
    <pre>
        customLens: {VS`head.customLens`}
    </pre>
    <div className={VS`VSS(head.stylesheet, "tabLensSelector")`}>
        <div style={{ fontWeight: "bold"}}>Active lens:</div>
        <select onChange={VS`head.selectLens`}>
            <If test={VALK.to("target").hasInterface("Media").isFalsy()}>
                <optgroup label="Built-in views">
                    <option
                        label="Properties Panel"
                        value="VALAA Builtin - Properties Panel"
                        selected={VALK.propertyValue("builtinLens").equalTo("Properties Panel")}
                    />
                    <option
                        label="Component View (disabled)"
                        value="VALAA Builtin - Component View"
                        selected={VALK.propertyValue("builtinLens").equalTo("Component View")}
                    />
                </optgroup>
            </If>
            <If test={VALK.to("target").hasInterface("Media")}>
                <optgroup label="Built-in views">
                    <option
                        label="Properties Panel"
                        value="VALAA Builtin - Properties Panel"
                        selected={VALK.propertyValue("builtinLens").equalTo("Properties Panel")}
                    />
                    <option
                        label="Text Editor"
                        value="VALAA Builtin - Text Editor"
                        selected={VALK.propertyValue("builtinLens").equalTo("Text Editor")}
                    />
                </optgroup>
            </If>
            <ForEach
                {...kuery(VALK.to("target").to("properties"))}
                RootElement="optgroup"
                rootProps={{ label: "Custom lenses", }}
                locals={{ customLens: get(VALK.propertyValue("customLens")) }}
            >
                <If
                    test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").nullable().isTruthy()}
                    locals={{ lensName: get(VALK.to("name")) }}
                >
                    <option
                        label={VALK.to("name")}
                        value={VALK.to("name")}
                        selected={VALK.to("name").equalTo(VS`customLens`)}
                    />
                </If>
            </ForEach>
        </select>
    </div>
    <If test={VALK.propertyValue("builtinLens").isTruthy()}>
        <div className={VS`VSS(head.stylesheet, "tabContent row")`}>
            <If test={VALK.propertyValue("builtinLens").nullable().equalTo("Properties Panel")}>
                <ValaaNode {...kuery(VALK.to("target"))} fixedUI={<PropertiesPanel />} />
            </If>
            <If test={VALK.propertyValue("builtinLens").nullable().equalTo("Component View")}>
                <pre>The Component view is currently disabled</pre>
            </If>
            <If test={VALK.propertyValue("builtinLens").nullable().equalTo("Text Editor")}>
                <div className={VS`VSS(head.stylesheet, "tabContent row")`}>
                    <TextFileEditor {...kuery(VALK.to("target"))} />
                </div>
            </If>
        </div>
    </If>
    <If test={VALK.propertyValue("builtinLens").isFalsy()}>
        <ValaaNode {...kuery(VALK.to("target"))} lensName={VALK.propertyValue("customLens")} />
    </If>
</div>
