const express = require('express');
const app = express();
const fs = require('fs');
const formidable = require('formidable');
const DB = new (require('../db.js'))();
const ObjectId = require('mongodb').ObjectID;


app.get('/create', (req,res) => {
    res.render('restaurant_create');
})

app.post('/create', (req,res) => {
    const form = new formidable.IncomingForm();
    let userid = req.session.userid;

    form.parse(req, (err, fields, files) => {
        let restaurantObj = {
            restaurant_id : new ObjectId(),
            name : fields['name'],
            borough : fields['borough'],
            cuisine : fields['cuisine'],
            photo : null,
            mimetype : files.restaurant_photo.type, 
            address : {
                street : fields['street'],
                building : fields['building'],
                zipcode: fields['zipcode'],
                coord : {
                    latitude: fields['lat'],
                    longitude: fields['lon'],
                },
            },
            owner : userid 
        }

        fs.readFile(files.restaurant_photo.path, (err, data) => {
            if (!err) {
                if(data != ""){
                    restaurantObj.photo = new Buffer(data).toString("base64");
                }
                
                DB.createRestaurant(restaurantObj, (err, response) => {
                    if(err){
                        console.log("ERR!", err);
                    }else{
                        if(response){
                            console.log("Create restaurant success");
                            res.redirect(`/restaurant/show?_id=${restaurantObj.restaurant_id}`);
                        }else{
                            console.log("Create restaurant failed", err);
                            res.redirect(`/restaurant/create`);
                        }
                    }
                })
            }else {
                console.log("/Create/restaurant: read photo failed");
            }
        })
    })
})

app.get('/show', (req,res) => {
    let restaurantObjectId = req.query._id;
    
    DB.getRestaurant(restaurantObjectId, (err, response) => {
        if(err){
            console.log("ERR!", err);
        }else{
            if(response){
                console.log("Show success");
                res.render('restaurant_show', {restaurant : response});
            }else{
                console.log("Show failed", response);
            }
        }
    })

})

app.get('/edit', (req,res) => {
    let userid = req.session.userid;
    let restaurantObjectId = req.query._id;
     
    DB.getRestaurant(restaurantObjectId, (err, response) => {
        if(err){
            console.log("ERR!", err);
        }else{
            if(response){
                console.log("Edit form show success", response);

                // checking autority
                if(userid != response.owner){
                    res.render('err_page', {
                        errTitle: "Autority not match.", 
                        errMsg: "You are not the owner, not allow to update."
                    });
                }else{
                    res.render('restaurant_edit', {restaurant : response});
                }
            }else{
                console.log("Edit form show failed", response);
            }
        }
    })
})

app.post('/edit', (req,res) => {
    const form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        let restaurantObjectId = req.query._id;
        let restaurantUpdate = { 
            $set: {
                name: fields['name'],
                borough : fields['borough'],
                cuisine : fields['cuisine'],
                address : {
                    street : fields['street'],
                    building : fields['building'],
                    zipcode: fields['zipcode'],
                    coord : {
                        latitude: fields['lat'],
                        longitude: fields['lon'],
                    },
                }
            }
        }
        console.log("restaurantObjectId", restaurantObjectId);
        console.log("restaurantUpdate", restaurantUpdate);
        
        DB.editRestaurant(restaurantObjectId, restaurantUpdate, (err, response) => {
            if(err){
                console.log("ERR!", err);
            }else{
                if(response){
                    console.log("Edit restaurant success");
                    res.redirect(`/restaurant/show?_id=${restaurantObjectId}`);
                }else{
                    console.log("Edit restaurant failed", err);
                    res.redirect(`/restaurant/edit`);
                }
            }
        })
    })
})
    
app.get('/map', (req, res) => {
    let location = {
        latitude: req.query.lat,
        longitude: req.query.lon
    }
    res.render('restaurant_map', {location: location}); 
});

app.get('/delete', (req, res) => {
    let restaurantObjectId = req.query._id;
    let deleteOwner = req.query.owner;
    let userid = req.session.userid;

    if(userid != deleteOwner){
        res.render('err_page', {
            errTitle: "Autority not match.", 
            errMsg: "You are not the owner, not allow to update."
        });
    }else{
        DB.deleteRestaurant(restaurantObjectId, (err, response) => {
            if(err){
                console.log("ERR!", err);
            }else{
                if(response){                
                    console.log("Delete success");
                    res.render(`delsuccess`);
                }else{
                    console.log("Delete failed", err);
                    res.redirect(`/restaurant/show`);
                }
            }
        })
    }
})

app.get('/rate', (req, res) => {
    let restaurant_id = req.query._id;
    res.render('restaurant_rate', {restaurant_id});
})

app.post('/rate', (req, res) => {
    let userid = req.session.userid;
    let restaurant_id = req.query._id;

    let form = new formidable.IncomingForm();

    form.parse(req, (err, fields, files) => {
        let restaurantUpdate = {
            $push: {
                grades: {
                    user: userid,
                    score: fields['score']
                }
            }
        }

        DB.updateRestaurant(restaurant_id, restaurantUpdate, (err, response) => {
            if(err){
                console.log("ERR!")
            }else{
                if(response){
                    console.log("Rate success!")
                    res.redirect(`/restaurant/show?_id=${restaurant_id}`)
                }else{
                    console.log("Rate failed")
                    res.redirect('/err_page', {
                        errTitle: "Rate error.",
                        errMsg: "Rating restaurant is failed."
                    })
                }
            }
        })
    });
})
module.exports = app;