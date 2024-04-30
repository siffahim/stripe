const express = require("express");
const app = express();
const port = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Hello Stripe");
});

app.listen(port, () => {
  console.log("Application listening on port:", port);
});
