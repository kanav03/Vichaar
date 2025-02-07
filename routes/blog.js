const AWS = require('aws-sdk');
const { Router } = require("express");
const multer = require('multer');
const path = require('path');

const Blog = require("../models/blog");
const Comment = require("../models/comment");

const router = Router();

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'ap-south-1'
});

const s3 = new AWS.S3();


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve(`./public/uploads/`))
    },
    filename: function (req, file, cb) {
        const filename = `${Date.now()}-${file.originalname}`;
        cb(null, filename);
    }
});

const upload = multer({ storage: multer.memoryStorage() });

router.get('/add-new', (req, res) => {
    return res.render('add-Blog', {
        user: req.user,
    });
});

router.get('/:id',async(req,res)=>{
    const blog = await Blog.findById(req.params.id).populate('createdBy');
    const comments =await Comment.find({blogId: req.params.id}).populate('createdBy')
    // console.log("comments",comments);
    return res.render('blog',{
        user:req.user,
        blog,
        comments,
    });
});

router.post('/', upload.single('coverImage'), async (req, res) => {
    const { title, body } = req.body;

    // Define the upload parameters
    const uploadParams = {
        Bucket: 'vichaar', // your bucket name
        Key: 'uploads/' + Date.now() + '-' + req.file.originalname, // add 'uploads/' prefix to the file name
        Body: req.file.buffer // the file itself
    };

    // Upload the file to S3
    const result = await s3.upload(uploadParams).promise();

    // Create the blog with the S3 file URL
    const blog = await Blog.create({
        body,
        title,
        createdBy: req.user._id,
        coverImageURL: result.Location // use the S3 file URL
    });

    return res.redirect(`/blog/${blog._id}`);
});

router.post('/comment/:blogId',async(req,res)=>{
    await Comment.create({
        content: req.body.content,
        blogId: req.params.blogId,
        createdBy: req.user._id,
    });
    return res.redirect(`/blog/${req.params.blogId}`);
});

module.exports = router;