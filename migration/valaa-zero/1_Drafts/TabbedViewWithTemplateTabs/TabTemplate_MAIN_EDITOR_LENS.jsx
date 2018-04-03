<div className={VS`VSS(head.stylesheet, "root")`}>
    <button onClick={VS`this.addDemoTab`}>
        Add demo tab
    </button>
    <ForEach
        {...kuery(VALK.relations("Valaa_Tab"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "tabSelectionArea")` }}
        locals={{ tabbedView: VS`head`, stylesheet: VS`head.stylesheet` }}
    >
        <If test={VS`head === tabbedView.activeTab`}>
            <button className={VS`VSS(stylesheet, "tabSelector activeTab")`}>
                {VALK.to("target").to("name")}
                <button onClick={VS`tabbedView.closeTabGenerator(head)`}>x</button>
            </button>
        </If>
        <If test={VS`head !== tabbedView.activeTab`}>
            <button
                className={VS`VSS(stylesheet, "tabSelector")`}
                onClick={VS`tabbedView.selectTabGenerator(head)`}
            >
                {VALK.to("target").to("name")}
                <button onClick={VS`tabbedView.closeTabGenerator(head)`}>x</button>
            </button>
        </If>
    </ForEach>
    <div className={VS`VSS(head.stylesheet, "activeTabContent column")`}>
        <If test={VALK.propertyValue("activeTab").nullable().isTruthy()}>
            <ValaaNode {...kuery(VALK.propertyValue("activeTab"))} />
        </If>
        <If test={VALK.propertyValue("activeTab").nullable().isFalsy()}>
            <div className={VS`VSS(head.stylesheet, "missingActiveTab")`}>
                No active tab
            </div>
        </If>
    </div>
</div>
