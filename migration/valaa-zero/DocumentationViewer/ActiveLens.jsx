<div className={VS`VSS(head.stylesheet, "root")`}>
  <LinkFieldEditor
      {...kuery(VALK.property("target"))}
      fieldName="value"
      toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])}/>

  <If test={VS`head.target !== null`}>
    <div className={VS`VSS(head.stylesheet, "content")`}>

      {/************************ Missing documentation ************************/}
      <If test={VS`head.target[Relatable.getRelations]("Valaa_Documentation").length === 0`}>
        <div className={VS`VSS(head.stylesheet, "documentation-missing")`}>
          <pre className={VS`VSS(head.stylesheet, "documentation-missing-text")`}>
            The selected target does not have any documentation
          </pre>
        </div>
      </If>
      
      <If test={VS`head.target[Relatable.getRelations]("Valaa_Documentation").length > 0`}
          locals={{ documentation: VS`head.target[Relatable.getRelations]("Valaa_Documentation")[0]` }}>
        <div className={VS`VSS(head.stylesheet, "documentation")`}>

          <div className={VS`VSS(head.stylesheet, "documentation-header")`}>
                {VS`head.target[Valaa.name]`}
          </div>

          {/************************ Main section ************************/}
          <If test={VS`documentation.main.summary`}>
            <div className={VS`VSS(head.stylesheet, "main-documentation-summary")`}>
              <div className={VS`VSS(head.stylesheet, "main-documentation-summary-body")`}>
                {VS`documentation.main.summary`}
              </div>
            </div>
          </If>

          <If test={VS`documentation.main.longDescription`}>
            <div className={VS`VSS(head.stylesheet, "main-documentation-description")`}>
              <div className={VS`VSS(head.stylesheet, "main-documentation-description-header")`}>
                resource description
              </div>

              <div className={VS`VSS(head.stylesheet, "main-documentation-description-body")`}>
                {VS`documentation.main.longDescription`}
              </div>
            </div>
          </If>

          {/************************ Properties ************************/}
          <ForEach
              {...kuery(VALK.propertyValue("target").to("properties"))}
              rootProps={{ className: VS`VSS(head.stylesheet, "property-list")` }}
              locals={{
                stylesheet: VS`head.stylesheet`,
                documenter: VS`head`,
                target: VS`head.target`,
              }}>

            {/* Let's make the property name available from here onwards to reduce silliness */}
            <If test={VALK.to("value").isTruthy()} locals={{ propertyName: VALK.to("name") }}>
              <If test={VS`documentation.properties[propertyName]`}>
                <div className={VS`VSS(stylesheet, "list-entry")`}>

                  <div className={VS`VSS(stylesheet, "entry-header")`}>
                    Property:<div className={VS`VSS(stylesheet, "entry-name")`}>{VS`propertyName`}</div>
                  </div>

                  <div className={VS`VSS(stylesheet, "entry-documentation")`}>

                    <If test={VS`documentation.properties[propertyName].summary`}>
                      <div className={VS`VSS(stylesheet, "entry-documentation-summary")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-summary-body")`}>
                          {VS`documentation.properties[propertyName].summary`}
                        </div>
                      </div>
                    </If>

                    <If test={VS`documentation.properties[propertyName].longDescription`}>
                      <div className={VS`VSS(stylesheet, "entry-documentation-long")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-long-header")`}>
                          long description
                        </div>
                        <div className={VS`VSS(stylesheet, "entry-documentation-long-body")`}>
                          {VS`documentation.properties[propertyName].longDescription`}
                        </div>
                      </div>
                    </If>

                    <If test={VS`documentation.properties[propertyName].example`}>
                      <div className={VS`VSS(stylesheet, "entry-documentation-example")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-example-header")`}>
                          example
                        </div>
                        <div className={VS`VSS(stylesheet, "entry-documentation-example-body")`}>{VS`documentation.properties[propertyName].example`}</div>
                      </div>
                    </If>

                    <If test={VS`documentation.properties[propertyName].exampleClarification`}>
                      <div className={VS`VSS(stylesheet, "entry-documentation-example-clarification")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-example-clarification-header")`}>
                          example clarification
                        </div>
                        <div className={VS`VSS(stylesheet, "entry-documentation-example-clarification-body")`}>
                          {VS`documentation.properties[propertyName].exampleClarification`}
                        </div>
                      </div>
                    </If>

                  </div>

                </div>
              </If>
            </If>

          </ForEach>
        </div>
      </If>
    </div>
  </If>
</div>