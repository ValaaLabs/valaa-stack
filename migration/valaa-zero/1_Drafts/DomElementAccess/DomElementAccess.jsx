<div>
  <button onClick={VS`head.test`}>
    Click to access elements via the DOM and check the console for information
  </button>
  <pre id="someId">id = "someId"</pre>
  <pre id={VS`head.id("prefixedId")`}>id = head.id("prefixedId")</pre>
</div>