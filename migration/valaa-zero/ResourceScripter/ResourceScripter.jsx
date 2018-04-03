<div className={VS`VSS(head.stylesheet, "root")`}>
  <LinkFieldEditor
      {...kuery(VALK.property("target"))}
      fieldName="value"
      toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])}/>

  {/************************ Toolbox ************************/}
  <div className={VS`VSS(head.stylesheet, "toolbox")`}>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.addProperty`}>
      Add Property
    </button>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.addEntity`}>
      Add Entity
    </button>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.addRelation`}>
      Add Relation
    </button>
    <button
        className={VS`VSS(head.stylesheet, "button")`}
        onClick={VS`head.addScript`}>
      Add Script
    </button>
  </div>

  <div className={VS`VSS(head.stylesheet, "sections")`}>
    {/************************ Non-Media properties ************************/}
    <div className={VS`VSS(head.stylesheet, "title")`}>
      Properties in {VALK.propertyValue("target").to("name")}
    </div>

    <ForEach
        {...kuery(VALK.propertyValue("target").to("properties"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "script-list")` }}
        locals={{
          removeResourceGenerator: VS`head.removeResourceGenerator`,
          stylesheet: VS`head.stylesheet`,
          scripter: VS`head`,
          target: VS`head.target`,
        }}>

      {/************************ Literal properties ************************/}
      <If
          test={VALK.to("value").isOfType("Literal")}
          locals={{ propertyName: VALK.to("name") }}>
        <div className={VS`VSS(stylesheet, "list-entry")`}>
          <div className={VS`VSS(stylesheet, "entry-header")`}>
            <div className={VS`VSS(stylesheet, "grow header-property")`}>
              Property:
              <TextFieldEditor {...kuery} fieldName="name" />
            </div>
            <div className={VS`VSS(stylesheet, "grow header-property")`}>
              Value:
              <ExpressionFieldEditor {...kuery} fieldName="value" />
            </div>
            <button
                className={VS`VSS(stylesheet, "button")`}
                onClick={VS`scripter.toPointerGenerator(target, propertyName)`}>
              to pointer
            </button>
            <button
                className={VS`VSS(stylesheet, "button")`}
                onClick={VS`scripter.removeResourceGenerator(this)`}>
              Remove resource
            </button>
          </div>
        </div>
      </If>

      {/************************ Pointer properties ************************/}
      <If test={VALK.to("value").isOfType("Literal").isFalsy()}>
        <If
            test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isFalsy()}
            locals={{ propertyName: VALK.to("name") }}>
          <div className={VS`VSS(stylesheet, "list-entry")`}>
            <div className={VS`VSS(stylesheet, "entry-header")`}>
              <div className={VS`VSS(stylesheet, "grow header-property")`}>
                Property:
                <TextFieldEditor {...kuery} fieldName="name" />
              </div>
              <div className={VS`VSS(stylesheet, "grow header-property")`}>
                Value:
                <LinkFieldEditor
                    {...kuery}
                    fieldName="value"
                    toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])}/>
              </div>
              <button
                  className={VS`VSS(stylesheet, "button")`}
                  onClick={VS`scripter.toLiteralGenerator(target, propertyName)`}>
                to literal
              </button>

              <button
                  className={VS`VSS(stylesheet, "button")`}
                  onClick={VS`scripter.removeResourceGenerator(this)`}>
                Remove resource
              </button>
            </div>
          </div>
        </If>
      </If>
    </ForEach>

    {/************************ Media properties ************************/}
    <div className={VS`VSS(head.stylesheet, "title")`}>
      Scripts in {VALK.propertyValue("target").to("name")}
    </div>

    <ForEach
        {...kuery(VALK.propertyValue("target").to("properties"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "script-list")` }}
        locals={{
          removeResourceGenerator: VS`head.removeResourceGenerator`,
          stylesheet: VS`head.stylesheet`,
          scripter: VS`head`,
        }}>
      <If test={VALK.to("value").isOfType("Literal").isFalsy()}>
        <If test={VALK.to("value").nullable().to("reference").nullable().hasInterface("Media").isTruthy()}>
          <div className={VS`VSS(stylesheet, "list-entry")`}>
            <div className={VS`VSS(stylesheet, "entry-header")`}>
              <div className={VS`VSS(stylesheet, "grow header-property")`}>
                Property:
                <TextFieldEditor {...kuery} fieldName="name" />
              </div>
              <div className={VS`VSS(stylesheet, "grow header-property")`}>
                Script file:
                <TextFieldEditor {...kuery(VALK.to("value").to("reference"))} fieldName="name" />
              </div>
              <button
                  className={VS`VSS(stylesheet, "button")`}
                  onClick={VS`scripter.removeResourceGenerator(this)`}>
                Remove resource
              </button>
            </div>
            <div className={VS`VSS(stylesheet, "entry-editor")`}>
              <TextFileEditor {...kuery(VALK.to("value").to("reference"))} experimental />
            </div>
          </div>
        </If>
      </If>
    </ForEach>

    {/************************ Ownlings ************************/}
    <div className={VS`VSS(head.stylesheet, "title")`}>
      Objects owned by {VALK.propertyValue("target").to("name")}
    </div>

    <ForEach
        {...kuery(VALK.propertyValue("target").to("unnamedOwnlings"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "script-list")` }}
        locals={{
          removeResourceGenerator: VS`head.removeResourceGenerator`,
          stylesheet: VS`head.stylesheet`,
          scripter: VS`head`,
        }}>
      <div className={VS`VSS(stylesheet, "list-entry")`}>
        <div className={VS`VSS(stylesheet, "entry-header")`}>
          <div className={VS`VSS(stylesheet, "grow header-property")`}>
            Type - {VS`head[Resource.hasInterface]("Entity") ?
                "Entity" : head[Resource.hasInterface]("Media") ?
                "Media" : "Ownling"`} - name:
            <TextFieldEditor {...kuery} fieldName="name" />
          </div>
          <button
              className={VS`VSS(stylesheet, "button")`}
              onClick={VS`scripter.removeResourceGenerator(this)`}>
            Remove resource
          </button>
        </div>
      </div>
    </ForEach>

    {/************************ Outgoing Relations ************************/}
    <div className={VS`VSS(head.stylesheet, "title")`}>
      Relations coming from {VALK.propertyValue("target").to("name")}
    </div>

    <ForEach
        {...kuery(VALK.propertyValue("target").to("relations"))}
        rootProps={{ className: VS`VSS(head.stylesheet, "script-list")` }}
        locals={{
          removeResourceGenerator: VS`head.removeResourceGenerator`,
          stylesheet: VS`head.stylesheet`,
          scripter: VS`head`,
        }}>
      <div className={VS`VSS(stylesheet, "list-entry")`}>
        <div className={VS`VSS(stylesheet, "entry-header")`}>
          <div className={VS`VSS(stylesheet, "grow header-property")`}>
            Relation:
            <TextFieldEditor {...kuery} fieldName="name" />
          </div>
          <div className={VS`VSS(stylesheet, "grow header-property")`}>
            Target:
            <LinkFieldEditor
                {...kuery}
                fieldName="target"
                toCandidatesKuery={VALK.recurseConnectedPartitionMaterializedFieldResources(["unnamedOwnlings", "relations"])} />
          </div>
          <button
              className={VS`VSS(stylesheet, "button")`}
              onClick={VS`scripter.removeResourceGenerator(this)`}>
            Remove resource
          </button>
        </div>
      </div>
    </ForEach>
  </div>
</div>
