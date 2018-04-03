<div
    tabIndex="0"
    className={VS`VSS(head.stylesheet, "root")`}
    onKeyDown={VS`head.handleKeyDown`}>
  <ForEach
      {...kuery(VALK.relations("Valaa_Tab"))}
      rootProps={{ className: VS`VSS(head.stylesheet, "tab-navigation")` }}
      locals={{ tabbedView: VS`head`, stylesheet: VS`head.stylesheet` }}>
    <If test={VS`head && head === tabbedView.activeTab`}>
      <div className={VS`VSS(stylesheet, "tab-active")`}>
        <i className={VS`VSS(stylesheet, "icon-folder")`}></i>
        {VALK.to("target").to("name")}
        <i className={VS`VSS(stylesheet, "icon-close")`}
        onClick={VS`tabbedView.closeTabGenerator(head)`}></i>
      </div>
    </If>
    <If test={VS`head && head !== tabbedView.activeTab`}>
      <div
          className={VS`VSS(stylesheet, "tab-regular")`}
          onClick={VS`tabbedView.focusTabGenerator(head)`}>
        <i className={VS`VSS(stylesheet, "icon-folder")`}></i>
        {VALK.to("target").to("name")}
        <i className={VS`VSS(stylesheet, "icon-close")`}
        onClick={VS`tabbedView.closeTabGenerator(head)`}></i>
      </div>
    </If>
  </ForEach>
  <div className={VS`VSS(head.stylesheet, "active-tab-wrapper")`}>
    <If test={VALK.propertyValue("activeTab").isTruthy()}>


{/* THIS USED TO BE A SEPARATE LENS OWNED BY A TabTemplate */}

<div className={VS`VSS(head.stylesheet, "tab-body")`}>
  <div className={VS`VSS(head.stylesheet, "lens-selector")`}>
    <div style={{ fontWeight: "bold"}}>Active lens:</div>
    <select
        className={VS`VSS(head.stylesheet, "lens-selector-dropdown")`}
        onChange={VS`head.selectTabLensGenerator(head.activeTab)`}
        defaultValue={
          VS`head.activeTab.builtinLens
          ? "VALAA Builtin - " + head.activeTab.builtinLens
          : head.activeTab.customLens`
        }>
      <If test={VALK.propertyValue("activeTab").to("target").hasInterface("Media").isFalsy()}>
        <optgroup label="Built-in views">
          <option label="Properties Panel" value="VALAA Builtin - Properties Panel" />
          <option label="Component View (disabled)" value="VALAA Builtin - Component View" />
        </optgroup>
      </If>
      <If test={VALK.propertyValue("activeTab").to("target").hasInterface("Media")}>
        <optgroup label="Built-in views">
          <option label="Properties Panel" value="VALAA Builtin - Properties Panel" />
          <option label="Text Editor" value="VALAA Builtin - Text Editor" />
        </optgroup>
      </If>
      <ForEach
          {...kuery(VALK.propertyValue("activeTab").to("target").to("properties"))}
          RootElement="optgroup"
          rootProps={{ label: "Custom lenses" }}
          locals={{ customLens: get(VALK.propertyValue("activeTab").propertyValue("customLens")) }}>
        <If
            test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").nullable().isTruthy()}
            locals={{ lensName: get(VALK.to("name")) }}>
          <option label={VS`lensName`} value={VS`lensName`} />
        </If>
      </ForEach>
    </select>
  </div>
  <If test={VALK.propertyValue("activeTab").propertyValue("builtinLens").isTruthy()}>
    <div className={VS`VSS(head.stylesheet, "tab-content")`}>
      <If test={VALK.propertyValue("activeTab").propertyValue("builtinLens").nullable().equalTo("Properties Panel")}>
        <ValaaNode {...kuery(VALK.propertyValue("activeTab").to("target"))} fixedUI={<PropertiesPanel />} />
      </If>
      <If test={VALK.propertyValue("activeTab").propertyValue("builtinLens").nullable().equalTo("Component View")}>
        <pre>The Component view is currently disabled</pre>
      </If>
      <If test={VALK.propertyValue("activeTab").propertyValue("builtinLens").nullable().equalTo("Text Editor")}>
        <div style={{ width: "100%", height: "300px" }}>
        <TextFileEditor {...kuery(VALK.propertyValue("activeTab").to("target"))} />
        </div>
      </If>
    </div>
  </If>
  <If test={VALK.propertyValue("activeTab").propertyValue("builtinLens").isFalsy()}>
    <ValaaNode {...kuery(VALK.propertyValue("activeTab").to("target"))} lensName={VALK.propertyValue("activeTab").propertyValue("customLens")} />
  </If>
</div>

{/* THIS the end of that separate lens described above */}

    </If>
    <If test={VALK.propertyValue("activeTab").isFalsy()}>
      <div className={VS`VSS(head.stylesheet, "tab-none-active")`}>
        No active tab
      </div>
    </If>
  </div>
</div>
