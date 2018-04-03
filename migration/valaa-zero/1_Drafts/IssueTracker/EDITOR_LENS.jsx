<div className={VS`VSS(head.stylesheet, "root")`}>
  <div className={VS`VSS(head.stylesheet, "side-pane")`}>
    <div
        className={VS`VSS(head.stylesheet, "new-issue-button")`}
        onClick={VS`head.createNewIssue`}>
      + new issue
    </div>
    <ForEach
        kuery={VS`head.bugs[Resource.unnamedOwnlings]`}
        rootProps={{ className: VS`VSS(head.stylesheet, "folders")` }}
        locals={{ issueTracker: VS`head` }}>
      <div className={VS`VSS(issueTracker.stylesheet, "folder")`}>
        <div
            className={VS`VSS(issueTracker.stylesheet, "folder-label")`}
            onClick={VS`issueTracker.toggleExpansionFactory(head[Valaa.name])`}>
          {VS`head[Valaa.name]`}
        </div>
        <If test={VS`issueTracker.expanded[head[Valaa.name]]`}>
          <ForEach
              kuery={VS`head[Relatable.getRelations]("GO")`}
              rootProps={{ className: VS`VSS(issueTracker.stylesheet, "issues")` }}
              locals={{ folder: VS`head` }}>
            <div className={VS`VSS(issueTracker.stylesheet, "issue")`}>
              <div
                  className={VS`VSS(issueTracker.stylesheet, "issue-label")`}
                  onClick={VS`issueTracker.focusIssueFactory(head)`}>
                {VS`head.name`}
              </div>
            </div>
          </ForEach>
        </If>
      </div>
    </ForEach>
  </div>
  <If
      test={VS`head.activeIssue`}
      locals={{ issueTracker: VS`head` }}>
    <div className={VS`VSS(head.stylesheet, "focused")`}>
      <div className={VS`VSS(head.stylesheet, "focused-header")`}>
        <div className={VS`VSS(head.stylesheet, "focused-label")`}>
          {VS`head.activeIssue[Valaa.name]`}
        </div>
        <div className={VS`VSS(head.stylesheet, "focused-status")`}>
          Status:
        </div>
        <ForEach
            kuery={VS`head.bugs[Resource.unnamedOwnlings]`}
            rootProps={{
              className: VS`VSS(head.stylesheet, "focused-status-selector")`,
              defaultValue: VS`head.focus[Resource.owner][Valaa.name]`,
              onChange: VS`(event) => issueTracker.setIssueStatus(event)`,
            }}
            RootElement="select">
          <option value={VS`head[Valaa.name]`} label={VS`head[Valaa.name]`} />
        </ForEach>
      </div>

      <div className={VS`VSS(head.stylesheet, "focused-body")`}>
        {/******************** Issue description ********************/}
        <If test={VS`head.activeIssue.issueDescription === undefined`}>
          <div
              className={VS`VSS(head.stylesheet, "focused-description-adder")`}
              onClick={VS`head.addIssueDescription`}>
            + Add issue description
          </div>
        </If>
        <If test={VS`head.activeIssue.issueDescription`}>
          <div className={VS`VSS(head.stylesheet, "focused-description")`}>
            <textarea
                id={VS`head.textElementId(head.activeIssue)`}
                className={VS`VSS(head.stylesheet, "focused-description-text")`}
                defaultValue={VS`head.activeIssue.issueDescription`} />
            <div className={VS`VSS(head.stylesheet, "focused-description-toolbox")`}>
              <div
                  className={VS`VSS(head.stylesheet, "focused-description-save")`}
                  onClick={VS`head.saveTextFactory(head.activeIssue, "issueDescription")`}>
                🖫
              </div>
              <div
                  className={VS`VSS(head.stylesheet, "focused-description-revert")`}
                  onClick={VS`head.restoreTextFactory(head.activeIssue, "issueDescription")`}>
                &#8630;
              </div>
            </div>
          </div>
        </If>

        {/******************** Issue comments ********************/}
        <div className={VS`VSS(head.stylesheet, "focused-comments-section")`}>
          <div className={VS`VSS(head.stylesheet, "focused-comments-header")`}>
            Comments:
          </div>
          <ForEach
              kuery={VS`head.activeIssue[Relatable.getRelations]("IssueComment")`}
              rootProps={{ className: VS`VSS(head.stylesheet, "focused-comments")` }}
              locals={{ issueTracker: VS`head` }}>
            <div className={VS`VSS(issueTracker.stylesheet, "focused-comment")`}>
              <textarea
                  id={VS`issueTracker.textElementId(head)`}
                  className={VS`VSS(issueTracker.stylesheet, "focused-comment-text")`}
                  defaultValue={VS`head.text`} />
              <div className={VS`VSS(issueTracker.stylesheet, "focused-comment-toolbox")`}>
                <div
                    className={VS`VSS(issueTracker.stylesheet, "focused-comment-save")`}
                    onClick={VS`issueTracker.saveTextFactory(head, "text")`}>
                  🖫
                </div>
                <div
                    className={VS`VSS(issueTracker.stylesheet, "focused-comment-revert")`}
                    onClick={VS`issueTracker.restoreTextFactory(head, "text")`}>
                  &#8630;
                </div>
                <div
                    className={VS`VSS(issueTracker.stylesheet, "focused-comment-remove")`}
                    onClick={VS`issueTracker.removeCommentFactory(head)`}>
                  x
                </div>
              </div>
            </div>
          </ForEach>
          <div
              className={VS`VSS(head.stylesheet, "focused-comment-adder")`}
              onClick={VS`head.addComment`}>
            + Add a comment
          </div>
        </div>
      </div>
    </div>
  </If>
</div>