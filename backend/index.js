const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { UsersClient } = require("@sanity/client");

app.use(express.json());
app.use(cors());

// Database connection mongodb
mongoose.connect("mongodb+srv://dubeyjahanvi04:3JlFplnFZXe8JTfx@cluster0.eqqcxrp.mongodb.net/Shopper", { useNewUrlParser: true, useUnifiedTopology: true });

// API creation
app.get("/", (req, res) => {
    res.send("Express App is Running");
});

// Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

// Schema creation for user model
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
        default: {},
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('User', UserSchema);

// Creating endpoint for registering the users
app.post('/signup', async (req, res) => {
    try {
        let check = await User.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({ success: false, errors: "Existing user found with same email address" });
        }

        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        const user = new User({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save();

        const data = {
            user: {
                id: user.id
            }
        };

        const token = jwt.sign(data, 'secret_ecom');
        res.json({ success: true, token });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error signing up user" });
    }
});

// Creating endpoint for user login
app.post('/login', async (req, res) => {
    try {
        let user = await User.findOne({ email: req.body.email });
        if (user) {
            const passCompare = req.body.password === user.password;
            if (passCompare) {
                const data = {
                    user: {
                        id: user.id
                    }
                };
                const token = jwt.sign(data, 'secret_ecom');
                res.json({ success: true, token });
            } else {
                res.status(400).json({ success: false, errors: "Wrong password" });
            }
        } else {
            res.status(400).json({ success: false, errors: "Wrong email ID" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error logging in user" });
    }
});

const upload = multer({ storage: storage });

// Creating upload endpoint for images
app.use('/images', express.static('upload/images'));

app.post("/upload", upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema for creating products
const ProductSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    },
});

const Product = mongoose.model("Product", ProductSchema);

// Endpoint for adding a product
app.post('/addproduct', async (req, res) => {
    try {
        let products = await Product.find({});
        let id = products.length > 0 ? products[products.length - 1].id + 1 : 1;

        const product = new Product({
            id: id,
            name: req.body.name,
            image: req.body.image,
            category: req.body.category,
            new_price: req.body.new_price,
            old_price: req.body.old_price,
        });

        await product.save();
        res.json({
            success: true,
            name: req.body.name,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error adding product" });
    }
});

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.body.id });
        res.json({
            success: true,
            id: req.body.id
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error removing product" });
    }
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    try {
        let products = await Product.find({});
        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error fetching products" });
    }
});
// creating endpoint for new collection data
app.get('/newcollection',async(req,res) =>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-8);
    console.log("NewCollection Fetched");
    res.send(newcollection);
})

app.get('/popularinwomen', async (req, res) => {
    try {
        let products = await Product.find({ category: "women" });
        let popular_in_women = products.slice(0, 4);
        console.log("Popular in Women fetched");
        res.send(popular_in_women);
    } catch (error) {
        console.error("Error fetching popular in women:", error);
        res.status(500).send("An error occurred while fetching popular products in women category");
    }
});
// creating middleware tp fetch user
const fetchUser = async (req,res,next) =>{
    const token = req.header('auth-token');
    if (!token) {
        res.status(401).send({errors:"please authinticate using valid token"})  
    }
    else{
        try {
            const data = jwt.verify(token,'secret_ecom');
             req.user = data.user;
             next();
            
        } catch (error) {
            res.status(401).send({errors:"please authinticate using valid token"})  
        }
    }
}

app.post('/addtocart',fetchUser, async(req,res) =>{
    
    console.log("added",req.body.itemId);
    let userData = await User.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send('Added')
})

// to remove from cart
app.post('/removefromcart',fetchUser, async(req,res) =>{
  
    console.log("removed",req.body.itemId);
    let userData = await User.findOne({_id:req.user.id});
    if( userData.cartData[req.body.itemId]>0);
    userData.cartData[req.body.itemId] -= 1;
    await User.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send('Removed') 
})

app.post('/getcart',fetchUser, async(req,res) =>{
  
    console.log("GetCart",req.body.itemId);
    let userData = await User.findOne({_id:req.user.id});
    res.json(userData.cartData);
})
app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running On Port " + port);
    } else {
        console.log("Error: " + error);
    }
});
