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

const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "invalid token" });
    }
    req.decoded = decoded;
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

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "24h",
      });
      res.send({ token });
    });

    // Users related apis
    // Creating users api to get all users
    app.get("/users", async (req, res) => {
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

    // Get menu data from the database and send it to the client
    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
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
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      } else {
        const query = { email: email };
        const result = await cartCollection.find(query).toArray();
        res.send(result);
      }
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
