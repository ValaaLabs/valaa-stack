<ForEach
    kuery={VALK.relations("entry")}
    rootProps={{ className: VS`VSS(head.stylesheet, "column")` }}
    locals={{ stylesheet: VS`head.stylesheet` }}>
  <div className={VS`VSS(stylesheet, "entry")`}>
    <pre>Entry: {VS`head[Relation.target][Valaa.name]`}</pre>
    <If test={VALK.to("target").hasInterface("Entity")}>
      <div>
        <pre>Is Entity</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Entity"):   {VS`String(head[Relation.target][Resource.hasInterface]("Entity"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Relation"): {VS`String(head[Relation.target][Resource.hasInterface]("Relation"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Media"):    {VS`String(head[Relation.target][Resource.hasInterface]("Media"))`}</pre>
        </div>
    </If>
    <If test={VALK.to("target").hasInterface("Relation")}>
    <div>
        <pre>Is Relation</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Entity"):   {VS`String(head[Relation.target][Resource.hasInterface]("Entity"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Relation"): {VS`String(head[Relation.target][Resource.hasInterface]("Relation"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Media"):    {VS`String(head[Relation.target][Resource.hasInterface]("Media"))`}</pre>
      </div>
    </If>
    <If test={VALK.to("target").hasInterface("Media")}>
    <div>
        <pre>Is Media</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Entity"):   {VS`String(head[Relation.target][Resource.hasInterface]("Entity"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Relation"): {VS`String(head[Relation.target][Resource.hasInterface]("Relation"))`}</pre>
        <pre>head[Relation.target][Resource.hasInterface]("Media"):    {VS`String(head[Relation.target][Resource.hasInterface]("Media"))`}</pre>
      </div>
    </If>
  </div>
</ForEach>