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
    const usersCollection = database.collection("user");
    const bookingCollection = database.collection("bookings");
    const paymentCollection = database.collection("payments");

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

    //===========EVENT RELATED API====================

    app.get("/api/events", async (req, res) => {
      const search = req.query.search;
      const category = req.query.category;
      const location = req.query.location;
      const query = {}; // {title: "mern"}
      if (search) {
        query.title = {
          $regex: search,
          $options: "i", // upper lower matter korbe na
        };
      }
      if (category) {
        // query.category = category;
        // ?category=Music,Tech,Digial
        // console.log(category, category.split(',')); ["Music", "Tech", "Digital"]

        query.category = { $in: category.split(",") };
      }
      if (location) {
        query.location = location;
      }

      const cursor = eventsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/api/single-events/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await eventsCollection.findOne(query);
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

    app.get("/api/events/booking/:email", async (req, res) => {
      const { email } = req.params;
      const query = { attendeeEmail: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    // payment Api

    app.post("/api/events/booking", async (req, res) => {
      const {
        amount,
        evetId,
        eventTitle,
        quantity,
        email,
        paymentType,
        transactionId,
        paymentStatus,
      } = req.body;
      // console.log(req.body);
      const bookingData = {
        evetId,
        eventTitle,
        attendeeEmail: email,
        quantity,
        amount,
        transactionId,
        paymentStatus,
        bookingDate: new Date(),
      };
      const isBookingExist = await bookingCollection.findOne({
        transactionId,
      });
      if (isBookingExist) {
        return res.status(200).send({ message: "Already paid" });
      }
      const bookingRes = await bookingCollection.insertOne(bookingData);

      await eventsCollection.updateOne(
        { _id: new ObjectId(evetId) },
        {
          $inc: {
            capacity: -quantity,
          },
        },
      );
      const paymentData = {
        userEmail: email,
        amount,
        transactionId,
        paymentStatus,
        paymentType,
        paidAt: new Date(),
      };

      await paymentCollection.insertOne(paymentData);
      res.send(bookingRes);
    });

    app.post("/api/events", async (req, res) => {
      const data = req.body;
      const organizer = await usersCollection.findOne({
        email: data?.organizationEmail,
      });
      const organizerEventsCounts = await eventsCollection.countDocuments({
        organizationEmail: data?.organizationEmail,
      });

      if (!organizer?.isPremium && organizerEventsCounts >= 3) {
        return res.status(401).send({
          message: "Your free limit is over",
        });
      }
      const result = await eventsCollection.insertOne({
        ...data,
        status: "pending",
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

    app.patch("/api/users/upgrade-premium/:email", async (req, res) => {
      const { email } = req.params;
      const { amount, transactionId, paymentStatus, paymentType } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        {
          $set: {
            isPremium: true,
          },
        },
      );
      const paymentData = {
        userEmail: email,
        amount,
        transactionId,
        paymentStatus,
        paymentType,
        paidAt: new Date(),
      };

      await paymentCollection.insertOne(paymentData);

      res.send(result);
    });

    app.get("/api/payment/:email", async (req, res) => {
      const { email } = req.params;
      const query = { userEmail: email };
      const result = await paymentCollection.find(query).toArray();
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
