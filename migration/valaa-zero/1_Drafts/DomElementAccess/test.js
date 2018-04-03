() => {
  const firstElement = document.getElementById("someId");
  console.log("Element with ID 'someId' is", firstElement);
  firstElement.textContent = "Edited this by accessing the element via the DOM";

  const secondElement = document.getElementById(this.id("prefixedId"));
  console.log("Element with ID '" + this.id("prefixedId") + "'is", secondElement);
  secondElement.textContent = "Also edited this by accessing the element via the DOM";
};