const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

// Jwt verification middleware
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "Unauthorized access" });
  }

  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .send({ error: true, message: "Invalid or expired token" });
    }
    req.decoded = decoded; // Attach decoded token to request
    next();
  });
};

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@gearnest1.e6dgi.mongodb.net/?retryWrites=true&w=majority&appName=GearNest1`;

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Get the collection
    const usersCollection = client.db("bistroDb").collection("users");
    const menuCollection = client.db("bistroDb").collection("menu");
    const reviewCollection = client.db("bistroDb").collection("reviews");
    const cartCollection = client.db("bistroDb").collection("carts");

    // use verifyAdmin after verifyJwt is called
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ admin: false, message: "Unauthorized access" });
      }
      next();
    };

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "48h",
      });
      res.send({ token });
    });

    // Users related apis
    // Creating users api to get all users
    app.get("/users", verifyJwt, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Insert a new user in mongo database
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("Existing User: ", existingUser);
      if (existingUser) {
        return res.send({ message: "User already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // security layer: verifyjwt
    // email name
    // check admin
    app.get("/users/admin/:email", verifyJwt, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        return res
          .status(403)
          .send({ admin: false, message: "Forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    // Making an admin from all users panel in admin dashboard
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }; // ObjectId is now defined
      const updatedUser = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updatedUser);
      res.send(result);
    });

    // Menu related apis
    // Get menu data from the database and send it to the client
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    // menu additems from admin
    app.post("/menu", verifyJwt, verifyAdmin, async (req, res) => {
      const newItem = req.body;
      result = await menuCollection.insertOne(newItem);
      res.send(result);
    });

    // delete  specific item from menu
    app.delete("/menu/:id", verifyJwt, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = { _id: new ObjectId(id) }; // ObjectId is now defined
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    // Get reviews data from the database and send it to the client
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // Cart apis
    // Cart collection data posted to the server
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartCollection.insertOne(item);
      res.send(result);
    });

    // Get specific cart items based on the email of user
    app.get("/carts", verifyJwt, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res
          .status(400)
          .send({ error: true, message: "Email is required" });
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    // Delete specific cart items based on the user id
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }; // ObjectId is now defined
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

app.listen(port, () => {
  console.log(`bistro is running on ${port}`);
});
