Taiga card #61: https://tree.taiga.io/project/ppetermann-valaa-valaa-dev/us/61


* Use the createLocalPartition / main.jsx idioms to create instances of the Zero Editor
  * The instance then becomes the user's UI
  * Ensure that the original object and any Widget objects it contains or modifies are unchanged by the modifications in the instance
  * Design the editor such that upon load or opening the editor, it instances all the Widgets it uses, rather than directly referencing them
* There is a potential blocker with the instancing - Iridian is going to be fixing it