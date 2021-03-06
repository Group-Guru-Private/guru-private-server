const {Student, Teacher, Order} = require('../models')
const midtransClient = require('midtrans-client')
const axios = require('axios')

class OrderController {
  static async createOrder (req, res, next) {   //disini minta req.body.date = '2021-01-26'
    try {
      const findTeacher = await Teacher.findByPk(req.params.id)
      if (findTeacher) {
        const findOrder = await Order.findAll({ where: {TeacherId: findTeacher.id} })
        const filterOrder = findOrder.filter(order => order.date == req.body.date)
        if (findOrder && filterOrder.length) {
          throw {status: 400, message: `Date has been ordered. Please choose other date !!!`}
        } else {
          const payload = {
            StudentId : req.loginStudent.id,
            TeacherId : findTeacher.id,
            subject : req.body.subject,
            distance : parseFloat(req.body.distance),
            total_price: +req.body.total_price,
            // total_price : (+req.body.distance * 5000) + findTeacher.price,
            date: req.body.date,
          }
          const data = await Order.create(payload)
          res.status(201).json(data)
        }
      } else throw {
        status: 404,
        message: `Data Not Found`
      }
    } catch (err) {
      if (err.name === 'SequelizeValidationError') {
        next({
          name: 'Validation Error',
          status: 400,
          message: err.errors
        })
      }else next(err)
    }
  }
  static async findAllOrder (req, res, next) {
    try {
      const data = await Order.findAll({ include: [Student, Teacher] })
      res.status(200).json(data)
    } catch (err) {
      next (err)
    }
  }

  static async getDetail (req, res, next) {
    try {
      const data = await Order.findByPk(req.params.id, {include: [Student, Teacher]})
      if (data) res.status(200).json(data)
      else throw {
        status: 404,
        message: 'Data Not Found'
      }
    } catch (err) {
      next(err)  
    }
  }

  static async finishedOrder (req, res, next) {
    try {
      const findOrder = await Order.findByPk(req.params.id, {include: [Student, Teacher]})
      if (findOrder) {
        const arrPromises = [
          Order.update({ status: true}, { where: {id: req.params.id}, returning: true, include: [Student, Teacher], validate: false}),
          Teacher.update({ income: findOrder.Teacher.income + findOrder.total_price }, {where: {id: findOrder.TeacherId}, validate: false})
        ]
        const finished = await Promise.all(arrPromises)
        let paramater = {
          transaction_details: {
            order_id: 'order-private-' + findOrder.Teacher.name + Math.ceil(Math.random() * 10000),
            gross_amount: findOrder.total_price
          },
          enabled_payments: ['gopay', 'credit_card', 'shopeepay'],
          credit_card: {
            secure: true
          },
          customer_details: {
            first_name: findOrder.Student.name,
            email: findOrder.Student.email,
            phone: findOrder.Student.telpon_number,
            shipping_address: {
              address: findOrder.Student.address
            }
          }
        }
        // const transaction = await axios({
        //   method: 'POST',
        //   url: 'https://app.sandbox.midtrans.com/snap/v1/transactions',
        //   data: paramater,
        //   headers: {
        //     'Accept': 'application/json',
        //     'Content-Type': 'application/json',
        //     'Authorization': 'Basic U0ItTWlkLXNlcnZlci1NM3BGTkFPWWN3NzNmUHdGcEFPamdtV0k6'
        //   }
        // })
        // console.log(transaction.data.token)
        let snap = new midtransClient.Snap({
          isProduction: false,
          serverKey: 'SB-Mid-server-M3pFNAOYcw73fPwFpAOjgmWI',
          clientKey: 'SB-Mid-client-tuHFsrsxohwXDvQ4'
        })
        let transaction = await snap.createTransactionToken(paramater)
        if (finished && finished.length) res.status(200).json({finishOrder: finished[0][1][0], token : transaction })
      }
    } catch (err) {
      next (err)
    }
  }
  static async cancelOrder (req, res, next) {
    try {
      const data = await Order.destroy({ where: {id: req.params.id }})
      res.status(200).json({ message: `Successfully deleted this order !!!` })
    } catch (err) {
      next (err)
    }
  }

  static async inputRating (req, res, next) {
    try {
      const id = +req.params.id
      const findOrder = await Order.findByPk(id)
      const newRate = +req.body.rating
      if (findOrder) {
        if (findOrder.status) {
          const changeRate = await Order.update({ rating: newRate }, { where: {id}, returning: true } )
          const idTeacher = findOrder.TeacherId
          const findTeacherOrders = await Order.findAll({ where: { TeacherId: idTeacher }})
          if (findTeacherOrders.length && changeRate) {
            const filterRating = findTeacherOrders.filter(rate => rate.rating)
            if (filterRating.length) {
              let sumRate = 0
              filterRating.forEach(order => {
                sumRate += order.rating
              })
              const avgRate = parseFloat(sumRate / filterRating.length)
              const updateRateTeacher = await Teacher.update({ rating: avgRate }, {where: {id: idTeacher}, returning: true })
              if (changeRate && updateRateTeacher) {
                res.status(200).json({Order: changeRate[1][0], Teacher: updateRateTeacher[1][0] })
              }
            }
          } 
        } else throw {status: 400, message: `Harap melakukan pembayaran terlebih dahulu`}
      }
    } catch (err) {
      next(err)
    }
  }
}

module.exports = OrderController