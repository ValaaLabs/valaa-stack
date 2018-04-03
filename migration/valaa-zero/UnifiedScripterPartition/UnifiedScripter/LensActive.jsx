<div className={VS`VSS(head.stylesheet, "root")`}>
  <div className={VS`VSS(head.stylesheet, "header")`}>
    <ValaaNode
        kuery={VS`head`}
        lensName="LensTargetSelector" />   
    <ValaaNode
        kuery={VS`head`}
        lensName="LensLensSelector" />
  </div>


  <div className={VS`VSS(head.stylesheet, "body")`}>
    <If test={VS`!head.target`}>
        <ValaaNode
            kuery={VS`head`}
            lensName={"LensMissingTarget"} />
    </If>

    <If test={VS`head.target`}>
        <ValaaNode
            kuery={VS`head`}
            lensName={VS`head.activeLensName`} />
    </If>
  </div>
</div>