<div className={VS`VSS(head.stylesheet, "documenter-root")`}>

  {/************************ Missing documentation ************************/}
  <If test={VS`head.target[Relatable.getRelations]("Valaa_Documentation").length === 0`}>
    <div className={VS`VSS(head.stylesheet, "documenter-missing")`}>
      <pre className={VS`VSS(head.stylesheet, "documenter-missing-text")`}>
        The selected target does not have documentation yet
      </pre>
      <div
          className={VS`VSS(head.stylesheet, "documenter-add-documentation-button")`}
          onClick={VS`head.addDocumentation`} >
        Add documentation relation
      </div>
    </div>
  </If>

  {/************************ Existing documentation ************************/}
  <If test={VS`head.target[Relatable.getRelations]("Valaa_Documentation").length > 0`}
      locals={{
        documenter: VS`head`,
        target: VS`head.target`,
        documentation: VS`head.target[Relatable.getRelations]("Valaa_Documentation")[0]`,
        stylesheet: VS`head.stylesheet`,
      }}>
    <div className={VS`VSS(head.stylesheet, "documenter-documentation")`}>

    {/************************ Property datalist ************************/}
    <ForEach
        kuery={VS`target[Scope.properties]`}
        RootElement="datalist"
        rootProps={{ id: VS`head[Resource.rawId] + "_properties"`}}>
      <option value={VALK.to("name")}>{VALK.to("name")}</option>
    </ForEach>

    {/************************ Toolbox ************************/}
    <div className={VS`VSS(stylesheet, "scripter-toolbox")`}>
      <div
          className={VS`VSS(stylesheet, "scripter-toolbox-button")`}
          onClick={VS`documenter.addDocumentationSection`}
          >
        Add documentation section
      </div>
    </div>

    {/************************ Sections ************************/}
    <div className={VS`VSS(stylesheet, "documenter-sections")`}>

      {/************************ Main section ************************/}
      <div className={VS`VSS(stylesheet, "documenter-section")`}>
        <div className={VS`VSS(stylesheet, "documenter-section-header")`}>
          <div className={VS`VSS(stylesheet, "documenter-section-header-label")`}>
            Main document body
          </div>
        </div>
        <div className={VS`VSS(stylesheet, "documenter-section-body")`}>
          <div className={VS`VSS(stylesheet, "documenter-section-field")`}>
            <div className={VS`VSS(stylesheet, "documenter-section-field-label")`}>
              resource summary
            </div>

            <textarea
                className={VS`VSS(stylesheet, "documenter-short-editor")`}
                defaultValue={VS`documentation.main.summary`}
                onBlur={VS`documenter.setDocumentationFieldFactory({ structure: documentation.main, propertyName: "summary" })`}
                />
          </div>

          <div className={VS`VSS(stylesheet, "documenter-section-field")`}>
            <div className={VS`VSS(stylesheet, "documenter-section-field-label")`}>
              resource long description
            </div>

            <textarea
                className={VS`VSS(stylesheet, "documenter-tall-editor")`}
                defaultValue={VS`documentation.main.longDescription`}
                onBlur={VS`head.setDocumentationFieldFactory({ structure: documentation.main, propertyName: "longDescription" })`}
                />
          </div>
        </div>
      </div>

      {/************************ Other sections ************************/}
      <ForEach
          kuery={VS`documentation[Relatable.getRelations]("Valaa_Documentation_Section")`}
          rootProps={{ className: VS`VSS(stylesheet, "documenter-section")` }}>
        <div className={VS`VSS(stylesheet, "documenter-section-header")`}>
          <div className={VS`VSS(stylesheet, "documenter-section-header-label")`}>
            Section:
          </div>
          <div className={VS`VSS(stylesheet, "documenter-section-widget")`}>
            <ExpressionFieldEditor {...kuery(VALK.property("name"))} fieldName="value" />
          </div>
          <div className={VS`VSS(stylesheet, "documenter-section-header-label")`}>
            Add section entry:
          </div>
          <input
              className={VS`VSS(stylesheet, "documenter-section-widget")`}
              type="text"
              list={VS`target[Resource.rawId] + "_properties"`}
              onBlur={VS`documenter.addDocumentationSubsectionFactory(head, target)`} />
          <div
              className={VS`VSS(stylesheet, "documenter-remove-section-button")`}
              onClick={VS`documenter.removeDocumentationSectionFactory(head)`}>
            🗑 Remove section
          </div>
        </div>
        <ForEach
            kuery={VS`head.entries[Resource.unnamedOwnlings]`}
            rootProps={{ className: VS`VSS(stylesheet, "documenter-subsections")` }}
            locals={{ section: VS`head` }}>
          <div className={VS`VSS(stylesheet, "documenter-subsection")`}>
            <div className={VS`VSS(stylesheet, "documenter-subsection-header")`}>
              <div className={VS`VSS(stylesheet, "documenter-subsection-header-label")`}>
                Entry {VALK.to("name")}
              </div>
              <div className={VS`VSS(stylesheet, "documenter-subsection-header-toolbox")`}>
                <If test={VS`head.summary !== undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-remove")`}
                      onClick={VS`documenter.removeDocumentationSubsectionFieldFactory(head, "summary")`}>
                    summary
                  </div>
                </If>
                <If test={VS`head.summary === undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-add")`}
                      onClick={VS`documenter.addDocumentationSubsectionFieldFactory(head, "summary")`}>
                    summary
                  </div>
                </If>
                <If test={VS`head.longDescription !== undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-remove")`}
                      onClick={VS`documenter.removeDocumentationSubsectionFieldFactory(head, "longDescription")`}>
                    long description
                  </div>
                </If>
                <If test={VS`head.longDescription === undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-add")`}
                      onClick={VS`documenter.addDocumentationSubsectionFieldFactory(head, "longDescription")`}>
                    long description
                  </div>
                </If>
                <If test={VS`head.example !== undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-remove")`}
                      onClick={VS`documenter.removeDocumentationSubsectionFieldFactory(head, "example")`}>
                    example
                  </div>
                </If>
                <If test={VS`head.example === undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-add")`}
                      onClick={VS`documenter.addDocumentationSubsectionFieldFactory(head, "example")`}>
                    example
                  </div>
                </If>
                <If test={VS`head.exampleClarification !== undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-remove")`}
                      onClick={VS`documenter.removeDocumentationSubsectionFieldFactory(head, "exampleClarification")`}>
                    example clarification
                  </div>
                </If>
                <If test={VS`head.exampleClarification === undefined`}>
                  <div
                      className={VS`VSS(stylesheet, "documenter-toggle toggle-add")`}
                      onClick={VS`documenter.addDocumentationSubsectionFieldFactory(head, "exampleClarification")`}>
                    example clarification
                  </div>
                </If>
                <div
                    className={VS`VSS(stylesheet, "documenter-remove-subsection-button")`}
                    onClick={VS`documenter.removeDocumentationSubsectionFactory(head)`}>
                  🗑 Remove entry
                </div>
              </div>
            </div>
            <ForEach
                kuery={VS`head[Scope.properties]`}
                rootProps={{ className: VS`VSS(stylesheet, "documenter-subsection-body")` }}
                locals={{ subsection: VS`head` }}>
              <If
                  test={VALK.to("value").isTruthy()}
                  locals={{ field: VALK.to("name") }}>
                <div className={VS`VSS(stylesheet, "documenter-subsection-field")`}>
                  <div className={VS`VSS(stylesheet, "documenter-subsection-field-label")`}>
                    {VALK.to("name")}
                  </div>
                  <textArea
                      className={VS`VSS(stylesheet, "documenter-short-editor")`}
                      defaultValue={VS`subsection[field]`}
                      onBlur={VS`documenter.setDocumentationFieldFactory({ structure: subsection, propertyName: field })`} />
                </div>
              </If>
            </ForEach>
          </div>
        </ForEach>
      </ForEach>
    </div>
    </div>
  </If>
</div>