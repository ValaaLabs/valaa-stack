(comment) => {
  return () => {
    if (window.confirm("Remove the following comment?\n\n" + comment.text)) {
      Relation.destroy(comment);
    }
  };
};