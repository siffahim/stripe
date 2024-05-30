const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
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
    currency: "usd",
    payment_method_types: ["card"],
  });

  res.status(200).send({ clientSecret: paymentIntent.client_secret });
});
//
//create account
app.post("/create-account", upload.array("KYC", 2), async (req, res) => {
  try {
    // Parse request body
    let bodyData;
    try {
      bodyData = JSON.parse(req.body.data);
    } catch (jsonError) {
      return res
        .status(400)
        .send({ error: "Invalid JSON data in request body." });
    }

    const {
      address,
      bankInfo,
      fullName,
      company_address,
      business_profile,
      dateOfBirth,
      phoneNumber,
      userId,
      jobTitle, // Extract job title
    } = bodyData;

    // Process uploaded files
    const files = req.files;
    if (!files || files.length < 2) {
      return res.status(400).send({ error: "Two KYC files are required." });
    }

    console.log("Uploaded files:", files);

    const dob = new Date(dateOfBirth || "1990-02-02");

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
            day: dob.getDate(),
            month: dob.getMonth() + 1,
            year: dob.getFullYear(),
          },
          email: "siffahim25@gmail.com",
          first_name: fullName || "Fahim",
          last_name: "Smith",
          id_number: userId || "000000000", //ensure must be character 9 digit
          phone: phoneNumber || "+8500414111",
          address: {
            city: address.city,
            country: address.country || "CA", // Ensure country is set to 'CA'
            line1: address.line1,
            postal_code: address.postalCode, // Ensure postal code is valid
            state: address.state,
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
      country: address.country || "CA", // Ensure country is correct
      currency: bankInfo.currency || "cad",
      account_holder_name: bankInfo.account_holder_name,
      account_holder_type: bankInfo.account_holder_type,
      account_number: bankInfo.account_number,
      routing_number: bankInfo.routing_number, // Ensure routing number is provided
    };

    // Create Stripe account
    const account = await stripe.accounts.create({
      country: address.country || "CA",
      type: "custom",
      account_token: token.id,
      email: "siffahim25@gmail.com",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        mcc: "7512",
        name: business_profile?.name || "My Business",
        product_description:
          business_profile?.product_description || "Your business description",
        url: business_profile?.url || "www.xyz.com",
        support_address: {
          city:
            business_profile?.support_address?.city || address.city || "N/A",
          country:
            business_profile?.support_address?.countryShortForm ||
            address.country ||
            "CA",
          line1:
            business_profile?.support_address?.line1 || address.line1 || "N/A",
          line2:
            business_profile?.support_address?.line2 || address.line2 || "",
          postal_code:
            business_profile?.support_address?.postal_code ||
            address.postalCode ||
            "00000",
          state:
            business_profile?.support_address?.state || address.state || "N/A",
        },
      },
      external_account: external_account,
    });

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
    const transfer = await stripeService.transfers.create({
      amount: 10 * 100, // count cents -- $4 = 400 cents
      currency: "usd", //Mx er somoy mxn hobe
      //@ts-ignore
      destination: "acct_1PM0mD2cp3B7JUAM", //stripeConnectAccountID
      //@ts-ignore
      transfer_group: createPayment[0]._id.toString(),
    });

    res.status(200).send("transfer ", transfer);
  } catch (error) {
    res.status(200).send(error);
  }
});

/* app.post("/transfer", upload.array("image", 2), async (req, res) => {
  try {
    const bodyData = JSON.parse(req.body.data);
    const {
      address,
      bankInfo,
      fullName,
      company_address,
      business_profile,
      dateOfBirth,
      phoneNumber,
      userId,
    } = bodyData;
    const transfer = await stripeService.transfers.create({
      amount: amount * 100, // count cents -- $4 = 400 cents
      currency: "usd", //Mx er somoy mxn hobe
      //@ts-ignore
      destination: shop?.userId?.stripeAccount?.accountNo,, //stripeConnectAccountID
      //@ts-ignore
      transfer_group: createPayment[0]._id.toString(),
    });
  } catch (error) {
    res.status(200).send(error);
  }
});
 */
app.listen(port, () => {
  console.log("Application listening on port:", port);
});
