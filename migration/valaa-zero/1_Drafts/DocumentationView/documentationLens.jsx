<div className={VS`VSS(head.documentationStylesheet, "root")`}>
    <div className={VS`VSS(head.documentationStylesheet, "title")`}>
        Documentation for {VALK.to("name")}
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "documentationParagraph")`}>
        This is a paragraph in the widget documentation
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "documentationParagraph")`}>
        This is another paragraph in the widget documentation
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "sectionHeader")`}>
        API calls:
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            launchMissile(target, nuclear_key_code)
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Requests a missile launch towards the target, providing an authentication key to be verified by the headquarters
        </div>
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "sectionHeader")`}>
        Source code for scripts
    </div>
    <ForEach
        {...kuery(VALK.to("properties"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "scriptList")` }}
        locals={{
            documentationStylesheet: VS`head.documentationStylesheet`,
            scripter: VS`head`,
        }}
    >
        <If test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").nullable().isTruthy()}>
            <div className={VS`VSS(documentationStylesheet, "listEntry")`}>
                <div className={VS`VSS(documentationStylesheet, "entryHeader")`}>
                    {VALK.to("name")}
                </div>
                <pre className={VS`VSS(documentationStylesheet, "entrySource")`}>
                    {VALK.to("value").to("reference").mediaContent()}
                </pre>
            </div>
        </If>
    </ForEach>
</div>

