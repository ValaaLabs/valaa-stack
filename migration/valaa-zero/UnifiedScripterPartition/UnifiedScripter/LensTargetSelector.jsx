<div className={VS`VSS(head.stylesheet, "target-selector")`}>
  <div className={VS`VSS(head.stylesheet, "target-selector-label")`}>
      Target:
  </div>
  <div className={VS`VSS(head.stylesheet, "target-selector-widget")`}>
    <LinkFieldEditor
        {...kuery(VALK.property("target"))}
        fieldName="value"
        toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])} />
  </div>
</div>