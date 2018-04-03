<div className={VS`VSS(head.stylesheet, "scripter-root")`}>

  {/************************ Toolbox ************************/}
  <div className={VS`VSS(head.stylesheet, "scripter-toolbox")`}>
    <div
        className={VS`VSS(head.stylesheet, "scripter-toolbox-button")`}
        onClick={VS`head.addProperty`}>
      Add Property
    </div>
    <div
        className={VS`VSS(head.stylesheet, "scripter-toolbox-button")`}
        onClick={VS`head.addEntity`}>
      Add Entity
    </div>
    <div
        className={VS`VSS(head.stylesheet, "scripter-toolbox-button")`}
        onClick={VS`head.addRelation`}>
      Add Relation
    </div>
    <div
        className={VS`VSS(head.stylesheet, "scripter-toolbox-button")`}
        onClick={VS`head.addScript`}>
      Add Script
    </div>
  </div>

  {/************************ Sections ************************/}
  <div className={VS`VSS(head.stylesheet, "scripter-sections")`}>

    {/************************ Non-Media properties ************************/}
    <div className={VS`VSS(head.stylesheet, "scripter-section")`}>
      <div className={VS`VSS(head.stylesheet, "scripter-section-header")`}>
        Properties in {VS`head.target[Valaa.name]`}
      </div>
      <ForEach
          kuery={VS`head.target[Scope.properties]`}
          rootProps={{ className: VS`VSS(head.stylesheet, "scripter-section-body")` }}
          locals={{
            removeResourceFactory: VS`head.removeResourceFactory`,
            stylesheet: VS`head.stylesheet`,
            scripter: VS`head`,
            target: VS`head.target`,
          }}>

        {/************************ Literal properties ************************/}
        <If
            test={VALK.to("value").isOfType("Literal")}
            locals={{ propertyName: VALK.to("name") }}>
          <div className={VS`VSS(stylesheet, "scripter-section-entry")`}>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-header")`}>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-label")`}>
                Property:
              </div>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                <TextFieldEditor {...kuery} fieldName="name" />
              </div>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-value")`}>
                Value:
              </div>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                <ExpressionFieldEditor {...kuery} fieldName="value" />
              </div>
              <div
                  className={VS`VSS(stylesheet, "scripter-section-entry-button")`}>
                To pointer
              </div>
              <div
                  className={VS`VSS(stylesheet, "scripter-section-entry-button")`}
                  onClick={VS`removeResourceFactory(head)`}>
                🗑 Remove resource
              </div>
            </div>
          </div>
        </If>

        {/************************ Pointer properties ************************/}
        <If test={VALK.to("value").isOfType("Literal").isFalsy()}>
          <If
              test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isFalsy()}
              locals={{ propertyName: VALK.to("name") }}>
            <div className={VS`VSS(stylesheet, "scripter-section-entry")`}>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-header")`}>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-label")`}>
                  Property:
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                  <TextFieldEditor {...kuery} fieldName="name" />
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-value")`}>
                  Value:
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                  <LinkFieldEditor
                      {...kuery}
                      fieldName="value"
                      toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])}/>
                </div>
                <div
                    className={VS`VSS(stylesheet, "scripter-section-entry-button")`}>
                  To literal
                </div>
                <div
                    className={VS`VSS(stylesheet, "scripter-section-entry-button")`}
                    onClick={VS`removeResourceFactory(head)`}>
                  🗑 Remove resource
                </div>
              </div>
            </div>
          </If>
        </If>
      </ForEach>
    </div>


    {/************************ Non-Media properties ************************/}
    <div className={VS`VSS(head.stylesheet, "scripter-section")`}>
      <div className={VS`VSS(head.stylesheet, "scripter-section-header")`}>
        Scripts and medias in {VS`head.target[Valaa.name]`}
      </div>
      <ForEach
          kuery={VS`head.target[Scope.properties]`}
          rootProps={{ className: VS`VSS(head.stylesheet, "scripter-section-body")` }}
          locals={{
            removeResourceFactory: VS`head.removeResourceFactory`,
            stylesheet: VS`head.stylesheet`,
            scripter: VS`head`,
            target: VS`head.target`,
          }}>
        <If test={VALK.to("value").isOfType("Literal").isFalsy()}>
          <If test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isTruthy()}>
            <div className={VS`VSS(stylesheet, "scripter-section-entry")`}>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-header")`}>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-label")`}>
                  Property:
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                  <TextFieldEditor {...kuery} fieldName="name" />
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-value")`}>
                  Media name:
                </div>
                <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
                  <TextFieldEditor {...kuery(VALK.to("value").to("reference"))} fieldName="name" />
                </div>
                <div
                    className={VS`VSS(stylesheet, "scripter-section-entry-button")`}
                    onClick={VS`removeResourceFactory(head)`}>
                  🗑 Remove resource
                </div>
              </div>
              <div className={VS`VSS(stylesheet, "scripter-section-entry-body")`}>
                <TextFileEditor {...kuery(VALK.to("value").to("reference"))} />
              </div>
            </div>
          </If>
        </If>
      </ForEach>
    </div>

    {/************************ Ownlings ************************/}
    <div className={VS`VSS(head.stylesheet, "scripter-section")`}>
      <div className={VS`VSS(head.stylesheet, "scripter-section-header")`}>
        Unnamed ownlings in {VS`head.target[Valaa.name]`}
      </div>
      <ForEach
          kuery={VS`head.target[Resource.unnamedOwnlings]`}
          rootProps={{ className: VS`VSS(head.stylesheet, "scripter-section-body")` }}
          locals={{
            removeResourceFactory: VS`head.removeResourceFactory`,
            stylesheet: VS`head.stylesheet`,
            scripter: VS`head`,
            target: VS`head.target`,
          }}>
        <div className={VS`VSS(stylesheet, "scripter-section-entry")`}>
          <div className={VS`VSS(stylesheet, "scripter-section-entry-header")`}>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-label")`}>
              <If test={VS`head[Resource.hasInterface]("Entity")`}>
                Entity:
              </If>
              <If test={VS`head[Resource.hasInterface]("Media")`}>
                Media:
              </If>
              <If test={VS`!head[Resource.hasInterface]("Entity") && !head[Resource.hasInterface]("Media")`}>
                Ownling:
              </If>
            </div>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
              <TextFieldEditor {...kuery} fieldName="name" />
            </div>
            <div
                className={VS`VSS(stylesheet, "scripter-section-entry-button")`}
                onClick={VS`removeResourceFactory(head)`}>
              🗑 Remove resource
            </div>
          </div>
        </div>
      </ForEach>
    </div>

    {/************************ Outgoing Relations ************************/}
    <div className={VS`VSS(head.stylesheet, "scripter-section")`}>
      <div className={VS`VSS(head.stylesheet, "scripter-section-header")`}>
        Outgoing relations from {VS`head.target[Valaa.name]`}
      </div>

      <ForEach
          kuery={VS`head.target[Relatable.relations]`}
          rootProps={{ className: VS`VSS(head.stylesheet, "scripter-section-body")` }}
          locals={{
            removeResourceFactory: VS`head.removeResourceFactory`,
            stylesheet: VS`head.stylesheet`,
            scripter: VS`head`,
            target: VS`head.target`,
          }}>
        <div className={VS`VSS(stylesheet, "scripter-section-entry")`}>
          <div className={VS`VSS(stylesheet, "scripter-section-entry-header")`}>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-label")`}>
              Relation:
            </div>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
              <TextFieldEditor {...kuery} fieldName="name" />
            </div>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-value")`}>
              Target:
            </div>
            <div className={VS`VSS(stylesheet, "scripter-section-entry-widget")`}>
              <LinkFieldEditor
                  {...kuery}
                  fieldName="target"
                  toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])} />
            </div>
            <div
                className={VS`VSS(stylesheet, "scripter-section-entry-button")`}
                onClick={VS`removeResourceFactory(head)`}>
              🗑 Remove resource
            </div>
          </div>
        </div>
      </ForEach>
    </div>

  {/************************ Sections end ************************/}
  </div>

</div>