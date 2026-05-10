import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { FundRequest } from '../models/FundRequest.js'
import { User } from '../models/User.js'
import { sendPushToUsernames } from '../services/pushService.js'

const fundRoutes = Router()

fundRoutes.use(requireAuth)
fundRoutes.use((request, response, next) => {
  if (request.user.role !== 'contestant') {
    return response.status(403).json({
      message: 'Contestant access is required for this resource.',
    })
  }

  return next()
})

fundRoutes.get('/', async (request, response, next) => {
  try {
    const requests = await FundRequest.find({ user: request.user._id })
      .sort({ createdAt: -1 })
      .populate('user')

    return response.json({
      requests: requests.map((fundRequest) => FundRequest.toClient(fundRequest)),
    })
  } catch (error) {
    return next(error)
  }
})

fundRoutes.post('/', async (request, response, next) => {
  try {
    const amount = Number(request.body.amount)

    if (!Number.isInteger(amount) || amount < 1) {
      return response.status(400).json({ message: 'Please provide a valid euro amount.' })
    }

    const paidRequests = await FundRequest.find({
      user: request.user._id,
      status: 'paid',
    }).select('amount')

    const spent = paidRequests.reduce((sum, fundRequest) => sum + fundRequest.amount, 0)
    const remaining = 100 - spent

    if (amount > remaining) {
      return response.status(400).json({
        message: `You only have €${remaining} remaining.`,
      })
    }

    const fundRequest = await FundRequest.create({
      user: request.user._id,
      amount,
    })

    await fundRequest.populate('user')

    try {
      const judges = await User.find({ role: 'judge' }).select('username').lean()
      const judgeUsernames = judges.map((judge) => judge.username)

      if (judgeUsernames.length > 0) {
        await sendPushToUsernames(judgeUsernames, {
          title: 'New funds request',
          body: `${request.user.displayName} requested €${amount}.`,
        })
      }
    } catch (pushError) {
      console.error('Failed to send judge push notification for fund request.', pushError)
    }

    return response.status(201).json({
      request: FundRequest.toClient(fundRequest),
    })
  } catch (error) {
    return next(error)
  }
})

export default fundRoutes