<div>
  <ForEach
      {...kuery(VALK.relations("Container"))}
      rootProps={{ className: VS`VSS(head.stylesheet, "row")` }}
      locals={{ stylesheet: VS`head.stylesheet` }}>
    <div className={VS`VSS(stylesheet, "column padded")`}>
      <pre>{VS`head[Valaa.name]`} ID: {VS`head[Resource.rawId]`}</pre>
      <pre>----------------------------------------</pre>
      <pre>{VS`head[Relation.target][Valaa.name]`} ID: {VS`head[Relation.target][Resource.rawId]`}</pre>
      <pre>* Relations length: {VS`head[Relation.target][Relatable.getRelations]("Item").length`}</pre>
      <pre>* Unnamed ownlings: {VS`head[Relation.target][Resource.unnamedOwnlings].length`}</pre>
      <pre>* Latest Item ID:   {VS`head[Relation.target].latestItem && head[Relation.target].latestItem[Resource.rawId]`}</pre>
    </div>
  </ForEach>
</div>