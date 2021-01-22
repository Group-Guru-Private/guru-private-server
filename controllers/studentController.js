const {generateToken} = require('../helpers/jwtHelper') 
const {generatePassword,verifyPassword} = require('../helpers/passwordHelper')
const {Student} =  require('../models')
const bcrypt = require('bcryptjs')

class StudentController {

  static async register (req,res,next){
    // console.log(req.body)
    const { name, email, password, role, address, position, telpon_number } = req.body
    Student.create({name, email, password, role, address, position, telpon_number})
      .then (data=>{
        // console.log(data)
        res.status(201).json({name: data.name, email: data.email})
      })
      .catch (err=>{
        if(err){
          if (err.name === 'SequelizeValidationError') {
            let arrErrors = []
            for (let i = 0; i < err.errors.length; i++) {
                arrErrors.push( err.errors[i].message)
            }
          res.status(400).json({message: `${arrErrors}`} )
         
          }
          else if (err.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({message: err.message } )
            
          }
          else (
            new Error(err.message)
          )
        }
        else {
          res.status(500).json(err.message)
        }
      })
  }
  static login(req,res,next){
    const email = req.body.email
    const password = req.body.password
    if (!password){
      return  res.status(404).json({message: 'Please input your Password'})
    }
    if (!email){
      return  res.status(404).json({message: 'Please input your Email'})
    }
    Student.findOne({where:{email:email}})
      .then(data=>{
        // console.log(data)
        if(!data){
          res.status(401).json({message: `Account Not Found`})
        }
       else if (verifyPassword(password, data.password )){
          const access_token = generateToken({id: data.id,email: data.email})
          // console.log(access_token)
          res.status(200).json({ access_token })
       }
        else if (!verifyPassword(password, data.password)){
          res.status(404).json({message: 'Invalid Email/Password'})
          }
      })
      .catch (err=>{
        // console.log(err)
        next(err)
      })
  }

  static showAll(req,res,next) {

    Student.findAll({})
    .then((data)=>{
      res.status(200).json({alldata: data})
    })
    .catch((error)=>{
      // console.log(error)
      next(error)
    }) 
      

  }
  static getStudentbyId (req,res,next){
    const id = +req.params.id
 
       Student.findOne({ where: {id:id} })
        .then((data)=>{
          
          res.status(200).json({name: data.name, email: data.email, address: data.address, phone: data.telpon_number})
        })
        .catch((error)=>{
          console.log(error)
          next(error)
        }) 
          
        
  }

  static update(req,res,next){

    const password = generatePassword(req.body.password)


    const editStudent = {
      name : req.body.name,
      email: req.body.email,
      password: password,
      role: req.body.role,
      address: req.body.address,
      position: req.body.position,
      telpon_number: req.body.telpon_number,
    }
     
     const data = Student.update(editStudent, {where: {id: req.params.id},returning: true})
        .then(() => {
            res.status(200).json({message: 'Your profile Updated'})
        })
         .catch (err=>{
        if(err){
          if (err.name === 'SequelizeValidationError') {
            let arrErrors = []
            for (let i = 0; i < err.errors.length; i++) {
                arrErrors.push( err.errors[i].message)
            }
          res.status(400).json({message: `${arrErrors}`} )
         
          }
          else if (err.name === 'SequelizeUniqueConstraintError') {
            res.status(400).json({message: err.message } )
            
          }
          else (
            new Error(err.message)
          )
        }
        else {
          res.status(500).json(err.message)
        }
      })
  }


}

module.exports = StudentController