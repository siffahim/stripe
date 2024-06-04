const express = require("express");
const app = express();
const port = process.env.PORT || 5004;
const cors = require("cors");
const fs = require("fs");
const stripe = require("stripe")(
  "sk_test_51PCQ77GrZo82iUJpiMCaA4iI4tuyOxLMu4S1XofJufj45iTmXcCdNqJSzKtAGlMp95KcS29G9q5BsYIqGlipfefF00Tmea2VEW"
);

const multer = require("multer");
const path = require("path");
const { type } = require("os");
const { url } = require("inspector");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads");
  },
  filename: (req, file, cb) => {
    const fileExt = path.extname(file.originalname);
    const fileName =
      file.originalname
        .replace(fileExt, "")
        .toLowerCase()
        .split(" ")
        .join("-") +
      "-" +
      Date.now();
    cb(null, fileName + fileExt);
  },
});

const upload = multer({
  storage: storage,
});

//parse
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Hello Stripe");
});

// payment intent
app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;

  const amount = Math.trunc(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "eur",
    payment_method_types: ["card"],
  });

  res.status(200).send({ clientSecret: paymentIntent.client_secret });
});
//
//create account
app.post("/create-account", upload.array("KYC", 2), async (req, res) => {
  try {
    // Process uploaded files
    const files = req.files;
    if (!files || files.length < 2) {
      return res.status(400).send({ error: "Two KYC files are required." });
    }

    // Upload identity document files
    const fileUploadFrontPart = await stripe.files.create({
      purpose: "identity_document",
      file: {
        data: fs.readFileSync(files[0].path),
        name: files[0].filename,
        type: files[0].mimetype,
      },
    });

    const backFileUpload = await stripe.files.create({
      purpose: "identity_document",
      file: {
        data: fs.readFileSync(files[1].path),
        name: files[1].filename,
        type: files[1].mimetype,
      },
    });

    // Create token for individual account
    const token = await stripe.tokens.create({
      account: {
        individual: {
          dob: {
            day: "25",
            month: "09",
            year: "2001",
          },
          email: "siffahim.bdcalling@gmail.com",
          first_name: "Sif",
          last_name: "Fahim",
          phone: "+33781858334",
          address: {
            city: "Aubervilliers",
            line1: "56 rue du landy",
            postal_code: "93300",
            country: "FR",
          },
          verification: {
            document: {
              front: fileUploadFrontPart.id,
              back: backFileUpload.id,
            },
          },
        },
        business_type: "individual",
        tos_shown_and_accepted: true,
      },
    });

    // Create external account (bank account)
    const external_account = {
      object: "bank_account",
      account_holder_name: "Fahim",
      account_holder_type: "individual",
      account_number: "FR1420041010050500013M02606",
      country: "FR",
      currency: "eur",
    };

    // Create Stripe account
    const account = await stripe.accounts.create({
      country: "FR",
      type: "custom",
      account_token: token.id,
      email: "siffahim.bdcalling@gmail.com",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "5970",
        url: "www.xyz.com",
        name: "Artist Business",
        product_description: "Your business description",
        support_address: {
          city: "Aubervilliers",
          country: "FR",
          line1: "56 rue du landy",
          postal_code: "93300",
        },
      },
      external_account: external_account,
    });

    console.log(account.external_accounts.data[0].id);

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "https://example.com/reauth",
      return_url: "https://example.com/return",
      type: "account_onboarding",
      collect: "eventually_due",
    });

    // Send success response
    res
      .status(200)
      .send({ message: "Stripe connect account created", accountLink });
  } catch (error) {
    console.error("Error creating Stripe account:", error);
    // Send error response
    res.status(500).send({ error: error.message });
  }
});

//transfer money
app.post("/transfer", async (req, res) => {
  try {
    const transfer = await stripe.transfers.create({
      amount: 5 * 100,
      currency: "eur",
      destination: "acct_1PNun0GdZpO2byQu",
    });

    const payouts = await stripe.payouts.create(
      {
        amount: 5 * 100,
        currency: "eur",
        //method: "instant",
        destination: "ba_1PNun1GdZpO2byQuR0sML48a",
      },
      {
        stripeAccount: "acct_1PNun0GdZpO2byQu",
      }
    );

    console.log("payouts", payouts);
    res.status(200).send({
      message: "Transfer and payout created successfully",
      transfer,
      payouts,
    });
  } catch (error) {
    console.log({ error: error });
    res.status(200).send({ message: error });
  }
});

app.listen(port, () => {
  console.log("Application listening on port:", port);
});
