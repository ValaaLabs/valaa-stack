<If
    test={1}
    locals={{
      documentation: VS`head`,
      target: VS`head[Relation.target]`
    }}>
  <div className={VS`VSS(documentation.stylesheet, "root")`}>
    {/* TODO: add quick navigation sidebar */}

    <div className={VS`VSS(documentation.stylesheet, "body")`}>
      <div className={VS`VSS(documentation.stylesheet, "header")`}>
        {VS`target[Valaa.name]`}
      </div>

      <div className={VS`VSS(documentation.stylesheet, "summary")`}>
        {VS`documentation.main.summary`}

      </div>
      <div className={VS`VSS(documentation.stylesheet, "description")`}>
        {VS`documentation.main.longDescription`}
      </div>

      <ForEach
          kuery={VS`documentation[Relatable.getRelations]("Valaa_Documentation_Section")`}
          rootProps={{ className: VS`VSS(documentation.stylesheet, "sections")` }}>
        <div className={VS`VSS(documentation.stylesheet, "section")`}>
          <div className={VS`VSS(documentation.stylesheet, "section-header")`}>
            {VS`head.name`}
          </div>
          <ForEach
              kuery={VS`head.entries[Resource.unnamedOwnlings]`}
              rootProps={{ className: VS`VSS(documentation.stylesheet, "section-entries")` }}>
            <div className={VS`VSS(documentation.stylesheet, "section-entry")`}>
              {/* Place navigation anchor (Javascript or HTML) here */}
              <div className={VS`VSS(documentation.stylesheet, "section-entry-header")`}>
                {VALK.to("name")}
              </div>
              <div className={VS`VSS(documentation.stylesheet, "section-entry-body")`}>
                <If test={VS`head.summary !== undefined`}>
                  <div className={VS`VSS(documentation.stylesheet, "section-entry-summary")`}>
                    {VS`head.summary`}
                  </div>
                </If>
                <If test={VS`head.longDescription !== undefined`}>
                  <div className={VS`VSS(documentation.stylesheet, "section-entry-long")`}>
                    {VS`head.longDescription`}
                  </div>
                </If>
                <If test={VS`head.example !== undefined`}>
                  <div className={VS`VSS(documentation.stylesheet, "section-entry-example")`}>
                    {VS`head.example`}
                  </div>
                </If>
                <If test={VS`head.exampleClarification !== undefined`}>
                  <div className={VS`VSS(documentation.stylesheet, "section-entry-clarification")`}>
                    {VS`head.exampleClarification`}
                  </div>
                </If>
              </div>
            </div>
          </ForEach>
        </div>
      </ForEach>
    </div>
  </div>
</If>
