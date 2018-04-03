<div className={VS`VSS(head.stylesheet, "root")`}>
  <LinkFieldEditor
      {...kuery(VALK.property("target"))}
      fieldName="value"
      toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])}/>

  <If test={VS`head.target !== null`}>
    <div className={VS`VSS(head.stylesheet, "content")`}>

      {/************************ Missing documentation ************************/}
      <If test={VS`head[Relatable.getRelations]("Valaa_Documentation").length === 0`}>
        <div className={VS`VSS(head.stylesheet, "documentation-missing")`}>
          <pre className={VS`VSS(head.stylesheet, "documentation-missing-text")`}>
            The selected target does not have documentation yet
          </pre>
          <button
              className={VS`VSS(head.stylesheet, "documentation-add-button")`}
              onClick={VS`head.addDocumentation`}>
            Add documentation relation
          </button>
        </div>
      </If>
      
      <If test={VS`head[Relatable.getRelations]("Valaa_Documentation").length > 0`}
          locals={{ documentation: VS`head.target[Relatable.getRelations]("Valaa_Documentation")[0]` }}>
        <div className={VS`VSS(head.stylesheet, "documentation")`}>

          {/************************ Main section ************************/}
          <div className={VS`VSS(head.stylesheet, "main-documentation-field")`}>
            <div className={VS`VSS(head.stylesheet, "main-documentation-field-name")`}>
              resource summary
            </div>

            <textarea
                className={VS`VSS(head.stylesheet, "short-editor")`}
                defaultValue={VS`documentation.main.summary`}
                onBlur={VS`head.setDocumentationFieldFactory({ structure: documentation.main, propertyName: "summary" })`} />
          </div>

          <div className={VS`VSS(head.stylesheet, "main-documentation-field")`}>
            <div className={VS`VSS(head.stylesheet, "main-documentation-field-name")`}>
              resource long description
            </div>

            <textarea
                className={VS`VSS(head.stylesheet, "tall-editor")`}
                defaultValue={VS`documentation.main.longDescription`}
                onBlur={VS`head.setDocumentationFieldFactory({ structure: documentation.main, propertyName: "longDescription" })`} />
          </div>

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
            <If test={1} locals={{ propertyName: VALK.to("name") }}>
              <div className={VS`VSS(stylesheet, "list-entry")`}>
                  <div className={VS`VSS(stylesheet, "entry-header")`}>
                    Property:<div className={VS`VSS(stylesheet, "entry-name")`}>{VS`propertyName`}</div>

                    <If test={VS`!documentation.properties[propertyName]`}>
                      <button
                          className={VS`VSS(stylesheet, "add-field-button")`}
                          onClick={VS`documenter.addPropertyDocumentationFactory({ documentation: documentation, propertyName: propertyName })`}>
                        +
                      </button>
                    </If>

                    <If test={VS`documentation.properties[propertyName]`}>
                      <button
                          className={VS`VSS(stylesheet, "remove-field-button")`}
                          onClick={VS`documenter.removePropertyDocumentationFactory({ documentation: documentation, propertyName: propertyName })`}>
                        -
                      </button>
                    </If>

                  </div>

                  <If test={VS`!documentation.properties[propertyName]`}>
                    <div className={VS`VSS(stylesheet, "entry-undocumented")`}>
                      <div className={VS`VSS(stylesheet, "entry-undocumented-label")`}>
                        Undocumented property
                      </div>
                    </div>
                  </If>

                  <If test={VS`documentation.properties[propertyName]`}>
                    <div className={VS`VSS(stylesheet, "entry-documentation")`}>

                      <div className={VS`VSS(stylesheet, "entry-documentation-field")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-field-name")`}>
                          summary
                        </div>
                        <textarea
                            className={VS`VSS(stylesheet, "short-field-editor")`}
                            defaultValue={VS`documentation.properties[propertyName].summary`}
                            onBlur={VS`documenter.setDocumentationFieldFactory({ structure: documentation.properties[propertyName], propertyName: "summary" })`} />
                      </div>

                      <div className={VS`VSS(stylesheet, "entry-documentation-field")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-field-name")`}>
                          long description
                        </div>
                        <textarea
                            className={VS`VSS(stylesheet, "tall-field-editor")`}
                            defaultValue={VS`documentation.properties[propertyName].longDescription`}
                            onBlur={VS`documenter.setDocumentationFieldFactory({ structure: documentation.properties[propertyName], propertyName: "longDescription" })`} />
                      </div>

                      <div className={VS`VSS(stylesheet, "entry-documentation-field")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-field-name")`}>
                          usage example
                        </div>
                        <textarea
                            className={VS`VSS(stylesheet, "short-field-editor")`}
                            defaultValue={VS`documentation.properties[propertyName].example`}
                            onBlur={VS`documenter.setDocumentationFieldFactory({ structure: documentation.properties[propertyName], propertyName: "example" })`} />
                      </div>

                      <div className={VS`VSS(stylesheet, "entry-documentation-field")`}>
                        <div className={VS`VSS(stylesheet, "entry-documentation-field-name")`}>
                          example comment
                        </div>
                        <textarea
                            className={VS`VSS(stylesheet, "short-field-editor")`}
                            defaultValue={VS`documentation.properties[propertyName].exampleClarification`}
                            onBlur={VS`documenter.setDocumentationFieldFactory({ structure: documentation.properties[propertyName], propertyName: "exampleClarification" })`} />
                      </div>

                    </div>
                  </If>

                  {/************************ Literal properties ************************/}
                  {/*
                  <If test={VALK.to("value").isOfType("Literal")}>
                    Is literal
                  </If>
                  */}

                  {/************************ Pointer properties ************************/}
                  {/*
                  <If test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isFalsy()}>
                    Is pointer
                  </If>
                  */}

                  {/************************ Media properties ************************/}
                  {/*
                  <If test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isTruthy()}>
                    Is media
                  </If>
                  */}
              </div>
            </If>
          </ForEach>
        </div>
      </If>
    </div>

  </If>
</div>