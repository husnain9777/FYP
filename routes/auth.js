const express = require('express');
const router = express.Router();
const { User, validate } = require('../models/User');
const { Auth } = require('../models/Auth');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/* Log in */
router.post('/login', async (req, res, next) => {
	const { username, password } = req.body;

	const auth = await Auth.findOne({ username });
	if(!auth) return res.status(404).send("Invalid username or password.");
	
	const validPassword = await bcrypt.compare(password, auth.password);
	if(!validPassword) return res.status(400).send('Invalid username or password.');

	const user = await User.findById(auth.user_id);
	if(!user) return res.status(404).send("The user data is missing");
	const data = { user, username }

	const token = jwt.sign({ data }, 'jwtPrivateKey');
	return res.header('x-auth-token', token).send(data);
});

/* Sign up  */
router.post('/signup', async (req, res, next) => {
	const { error } = validate(req.body);
	console.log('1')  
	if (error) return res.status(403).send(error.details[0]);
	console.log('2')
	try {
		console.log('3')
		const { firstName, lastName, phone, email, username, password } = req.body;
		let hashedPassword;

		let userEmail = await User.findOne({ email });
		if (userEmail) return res.status(409).send("This email already exists");

		let userPhone = await User.findOne({ phone });
		if (userPhone) return res.status(409).send("This phone number already exists");

		let auth = await Auth.findOne({ username });
		if (auth) return res.status(409).send("This username already exists");
	
		const salt = await bcrypt.genSalt(10);
		hashedPassword = await bcrypt.hash(password, salt);

		if (!hashedPassword) return res.status(400).send("Could not hash the password");
    
		user = new User({ name: { firstName, lastName }, email, phone});
		await user.save();

		auth = new Auth({ username, password: hashedPassword, user_id: user._id });
		await auth.save();

		let data = { user, username };
		 
		const token = jwt.sign({ data }, 'jwtPrivateKey');
		res.status(200).header('x-auth-token', token).send(data);
	} catch (e) {
		return res.status(400).send(e);
	}
});

// router.post('/resetusername', async (req, res, next) => {
// 	const { _id ,username } = req.body;

// 	try{
// 		let auth = await Auth.findOne({ username });
// 		if(auth) return res.status(409).send("This name already exists");
		
// 		auth = await Auth.findByIdAndUpdate( _id, { username }, { new: true });

// 		return res.status(200).send("The username was updated")

// 	}catch(e){

// 	}
// });

// router.post('/resetpassword',  async (req, res, next) => {
// 	const { username, password } = req.body;
// 	let hashedPassword;
// 	console.log(req.body);

// 	try{
// 		let auth = await Auth.findOne({ username });
// 		if(!auth) return res.status(404).send("Invalid username");;
	
// 		const salt = await bcrypt.genSalt(10);
// 		hashedPassword = await bcrypt.hash(password, salt);
// 		if (!hashedPassword) return res.status(400).send("Could not hash the password");
		
// 		auth = await Auth.findByIdAndUpdate(auth._id, { password: hashedPassword } , { new: true });
// 		return res.status(200).send("Password successfully updated");
// 	} catch(e){
// 		return res.status(403).send("Something went wrong");
// 	}
	
// });



// router.post('/getUsername', async (req, res, next) => {
// 	const { user_id } = req.body;

// 	const auth = await Auth.findOne({ user_id });
// 	if(!auth) return res.status(404).send("Invalid username");

// 	return res.send(auth.username);
// });


module.exports = router; 