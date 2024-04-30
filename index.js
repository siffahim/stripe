const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const stripe = require("stripe")(
  "sk_test_51JwnGrLiLwVG3jO0cewKLOH7opNVle1UFZap9o05XufrjqX5BkOgl5kZrl8YEepiB5IbPF0JSObI8gPt7FCwKRf200aJzI14tq"
);

//parse
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  const account = await stripe.accounts.create({
    type: "express",
    country: "US",
    email: "jenny.rosen@example.com",
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },
  });

  res.send(account);
});

app.listen(port, () => {
  console.log("Application listening on port:", port);
});
