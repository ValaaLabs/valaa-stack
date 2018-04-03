<div className={VS`VSS(head.documentationStylesheet, "root")`}>
    <div className={VS`VSS(head.documentationStylesheet, "title")`}>
        Documentation for {VALK.to("name")}
    </div>
    <div className={VS`VSS(head.documentationStylesheet, "documentationParagraph")`}>
        The TabbedView manages a tabbed view to relations. The active tab content area introspects the target for pointer medias and attempts to provide them as alternative lenses.
    </div>

  {/****************************** API ***********************************/}

    <div className={VS`VSS(head.documentationStylesheet, "sectionHeader")`}>
        Publisher interface:
    </div>


    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            registerListener(pointerToSignal, pointerToSlot)
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Register the given slot (and its owner) as a listener to the given signal.
        </div>
    </div>

  {/****************************** SLOTS ***********************************/}

    <div className={VS`VSS(head.documentationStylesheet, "sectionHeader")`}>
        Slots:
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            closeTab({ item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Closes the tab for the item. If the tab was the focused one, attempt to focus a different one.
        </div>
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            focusTab({ item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Focuses the tab for the item, if it exists.
        </div>
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            openTab({ item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Creates a new tab for the item if none yet exists. Focuses the tab for the item to focus. Will not open duplicate tabs.
        </div>
    </div>

  {/****************************** SIGNALS ***********************************/}

    <div className={VS`VSS(head.documentationStylesheet, "sectionHeader")`}>
        Signals:
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            tabClosed({ tab, item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Emitted when the item's tab is about to be closed.
        </div>
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            tabFocused({ tab, item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Emitted when the tab's focus has changed to a different item.
        </div>
    </div>

    <div className={VS`VSS(head.documentationStylesheet, "apiFunctionEntry")`}>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionHeader")`}>
            tabOpened({ tab, item })
        </div>
        <div className={VS`VSS(head.documentationStylesheet, "apiFunctionDescription")`}>
            Emitted when a new tab has been created.
        </div>
    </div>

  {/****************************** SOURCE ***********************************/}

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
                <pre className={VS`VSS(documentationStylesheet, "code")`}>
                    {VALK.to("value").to("reference").mediaContent()}
                </pre>
            </div>
        </If>
    </ForEach>
</div>

