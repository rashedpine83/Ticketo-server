const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const database = client.db("ticketoDb");
    const organizationsCollection = database.collection("organizations");
    const eventsCollection = database.collection("events");
    const bookingsCollection = database.collection("bookings");
    const paymentsCollection = database.collection("payments");

    app.get("/api/organizations/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await organizationsCollection.findOne({
          organizerEmail: email,
        });

        res.json(result || null);
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });

    app.post("/api/organizations", async (req, res) => {
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;
      const addData = {
        organizationName: organizationName,
        logo: logo,
        website: website,
        description: description,
        organizerEmail: organizerEmail,
        createdAt: new Date(),
        status: "active",
      };
      const result = await organizationsCollection.insertOne(addData);
      res.send(result);
    });

    app.patch("/api/organizations/:id", async (req, res) => {
      const { id } = req.params;
      const { organizationName, logo, website, description, organizerEmail } =
        req.body;
      const updateData = {
        organizationName: organizationName,
        logo: logo,
        website: website,
        description: description,
        organizerEmail: organizerEmail,
        createdAt: new Date(),
        status: "active",
      };
      const result = await organizationsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
          },
        },
      );
      res.send(result);
    });

    app.get("/api/events/:email", async (req, res) => {
      try {
        const { email } = req.params;

        const result = await eventsCollection
          .find({
            organizationEmail: email,
          })
          .toArray();

        res.json(result || null);
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    });

    app.post("/api/events", async (req, res) => {
      const data = req.body;

      const result = await eventsCollection.insertOne({
        ...data,
        createdAt: new Date(),
      });
      res.send(result);
    });

    app.patch("/api/events/:id", async (req, res) => {
      const { id } = req.params;

      const updateData = req.body;
      const result = await eventsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            ...updateData,
          },
        },
      );
      res.send(result);
    });

    app.delete("/api/events/:id", async (req, res) => {
      const { id } = req.params;
      const result = await eventsCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
