const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;
//FIREBASE INIT
var admin = require("firebase-admin");

var serviceAccount = require('./ema-john-b1bad-firebase-adminsdk-68qnu-9d59b78249.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
//middlewares
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.urbpc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

//AUTHENCATION 
const verifyToken = async (req, res, next) => {
    if (req.headers?.key?.startsWith('Bearer ')) {
        const idToken = req.headers.key.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch { }
    }
    next();
}
const run = async () => {
    try {
        await client.connect();
        const database = client.db('ema-zohn');
        const productsCollection = database.collection('products');
        const orderCollection = database.collection('order');

        //GET ALL PRODUCTS
        app.get('/products', async (req, res) => {
            const page = req.query.page;
            const size = parseInt(req.query.size);
            const cursor = productsCollection.find({});
            const count = await cursor.count();
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }
            res.send({
                count,
                products
            });
        })
        //POST API BY KEYS
        app.post('/products/bykeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const result = await productsCollection.find(query).toArray();
            res.json(result)
        })
        //ADD ORDERS API
        app.post('/orders', async (req, res) => {
            const orderData = req.body;
            const result = await orderCollection.insertOne(orderData);
            res.json(result);
        })
        //GET ORDERS 
        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            if (req.decodedUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query).toArray();
                const orders = await cursor;
                res.json(orders);
            }
            else {
                res.status(401).json({ message: 'user not authorized' })
            }

        })

    }
    finally {
        // client.close();
    }
}
run().catch(console.dir)
app.get('/', (req, res) => {
    res.send('Ema zohn server is running');
})
app.listen(port, () => {
    console.log('Ema zohn server is running at port: ', port)
})