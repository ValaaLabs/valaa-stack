<div className={VS`VSS(head.stylesheet, "wrapper")`}>
  {/************** Header View **************/}
  <header className={VS`VSS(head.stylesheet, "header-wrapper")`}>
    <div className={VS`VSS(head.stylesheet, "header-logo")`}>
      VALAA
    </div>
    <div className={VS`VSS(head.stylesheet, "header-title")`}>
      {VS`head[Valaa.name]`}
    </div>
    <div className={VS`VSS(head.stylesheet, "header-version")`}>
      Inspire v.0
    </div>
  </header>


  {/************** Main body **************/}
  <main className={VS`VSS(head.stylesheet, "main-wrapper")`}>
    {/************** Control panel **************/}
    <div className={VS`VSS(head.stylesheet, "panel-wrapper")`}>
      <div className={VS`VSS(head.stylesheet, "panel-body")`}>
        <div className={VS`VSS(head.stylesheet, "panel-body-nav")`}>
          <div className={VS`VSS(head.stylesheet, "panel-button")`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-search")`}></i>
            <span>search</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-chat")`}></i>
            <span>chat</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-settings")`}></i>
            <span>settings</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-account")`}></i>
            <span>account</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-sign-out")`}></i>
            <span>logout</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`} onClick={VS`head.openTestView`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-test")`}></i>
            <span>split view</span>
          </div>
          <div className={VS`VSS(head.stylesheet, "panel-button")`} onClick={VS`head.openTestTab`}>
            <i className={VS`VSS(head.stylesheet, "panel-button-icon icon-test")`}></i>
            <span>open tab</span>
          </div>
        </div>
        <div className={VS`VSS(head.stylesheet, "panel-body-content")`}>
          <div>Tree view goes here</div>
        </div>
      </div>
    </div>

    {/************** Content Sections **************/}
    <section className={VS`VSS(head.stylesheet, "content-wrapper")`}>
      <ValaaNode kuery={VS`head.createSplitView()`} />
    </section>
  </main>
</div>
