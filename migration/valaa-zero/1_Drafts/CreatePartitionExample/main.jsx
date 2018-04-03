<div>
  {VS`head[Valaa.name]`}
  <input type="text" onBlur={VS`(event) => console.log("onClick", event.target.value)`} />
  <ValaaNode kuery={VS`head.createLocalPartition()`} fixedUI={VS`head.secondary`} />
</div>