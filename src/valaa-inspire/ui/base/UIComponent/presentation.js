export default () => ({
  _isUIComponent: true,
  root: {
    className: ({ css }) => css("Inspire.component"),
    style: { display: "inline-block" },
  },
});
